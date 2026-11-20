/**
 * Renderizador HTML5 <canvas> 2D de alta fidelidade (1080 × 1350 px — 4:5 Instagram).
 * Usa os templates base extraídos dos originais e desenha dinamicamente cada entrada
 * (barra lateral vermelha/branca, pílulas de escalão, divisória, jogos e resultados).
 */

import { CONFIG } from './config.js';

const TEMPLATE_URLS = {
  agenda: './assets/template-agenda-base.png',
  resultados: './assets/template-resultados-base.png',
  cardTexture: './assets/card-texture.png',
};

// Coordenadas exatas dos 4 cartões no espaço lógico 819 × 1024
const CARD_SLOTS = {
  agenda: [
    { x: 75.0, y: 320.5, w: 665.5, h: 125.5 },
    { x: 75.0, y: 449.0, w: 665.5, h: 125.5 },
    { x: 75.0, y: 577.5, w: 665.5, h: 125.5 },
    { x: 75.0, y: 706.0, w: 665.5, h: 125.5 },
  ],
  resultados: [
    { x: 75.0, y: 320.5, w: 665.5, h: 125.5 },
    { x: 75.0, y: 449.5, w: 665.5, h: 125.5 },
    { x: 75.0, y: 579.0, w: 665.5, h: 125.5 },
    { x: 75.0, y: 708.5, w: 665.5, h: 125.5 },
  ],
};

const COLORS = {
  barRed: '#FF0000',
  barWhite: '#FFFFFF',
  pillRed: '#FF0000',
  pillWhite: '#FFFFFF',
  pillTextOnRed: '#FFFFFF',
  pillTextOnWhite: '#E60B08',
  scoreRed: '#F2120A',
  white: '#FFFFFF',
  divider: '#EFEFEF',
  cardBorder: 'rgba(135, 135, 132, 0.92)',
};

const CARD_RADIUS = 14.5;
const ACCENT_BAR_WIDTH = 21.5;

// Família tipográfica principal (Antonio 600/700 — proporção condensada fiel aos originais)
const DEFAULT_FONT = '"Antonio", "Oswald", "Barlow Condensed", sans-serif';

const templateCache = new Map();

function loadImage(src) {
  if (templateCache.has(src)) return templateCache.get(src);
  const promise = new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Não foi possível carregar o template base: ${src}`));
    img.src = src;
  });
  templateCache.set(src, promise);
  return promise;
}

export async function preloadTemplates() {
  const fontLoads = document.fonts
    ? [
        document.fonts.load('700 48px "Antonio"'),
        document.fonts.load('600 24px "Antonio"'),
      ]
    : [];
  await Promise.all([
    loadImage(TEMPLATE_URLS.agenda),
    loadImage(TEMPLATE_URLS.resultados),
    loadImage(TEMPLATE_URLS.cardTexture),
    ...fontLoads,
  ]);
  if (document.fonts && document.fonts.ready) {
    await document.fonts.ready;
  }
}

/**
 * Divide os jogos em slides do carrossel, preenchendo sempre o máximo por slide (4).
 */
export function paginateGames(games, maxPerSlide = CONFIG.MAX_PER_SLIDE) {
  if (!games || games.length === 0) return [[]];
  const slides = [];
  for (let i = 0; i < games.length; i += maxPerSlide) {
    slides.push(games.slice(i, i + maxPerSlide));
  }
  return slides;
}

function drawRoundedRectPath(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

/**
 * Ajusta o tamanho da fonte para que o texto caiba dentro de maxWidth sem quebrar nem cortar.
 */
function fitFontSize(ctx, text, { weight = 700, maxSize, minSize = 11, maxWidth, fontFamily = DEFAULT_FONT }) {
  let size = maxSize;
  ctx.font = `${weight} ${size}px ${fontFamily}`;
  let width = ctx.measureText(text).width;
  if (width <= maxWidth) return size;
  size = Math.max(minSize, Math.floor((size * maxWidth) / width * 10) / 10);
  ctx.font = `${weight} ${size}px ${fontFamily}`;
  while (ctx.measureText(text).width > maxWidth && size > minSize) {
    size -= 0.5;
    ctx.font = `${weight} ${size}px ${fontFamily}`;
  }
  return size;
}

/**
 * Desenha a moldura ativa do cartão (fundo escuro texturado + barra lateral vermelha/branca + contorno fino).
 */
function drawActiveCardChrome(ctx, slot, isHome, cardTexture) {
  // Sombra subtil por trás do cartão para contraste limpo sobre zonas claras do fundo
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 2;
  drawRoundedRectPath(ctx, slot.x, slot.y, slot.w, slot.h, CARD_RADIUS);
  ctx.fillStyle = '#121210';
  ctx.fill();
  ctx.restore();

  // Interior texturado (grunge original) + barra lateral esquerda recortados nos cantos arredondados
  ctx.save();
  drawRoundedRectPath(ctx, slot.x, slot.y, slot.w, slot.h, CARD_RADIUS);
  ctx.clip();
  if (cardTexture) {
    ctx.drawImage(cardTexture, slot.x, slot.y, slot.w, slot.h);
  } else {
    ctx.fillStyle = '#121210';
    ctx.fillRect(slot.x, slot.y, slot.w, slot.h);
  }
  ctx.fillStyle = isHome ? COLORS.barRed : COLORS.barWhite;
  ctx.fillRect(slot.x, slot.y, ACCENT_BAR_WIDTH, slot.h);
  ctx.restore();

  // Contorno subtil da moldura por cima para acabamento limpo
  ctx.save();
  drawRoundedRectPath(ctx, slot.x, slot.y, slot.w, slot.h, CARD_RADIUS);
  ctx.strokeStyle = COLORS.cardBorder;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.restore();
}

/**
 * Desenha uma ou mais pílulas de escalão (separadas por vírgula, ex: "U12M, U12F").
 * Retorna o X direito da última pílula desenhada.
 */
function drawCategoryPills(ctx, escalaoStr, startX, pillY, isHome, fontFamily = DEFAULT_FONT) {
  const tags = String(escalaoStr || '')
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);

  if (tags.length === 0) return startX;

  const pillHeight = 35.5;
  const pillRadius = 6.5;
  const minPillWidth = 90;
  const gap = 3.5;

  let cursorX = startX;

  for (const tag of tags) {
    // No modelo original, U23M / U16M / U14M - B cabem todos numa pílula de 90px
    const baseSize = tag.length >= 7 ? 24 : 28.5;
    const maxTextW = tag.length <= 8 ? 78 : 140;
    const fontSize = fitFontSize(ctx, tag, {
      weight: 700,
      maxSize: baseSize,
      minSize: 16,
      maxWidth: maxTextW,
      fontFamily,
    });
    ctx.font = `700 ${fontSize}px ${fontFamily}`;
    const textW = ctx.measureText(tag).width;
    const pillW = Math.max(minPillWidth, Math.ceil(textW + 16));

    // Fundo da pílula
    ctx.save();
    drawRoundedRectPath(ctx, cursorX, pillY, pillW, pillHeight, pillRadius);
    ctx.fillStyle = isHome ? COLORS.pillRed : COLORS.pillWhite;
    ctx.fill();

    // Texto centrado dentro da pílula
    ctx.fillStyle = isHome ? COLORS.pillTextOnRed : COLORS.pillTextOnWhite;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(tag, cursorX + pillW / 2, pillY + pillHeight / 2 - 0.5);
    ctx.restore();

    cursorX += pillW + gap;
  }

  return cursorX - gap;
}

/**
 * Renderiza o conteúdo de um cartão de AGENDA.
 */
function drawAgendaCard(ctx, slot, game, cardTexture, fontFamily = DEFAULT_FONT) {
  drawActiveCardChrome(ctx, slot, game.casa, cardTexture);

  const leftX = slot.x + 37; // x = 112
  const dividerX = 500.5;
  const leftColMaxRight = dividerX - 14;
  const rightX = 516.5;
  const rightColMaxWidth = (slot.x + slot.w) - rightX - 12; // ~212px

  // 1. Divisória vertical branca
  ctx.save();
  ctx.fillStyle = COLORS.divider;
  ctx.fillRect(dividerX - 0.9, slot.y + 17.5, 1.9, 94.5);
  ctx.restore();

  // 2. Linha superior esquerda: "VS ADVERSÁRIO" ou título direto para Eventos/Convívios
  const titleBaselineY = slot.y + 61.5;
  const titleText = (game.adversario || '').trim().toUpperCase();

  ctx.save();
  ctx.fillStyle = COLORS.white;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  if (game.tipo === 'evento') {
    const size = fitFontSize(ctx, titleText, {
      weight: 700,
      maxSize: 45.5,
      minSize: 22,
      maxWidth: leftColMaxRight - leftX,
      fontFamily,
    });
    ctx.font = `700 ${size}px ${fontFamily}`;
    ctx.fillText(titleText, leftX, titleBaselineY);
  } else {
    // Prefixo "VS" pequeno alinhado pela linha de base
    const vsSize = 21.5;
    ctx.font = `700 ${vsSize}px ${fontFamily}`;
    const vsWidth = ctx.measureText('VS').width;
    ctx.fillText('VS', leftX, titleBaselineY);

    const oppX = leftX + vsWidth + 4.5;
    const oppSize = fitFontSize(ctx, titleText, {
      weight: 700,
      maxSize: 45.5,
      minSize: 22,
      maxWidth: leftColMaxRight - oppX,
      fontFamily,
    });
    ctx.font = `700 ${oppSize}px ${fontFamily}`;
    ctx.fillText(titleText, oppX, titleBaselineY);
  }
  ctx.restore();

  // 3. Linha inferior esquerda: Pílula(s) de escalão + Competição
  const pillY = slot.y + 79.5;
  const lastPillRight = drawCategoryPills(ctx, game.escalao, leftX, pillY, game.casa, fontFamily);

  if (game.competicao) {
    const compX = lastPillRight + 10.5;
    const compMaxW = leftColMaxRight - compX;
    if (compMaxW > 30) {
      ctx.save();
      const compSize = fitFontSize(ctx, game.competicao, {
        weight: 700,
        maxSize: 19.5,
        minSize: 12,
        maxWidth: compMaxW,
        fontFamily,
      });
      ctx.font = `700 ${compSize}px ${fontFamily}`;
      ctx.fillStyle = COLORS.white;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(game.competicao, compX, pillY + 35.5 / 2 - 0.5);
      ctx.restore();
    }
  }

  // 4. Coluna direita: Data, Hora e Local
  ctx.save();
  ctx.fillStyle = COLORS.white;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  if (game.data) {
    const dateSize = fitFontSize(ctx, game.data, {
      weight: 700,
      maxSize: 31.5,
      minSize: 18,
      maxWidth: rightColMaxWidth,
      fontFamily,
    });
    ctx.font = `700 ${dateSize}px ${fontFamily}`;
    ctx.fillText(game.data, rightX, slot.y + 42.5);
  }

  if (game.hora) {
    const timeSize = fitFontSize(ctx, game.hora, {
      weight: 700,
      maxSize: 33.5,
      minSize: 20,
      maxWidth: rightColMaxWidth,
      fontFamily,
    });
    ctx.font = `700 ${timeSize}px ${fontFamily}`;
    ctx.fillText(game.hora, rightX, slot.y + 76.5);
  }

  if (game.local) {
    const venueSize = fitFontSize(ctx, game.local, {
      weight: 700,
      maxSize: 17.5,
      minSize: 11.5,
      maxWidth: rightColMaxWidth,
      fontFamily,
    });
    ctx.font = `700 ${venueSize}px ${fontFamily}`;
    ctx.fillText(game.local, rightX, slot.y + 104.5);
  }
  ctx.restore();
}

/**
 * Renderiza o conteúdo de um cartão de RESULTADOS.
 */
function drawResultadosCard(ctx, slot, game, cardTexture, fontFamily = DEFAULT_FONT) {
  drawActiveCardChrome(ctx, slot, game.casa, cardTexture);

  const leftX = slot.x + 38; // x = 113
  const rightEdge = slot.x + slot.w - 18; // x = 722.5
  const maxLineWidth = rightEdge - leftX;

  const clubName = CONFIG.CLUB_NAME;
  const oppName = (game.adversario || '').trim().toUpperCase();
  const sbcPts = game.pontosSbc !== '' ? String(game.pontosSbc) : '–';
  const advPts = game.pontosAdv !== '' ? String(game.pontosAdv) : '–';

  // Monta os segmentos coloridos mantendo o Santarém Basket + respetiva pontuação SEMPRE a vermelho
  // Casa (vermelho à esquerda):  [RED: SANTARÉM BASKET  63] [WHITE:  - 54 CN ABRANTES]
  // Fora (vermelho à direita):   [WHITE: BC TOMAR 58 - ] [RED: 54 SANTARÉM BASKET]
  const segments = game.casa
    ? [
        { text: `${clubName}  ${sbcPts}`, color: COLORS.scoreRed },
        { text: ` - ${advPts} ${oppName}`, color: COLORS.white },
      ]
    : [
        { text: `${oppName} ${advPts} - `, color: COLORS.white },
        { text: `${sbcPts} ${clubName}`, color: COLORS.scoreRed },
      ];

  const fullLine = segments.map((s) => s.text).join('');
  const scoreSize = fitFontSize(ctx, fullLine, {
    weight: 700,
    maxSize: 40.5,
    minSize: 20,
    maxWidth: maxLineWidth,
    fontFamily,
  });

  ctx.save();
  ctx.font = `700 ${scoreSize}px ${fontFamily}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  let cursorX = leftX;
  const scoreBaselineY = slot.y + 63.0;
  for (const seg of segments) {
    ctx.fillStyle = seg.color;
    ctx.fillText(seg.text, cursorX, scoreBaselineY);
    cursorX += ctx.measureText(seg.text).width;
  }
  ctx.restore();

  // Linha inferior esquerda: Pílula(s) de escalão
  const pillY = slot.y + 80.5;
  drawCategoryPills(ctx, game.escalao, slot.x + 37, pillY, game.casa, fontFamily);

  // Linha inferior direita: Data do jogo (ex: "6 NOVEMBRO 2026")
  if (game.data) {
    ctx.save();
    const dateSize = fitFontSize(ctx, game.data, {
      weight: 700,
      maxSize: 23.5,
      minSize: 15,
      maxWidth: 260,
      fontFamily,
    });
    ctx.font = `700 ${dateSize}px ${fontFamily}`;
    ctx.fillStyle = COLORS.white;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(game.data, 705, pillY + 35.5 / 2 - 0.5);
    ctx.restore();
  }
}

/**
 * Renderiza um slide completo (até 4 jogos) num <canvas> a 1080 × 1350 px.
 */
export async function renderSlideToCanvas(canvas, { mode, games, fontFamily = DEFAULT_FONT }) {
  const safeMode = mode === 'resultados' ? 'resultados' : 'agenda';
  const [baseImg, cardTexture] = await Promise.all([
    loadImage(TEMPLATE_URLS[safeMode]),
    loadImage(TEMPLATE_URLS.cardTexture),
  ]);

  canvas.width = CONFIG.EXPORT_WIDTH;
  canvas.height = CONFIG.EXPORT_HEIGHT;

  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Escala do espaço lógico (819 × 1024) para exportação final (1080 × 1350)
  const scaleX = CONFIG.EXPORT_WIDTH / CONFIG.LOGICAL_WIDTH;
  const scaleY = CONFIG.EXPORT_HEIGHT / CONFIG.LOGICAL_HEIGHT;

  ctx.save();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(baseImg, 0, 0, CONFIG.EXPORT_WIDTH, CONFIG.EXPORT_HEIGHT);

  ctx.scale(scaleX, scaleY);

  const slots = CARD_SLOTS[safeMode];
  const count = Math.min(games.length, slots.length);
  for (let i = 0; i < count; i++) {
    if (safeMode === 'resultados') {
      drawResultadosCard(ctx, slots[i], games[i], cardTexture, fontFamily);
    } else {
      drawAgendaCard(ctx, slots[i], games[i], cardTexture, fontFamily);
    }
  }
  ctx.restore();
}

/**
 * Exporta um <canvas> para Blob PNG de qualidade máxima.
 */
export function canvasToPngBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Falha ao gerar imagem PNG.'));
    }, 'image/png');
  });
}

/**
 * Controlador principal do Gerador de Posts — Santarém Basket Clube
 */

import { CONFIG, DEMO_ROWS } from './config.js';
import { extractSpreadsheetId, fetchSheetGames, groupGamesByCycle } from './sheets.js';
import {
  canvasToPngBlob,
  paginateGames,
  preloadTemplates,
  renderSlideToCanvas,
} from './renderer.js';
import { buildZipBlob } from './zip.js';

const state = {
  sourceMode: 'demo', // 'demo' | 'sheet'
  sheetId: '',
  sheetName: CONFIG.DEFAULT_SHEET_NAME,
  allGames: [],
  cycles: [],
  grouped: Object.create(null),
  activeCycle: '',
  postMode: 'agenda', // 'agenda' | 'resultados'
  excludedIds: new Set(),
  renderedCanvases: [],
};

const els = {
  form: document.getElementById('sheet-form'),
  sheetInput: document.getElementById('sheet-id-input'),
  tabInput: document.getElementById('sheet-name-input'),
  loadBtn: document.getElementById('btn-load-sheet'),
  demoBtn: document.getElementById('btn-load-demo'),
  statusBadge: document.getElementById('status-badge'),
  statusMessage: document.getElementById('status-message'),
  tablist: document.getElementById('cycle-tablist'),
  modeAgendaBtn: document.getElementById('btn-mode-agenda'),
  modeResultsBtn: document.getElementById('btn-mode-resultados'),
  summary: document.getElementById('slides-summary'),
  downloadAllZipBtn: document.getElementById('btn-download-zip'),
  slidesGrid: document.getElementById('slides-grid'),
  gameList: document.getElementById('game-list'),
  selectAllBtn: document.getElementById('btn-select-all'),
};

let tabScrollObserver = null;

function slugify(str) {
  return String(str || 'post')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'post';
}

function setStatus(tone, badgeText, detailText) {
  els.statusBadge.dataset.tone = tone;
  els.statusBadge.textContent = badgeText;
  els.statusMessage.textContent = detailText;
}

function getCycleGames() {
  return state.grouped[state.activeCycle] ?? [];
}

/**
 * Filtra os jogos visíveis para o modo atual (Agenda vs Resultados).
 * Em Resultados, eventos/convívios sem pontuação são automaticamente ignorados.
 */
function getEligibleGamesForMode(games) {
  if (state.postMode === 'agenda') {
    return games;
  }
  return games.filter((g) => g.tipo !== 'evento' && (g.pontosSbc !== '' || g.pontosAdv !== ''));
}

function getIncludedGames() {
  return getEligibleGamesForMode(getCycleGames()).filter((g) => !state.excludedIds.has(g.id));
}

function setupTabScrollFadeFallback() {
  if (tabScrollObserver) {
    tabScrollObserver.disconnect();
    tabScrollObserver = null;
  }
  if (CSS.supports('animation-timeline', 'scroll()')) return;

  const scroller = els.tablist;
  const first = scroller.firstElementChild;
  const last = scroller.lastElementChild;
  if (!first || !last) return;

  tabScrollObserver = new IntersectionObserver(
    (entries) => {
      for (const { target, intersectionRatio } of entries) {
        if (target === first) {
          scroller.classList.toggle('more-start', intersectionRatio < 1);
        }
        if (target === last) {
          scroller.classList.toggle('more-end', intersectionRatio < 1);
        }
      }
    },
    { root: scroller, threshold: 1, rootMargin: '1px' },
  );
  tabScrollObserver.observe(first);
  tabScrollObserver.observe(last);
}

function renderCycleTabs() {
  const buttons = state.cycles.map((cycle) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pt-tab';
    btn.role = 'tab';
    const isSelected = cycle === state.activeCycle;
    btn.setAttribute('aria-selected', String(isSelected));
    btn.tabIndex = isSelected ? 0 : -1;
    btn.textContent = cycle;
    btn.dataset.cycle = cycle;
    btn.addEventListener('click', () => selectCycle(cycle));
    return btn;
  });

  els.tablist.replaceChildren(...buttons);
  setupTabScrollFadeFallback();
}

function selectCycle(cycle, { focusTab = false } = {}) {
  if (!Object.hasOwn(state.grouped, cycle)) return;
  state.activeCycle = cycle;

  const tabs = [...els.tablist.querySelectorAll('[role="tab"]')];
  for (const tab of tabs) {
    const selected = tab.dataset.cycle === cycle;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
    if (selected) {
      tab.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      if (focusTab) tab.focus();
    }
  }

  // Sugere automaticamente o modo com base nos dados se o utilizador acabou de mudar de ciclo?
  // Mantém o modo atual para não surpreender o admin.
  renderWorkspace();
}

function handleTabKeydown(event) {
  const tabs = [...els.tablist.querySelectorAll('[role="tab"]')];
  if (tabs.length === 0) return;

  const currentIdx = tabs.findIndex((t) => t.dataset.cycle === state.activeCycle);
  let nextIdx = -1;

  if (event.key === 'ArrowRight') nextIdx = (currentIdx + 1) % tabs.length;
  else if (event.key === 'ArrowLeft') nextIdx = (currentIdx - 1 + tabs.length) % tabs.length;
  else if (event.key === 'Home') nextIdx = 0;
  else if (event.key === 'End') nextIdx = tabs.length - 1;

  if (nextIdx !== -1) {
    event.preventDefault();
    selectCycle(tabs[nextIdx].dataset.cycle, { focusTab: true });
  }
}

function setPostMode(mode) {
  state.postMode = mode === 'resultados' ? 'resultados' : 'agenda';
  els.modeAgendaBtn.setAttribute('aria-pressed', String(state.postMode === 'agenda'));
  els.modeResultsBtn.setAttribute('aria-pressed', String(state.postMode === 'resultados'));
  renderWorkspace();
}

function renderGameSidebar() {
  const cycleGames = getCycleGames();
  if (cycleGames.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'pt-sidebar-hint';
    empty.textContent = 'Sem jogos neste ciclo.';
    els.gameList.replaceChildren(empty);
    return;
  }

  const eligibleIds = new Set(getEligibleGamesForMode(cycleGames).map((g) => g.id));

  const items = cycleGames.map((game) => {
    const isEligible = eligibleIds.has(game.id);
    const isChecked = isEligible && !state.excludedIds.has(game.id);

    const label = document.createElement('label');
    label.className = 'pt-game-item';
    label.dataset.home = String(game.casa);
    label.dataset.excluded = String(!isChecked);

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = isChecked;
    checkbox.disabled = !isEligible;
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        state.excludedIds.delete(game.id);
      } else {
        state.excludedIds.add(game.id);
      }
      renderWorkspace();
    });

    const info = document.createElement('div');
    info.className = 'pt-game-info';

    const top = document.createElement('div');
    top.className = 'pt-game-top';

    for (const tag of game.escalao.split(',').map((s) => s.trim()).filter(Boolean)) {
      const pill = document.createElement('span');
      pill.className = 'pt-pill-mini';
      pill.textContent = tag;
      top.appendChild(pill);
    }

    const name = document.createElement('span');
    name.className = 'pt-game-name';
    if (state.postMode === 'resultados' && isEligible) {
      name.textContent = game.casa
        ? `SBC ${game.pontosSbc} - ${game.pontosAdv} ${game.adversario}`
        : `${game.adversario} ${game.pontosAdv} - ${game.pontosSbc} SBC`;
    } else {
      name.textContent = game.tipo === 'evento' ? game.adversario : `vs ${game.adversario}`;
    }
    top.appendChild(name);

    const sub = document.createElement('div');
    sub.className = 'pt-game-sub';
    const casaLabel = game.casa ? 'Casa' : 'Fora';
    const metaParts = [casaLabel, game.data, game.hora].filter(Boolean);
    sub.textContent = metaParts.join(' · ');

    info.append(top, sub);

    if (state.postMode === 'resultados' && !isEligible) {
      const warn = document.createElement('div');
      warn.className = 'pt-game-warn';
      warn.textContent =
        game.tipo === 'evento'
          ? 'Evento/Convívio — omitido nos Resultados'
          : 'Sem pontuação preenchida ainda';
      info.appendChild(warn);
    }

    label.append(checkbox, info);
    return label;
  });

  els.gameList.replaceChildren(...items);
}

function triggerBlobDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5_000);
}

function buildSlideFilename(slideIndex, totalSlides) {
  const cycleSlug = slugify(state.activeCycle);
  const suffix = totalSlides > 1 ? `-slide-${slideIndex + 1}` : '';
  return `sbc-${state.postMode}-${cycleSlug}${suffix}.png`;
}

async function renderSlides() {
  const included = getIncludedGames();
  const slides = paginateGames(included, CONFIG.MAX_PER_SLIDE);

  const modeLabel = state.postMode === 'resultados' ? 'Resultados' : 'Agenda';
  els.summary.replaceChildren();
  const strongCount = document.createElement('strong');
  strongCount.textContent = `${included.length} ${included.length === 1 ? 'jogo' : 'jogos'}`;
  const strongSlides = document.createElement('strong');
  strongSlides.textContent = `${slides.length} ${slides.length === 1 ? 'imagem' : 'imagens'}`;
  els.summary.append(
    `${modeLabel} · `,
    strongCount,
    ' → ',
    strongSlides,
    ' (1080×1350 px · 4:5 Instagram)',
  );

  els.downloadAllZipBtn.disabled = included.length === 0;
  els.downloadAllZipBtn.textContent =
    slides.length > 1
      ? `Descarregar Carrossel (${slides.length} PNGs em .ZIP)`
      : 'Descarregar Imagem (.PNG)';

  if (included.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'pt-empty';
    empty.textContent =
      state.postMode === 'resultados'
        ? 'Nenhum jogo deste ciclo tem pontuação preenchida ainda. Preencha "Pontos SBC" e "Pontos Adv" na Google Sheet e clique em Atualizar.'
        : 'Nenhum jogo selecionado para este ciclo.';
    els.slidesGrid.replaceChildren(empty);
    state.renderedCanvases = [];
    return;
  }

  const cards = [];
  const canvasEntries = [];

  for (let i = 0; i < slides.length; i++) {
    const slideGames = slides[i];
    const filename = buildSlideFilename(i, slides.length);

    const card = document.createElement('article');
    card.className = 'pt-slide-card';

    const header = document.createElement('div');
    header.className = 'pt-slide-header';
    const title = document.createElement('span');
    title.className = 'pt-slide-title';
    title.textContent =
      slides.length > 1 ? `Slide ${i + 1} de ${slides.length}` : `${modeLabel} — Post Único`;
    const meta = document.createElement('span');
    meta.className = 'pt-slide-meta';
    meta.textContent = `${slideGames.length} / ${CONFIG.MAX_PER_SLIDE} linhas`;
    header.append(title, meta);

    const frame = document.createElement('div');
    frame.className = 'pt-canvas-frame';
    const canvas = document.createElement('canvas');
    canvas.setAttribute(
      'aria-label',
      `Pré-visualização ${modeLabel} ${state.activeCycle} slide ${i + 1}`,
    );
    frame.appendChild(canvas);

    const footer = document.createElement('div');
    footer.className = 'pt-slide-footer';

    const dlBtn = document.createElement('button');
    dlBtn.type = 'button';
    dlBtn.className = 'pt-btn pt-btn-primary';
    dlBtn.textContent = 'Descarregar PNG';
    dlBtn.addEventListener('click', async () => {
      const blob = await canvasToPngBlob(canvas);
      triggerBlobDownload(blob, filename);
    });
    footer.appendChild(dlBtn);

    // Botão Partilhar nativo em telemóveis (iOS / Android) para enviar direto para Instagram/WhatsApp
    if (typeof navigator.share === 'function' && typeof navigator.canShare === 'function') {
      const shareBtn = document.createElement('button');
      shareBtn.type = 'button';
      shareBtn.className = 'pt-btn pt-btn-secondary';
      shareBtn.textContent = 'Partilhar';
      shareBtn.addEventListener('click', async () => {
        try {
          const blob = await canvasToPngBlob(canvas);
          const file = new File([blob], filename, { type: 'image/png' });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: `Santarém Basket — ${modeLabel} (${state.activeCycle})`,
            });
          } else {
            triggerBlobDownload(blob, filename);
          }
        } catch (err) {
          if (err?.name !== 'AbortError') {
            const blob = await canvasToPngBlob(canvas);
            triggerBlobDownload(blob, filename);
          }
        }
      });
      footer.appendChild(shareBtn);
    }

    card.append(header, frame, footer);
    cards.push(card);
    canvasEntries.push({ canvas, slideGames, filename });
  }

  els.slidesGrid.replaceChildren(...cards);
  state.renderedCanvases = canvasEntries;

  await preloadTemplates();
  await Promise.all(
    canvasEntries.map(({ canvas, slideGames }) =>
      renderSlideToCanvas(canvas, {
        mode: state.postMode,
        games: slideGames,
      }),
    ),
  );
}

async function renderWorkspace() {
  renderGameSidebar();
  await renderSlides();
}

function applyLoadedGames(games, { sourceMode, badgeText, detailText }) {
  state.sourceMode = sourceMode;
  state.allGames = games;
  state.excludedIds.clear();

  const { cycles, grouped } = groupGamesByCycle(games);
  state.cycles = cycles;
  state.grouped = grouped;

  if (!cycles.includes(state.activeCycle)) {
    state.activeCycle = cycles[0] ?? '';
  }

  setStatus(sourceMode === 'sheet' ? 'live' : 'demo', badgeText, detailText);
  renderCycleTabs();
  renderWorkspace();
}

function loadDemoData() {
  const demoGames = DEMO_ROWS.map((row, idx) => ({ ...row, id: `demo-${idx}` }));
  applyLoadedGames(demoGames, {
    sourceMode: 'demo',
    badgeText: 'Modo Exemplo',
    detailText:
      'A mostrar os dados de exemplo (inclui carrossel de 6 jogos em "13-15 Nov 2026" e 4 resultados em "6-8 Nov 2026"). Cole o link da Google Sheet acima para usar dados reais.',
  });
}

async function loadFromSheet(sheetIdOrUrl, sheetName) {
  const id = extractSpreadsheetId(sheetIdOrUrl);
  if (!id) {
    setStatus(
      'error',
      'Link inválido',
      'Cole o endereço completo da Google Sheet (https://docs.google.com/spreadsheets/d/...) ou apenas o respetivo ID.',
    );
    return;
  }

  els.loadBtn.disabled = true;
  setStatus('demo', 'A carregar...', 'A ler os jogos da Google Sheet...');

  try {
    const games = await fetchSheetGames(id, sheetName);
    state.sheetId = id;
    state.sheetName = sheetName;
    try {
      localStorage.setItem(CONFIG.STORAGE_KEY_SHEET, id);
    } catch {
      // Ignora bloqueios de storage em modo privado restrito
    }

    const nowTime = new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
    applyLoadedGames(games, {
      sourceMode: 'sheet',
      badgeText: 'Google Sheet Ligada',
      detailText: `${games.length} jogos carregados da aba "${sheetName}" às ${nowTime}.`,
    });
  } catch (err) {
    setStatus('error', 'Erro ao carregar', err.message || 'Falha ao ler a Google Sheet.');
  } finally {
    els.loadBtn.disabled = false;
  }
}

async function handleDownloadAll() {
  if (state.renderedCanvases.length === 0) return;

  if (state.renderedCanvases.length === 1) {
    const { canvas, filename } = state.renderedCanvases[0];
    const blob = await canvasToPngBlob(canvas);
    triggerBlobDownload(blob, filename);
    return;
  }

  els.downloadAllZipBtn.disabled = true;
  const originalText = els.downloadAllZipBtn.textContent;
  els.downloadAllZipBtn.textContent = 'A preparar .ZIP...';

  try {
    const files = [];
    for (const { canvas, filename } of state.renderedCanvases) {
      const blob = await canvasToPngBlob(canvas);
      const buffer = await blob.arrayBuffer();
      files.push({ name: filename, data: new Uint8Array(buffer) });
    }
    const zipBlob = buildZipBlob(files);
    const zipName = `sbc-${state.postMode}-${slugify(state.activeCycle)}.zip`;
    triggerBlobDownload(zipBlob, zipName);
  } finally {
    els.downloadAllZipBtn.disabled = false;
    els.downloadAllZipBtn.textContent = originalText;
  }
}

function init() {
  els.form.addEventListener('submit', (e) => {
    e.preventDefault();
    loadFromSheet(els.sheetInput.value, els.tabInput.value.trim() || CONFIG.DEFAULT_SHEET_NAME);
  });

  els.demoBtn.addEventListener('click', () => loadDemoData());
  els.modeAgendaBtn.addEventListener('click', () => setPostMode('agenda'));
  els.modeResultsBtn.addEventListener('click', () => setPostMode('resultados'));
  els.tablist.addEventListener('keydown', handleTabKeydown);
  els.downloadAllZipBtn.addEventListener('click', handleDownloadAll);
  els.selectAllBtn.addEventListener('click', () => {
    for (const g of getCycleGames()) state.excludedIds.delete(g.id);
    renderWorkspace();
  });

  // Ordem de prioridade para ligar automaticamente a Google Sheet:
  // 1) Parâmetro ?sheet=... no URL  2) DEFAULT_SHEET_ID em config.js  3) localStorage
  const params = new URLSearchParams(window.location.search);
  const urlSheet = params.get('sheet');
  const urlTab = params.get('tab') || CONFIG.DEFAULT_SHEET_NAME;
  const savedSheet = (() => {
    try {
      return localStorage.getItem(CONFIG.STORAGE_KEY_SHEET) || '';
    } catch {
      return '';
    }
  })();

  const initialSheet = urlSheet || CONFIG.DEFAULT_SHEET_ID || savedSheet;
  els.tabInput.value = urlTab;

  if (initialSheet) {
    els.sheetInput.value = initialSheet;
    loadFromSheet(initialSheet, urlTab);
  } else {
    loadDemoData();
  }
}

init();

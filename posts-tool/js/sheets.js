/**
 * Leitor de Google Sheets (Modo Público — Option B: folha única com coluna "Ciclo").
 * Usa o endpoint público gviz sem necessidade de chave de API nem backend.
 */

const MONTHS_PT = [
  'JANEIRO',
  'FEVEREIRO',
  'MARÇO',
  'ABRIL',
  'MAIO',
  'JUNHO',
  'JULHO',
  'AGOSTO',
  'SETEMBRO',
  'OUTUBRO',
  'NOVEMBRO',
  'DEZEMBRO',
];

/**
 * Extrai o Spreadsheet ID a partir de um URL completo ou de um ID direto.
 */
export function extractSpreadsheetId(input) {
  const trimmed = String(input ?? '').trim();
  if (!trimmed) return '';
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match) return match[1];
  // Aceita ID direto se tiver caracteres válidos de ID Google
  if (/^[a-zA-Z0-9-_]{20,}$/.test(trimmed)) return trimmed;
  return '';
}

function normalizeHeader(label) {
  return String(label ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function findColumnIndex(headers, aliases) {
  for (const alias of aliases) {
    const idx = headers.findIndex((h) => h === alias);
    if (idx !== -1) return idx;
  }
  for (const alias of aliases) {
    const idx = headers.findIndex((h) => h.includes(alias));
    if (idx !== -1) return idx;
  }
  return -1;
}

/**
 * Formata datas vindas do Google Sheets (Date(Y,M,D), DD/MM/YYYY, YYYY-MM-DD, ou texto já formatado)
 * para o formato oficial dos cartões: "13 NOVEMBRO 2026".
 */
export function formatDatePt(cell) {
  if (!cell) return '';
  const raw = cell.v;
  const formatted = cell.f;

  // 1. Formato nativo gviz: "Date(2026,10,13)" (mês 0-indexado)
  if (typeof raw === 'string') {
    const gvizMatch = raw.match(/^Date\((\d{4}),(\d{1,2}),(\d{1,2})/);
    if (gvizMatch) {
      const year = Number(gvizMatch[1]);
      const monthIdx = Number(gvizMatch[2]);
      const day = Number(gvizMatch[3]);
      if (monthIdx >= 0 && monthIdx < 12) {
        return `${day} ${MONTHS_PT[monthIdx]} ${year}`;
      }
    }
  }

  const text = String(formatted ?? raw ?? '').trim();
  if (!text) return '';

  // 2. DD/MM/YYYY ou DD-MM-YYYY
  const dmy = text.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) {
    const day = Number(dmy[1]);
    const monthIdx = Number(dmy[2]) - 1;
    const year = Number(dmy[3]);
    if (monthIdx >= 0 && monthIdx < 12) {
      return `${day} ${MONTHS_PT[monthIdx]} ${year}`;
    }
  }

  // 3. YYYY-MM-DD
  const ymd = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (ymd) {
    const year = Number(ymd[1]);
    const monthIdx = Number(ymd[2]) - 1;
    const day = Number(ymd[3]);
    if (monthIdx >= 0 && monthIdx < 12) {
      return `${day} ${MONTHS_PT[monthIdx]} ${year}`;
    }
  }

  return text.toUpperCase();
}

/**
 * Formata horas vindas do Google Sheets (Date(1899,11,30,21,0,0), "21:00:00", "21:00", [21,0,0])
 * para "HH:MM".
 */
export function formatTimePt(cell) {
  if (!cell) return '';
  const raw = cell.v;

  // Formato gviz timeofday: [21, 0, 0, 0]
  if (Array.isArray(raw) && raw.length >= 2) {
    return `${String(raw[0]).padStart(2, '0')}:${String(raw[1]).padStart(2, '0')}`;
  }

  // Formato gviz datetime: Date(1899,11,30,21,0,0)
  if (typeof raw === 'string') {
    const dt = raw.match(/^Date\(\d+,\d+,\d+,(\d{1,2}),(\d{1,2})/);
    if (dt) {
      return `${String(Number(dt[1])).padStart(2, '0')}:${String(Number(dt[2])).padStart(2, '0')}`;
    }
  }

  const text = String(cell.f ?? raw ?? '').trim();
  const hm = text.match(/^(\d{1,2}):(\d{2})/);
  if (hm) {
    return `${String(Number(hm[1])).padStart(2, '0')}:${hm[2]}`;
  }
  return text;
}

function readText(cell) {
  if (!cell) return '';
  const val = cell.f ?? cell.v;
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

function readScore(cell) {
  if (!cell) return '';
  if (typeof cell.v === 'number' && Number.isFinite(cell.v)) {
    return String(Math.round(cell.v));
  }
  const text = readText(cell);
  return text === '' ? '' : text;
}

function parseBooleanCasa(cell) {
  if (!cell) return false;
  if (typeof cell.v === 'boolean') return cell.v;
  const val = normalizeHeader(readText(cell));
  return ['sim', 's', 'casa', 'home', 'true', '1', 'x', 'yes'].includes(val);
}

function parseTipo(cell) {
  const val = normalizeHeader(readText(cell));
  if (['evento', 'convivio', 'torneio', 'festa', 'especial'].includes(val)) {
    return 'evento';
  }
  return 'jogo';
}

/**
 * Faz fetch do JSONP do gviz e devolve um array normalizado de jogos.
 */
export async function fetchSheetGames(sheetIdOrUrl, sheetName = 'Jogos') {
  const spreadsheetId = extractSpreadsheetId(sheetIdOrUrl);
  if (!spreadsheetId) {
    throw new Error('ID ou link de Google Sheet inválido. Verifique o endereço copiado.');
  }

  const endpoint = new URL(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq`);
  endpoint.searchParams.set('tqx', 'out:json');
  if (sheetName) {
    endpoint.searchParams.set('sheet', sheetName);
  }
  // Evita cache desatualizada quando o admin carrega em "Atualizar"
  endpoint.searchParams.set('_', String(Date.now()));

  let response;
  try {
    response = await fetch(endpoint.toString(), {
      signal: AbortSignal.timeout(12_000),
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'TimeoutError') {
      throw new Error('O pedido à Google Sheet demorou demasiado tempo. Tente novamente.', { cause: err });
    }
    throw new Error('Não foi possível contactar o Google Sheets. Verifique a ligação à internet.', { cause: err });
  }

  if (!response.ok) {
    throw new Error(
      `Erro HTTP ${response.status}. Confirme que a folha está partilhada como "Qualquer pessoa com o link (Leitor)".`,
    );
  }

  const rawText = await response.text();
  const jsonStart = rawText.indexOf('{');
  const jsonEnd = rawText.lastIndexOf('}');
  if (jsonStart === -1 || jsonEnd === -1) {
    throw new Error(
      'A folha não devolveu dados legíveis. Confirme que o acesso público ("Qualquer pessoa com o link") está ativo.',
    );
  }

  let payload;
  try {
    payload = JSON.parse(rawText.slice(jsonStart, jsonEnd + 1));
  } catch (err) {
    throw new Error('Falha ao interpretar os dados da Google Sheet.', { cause: err });
  }

  if (payload.status === 'error') {
    const detail = payload.errors?.[0]?.detailed_message || payload.errors?.[0]?.message || 'Erro desconhecido';
    throw new Error(`Erro da Google Sheet: ${detail}`);
  }

  const table = payload.table;
  const cols = table?.cols ?? [];
  const rawRows = table?.rows ?? [];

  // Alguns sheets enviam cabeçalhos em cols[].label; se estiverem vazios, lê a 1.ª linha de rows.
  let headerLabels = cols.map((c) => normalizeHeader(c.label));
  let dataStartRow = 0;

  if (headerLabels.every((h) => h === '') && rawRows.length > 0) {
    headerLabels = (rawRows[0].c ?? []).map((cell) => normalizeHeader(readText(cell)));
    dataStartRow = 1;
  }

  const idx = {
    ciclo: findColumnIndex(headerLabels, ['ciclo', 'fim de semana', 'jornada', 'semana']),
    escalao: findColumnIndex(headerLabels, ['escalao', 'escaloes', 'equipa', 'categoria']),
    adversario: findColumnIndex(headerLabels, ['adversario', 'adversario evento', 'evento', 'jogo', 'oponente']),
    casa: findColumnIndex(headerLabels, ['casa', 'home', 'em casa']),
    competicao: findColumnIndex(headerLabels, ['competicao', 'prova', 'campeonato']),
    data: findColumnIndex(headerLabels, ['data', 'dia']),
    hora: findColumnIndex(headerLabels, ['hora', 'horario']),
    local: findColumnIndex(headerLabels, ['local', 'pavilhao', 'recinto']),
    pontosSbc: findColumnIndex(headerLabels, ['pontos sbc', 'pts sbc', 'sbc', 'pontos santarem']),
    pontosAdv: findColumnIndex(headerLabels, ['pontos adv', 'pts adv', 'pontos adversario', 'adv']),
    tipo: findColumnIndex(headerLabels, ['tipo']),
  };

  if (idx.ciclo === -1 || idx.escalao === -1 || idx.adversario === -1) {
    throw new Error(
      'Colunas obrigatórias em falta na folha. Confirme que a Linha 1 contém: Ciclo, Escalão, Adversário, Casa, Competição, Data, Hora, Local, Pontos SBC, Pontos Adv, Tipo.',
    );
  }

  const games = [];
  for (let r = dataStartRow; r < rawRows.length; r++) {
    const cells = rawRows[r]?.c ?? [];
    const get = (colIndex) => (colIndex >= 0 ? cells[colIndex] : null);

    const ciclo = readText(get(idx.ciclo));
    const escalao = readText(get(idx.escalao));
    const adversario = readText(get(idx.adversario));

    // Ignora linhas vazias ou de preenchimento incompleto
    if (!ciclo || (!escalao && !adversario)) continue;

    games.push({
      id: `row-${r}`,
      ciclo,
      escalao: escalao.toUpperCase(),
      adversario: adversario.toUpperCase(),
      casa: parseBooleanCasa(get(idx.casa)),
      competicao: readText(get(idx.competicao)).toUpperCase(),
      data: formatDatePt(get(idx.data)),
      hora: formatTimePt(get(idx.hora)),
      local: readText(get(idx.local)).toUpperCase(),
      pontosSbc: readScore(get(idx.pontosSbc)),
      pontosAdv: readScore(get(idx.pontosAdv)),
      tipo: parseTipo(get(idx.tipo)),
    });
  }

  if (games.length === 0) {
    throw new Error('A folha foi carregada, mas não foram encontrados jogos preenchidos.');
  }

  return games;
}

/**
 * Agrupa jogos por Ciclo mantendo a ordem de aparição na folha.
 */
export function groupGamesByCycle(games) {
  const grouped = Object.groupBy(games, (g) => g.ciclo);
  const cycles = Object.keys(grouped);
  return { cycles, grouped };
}

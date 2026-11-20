/**
 * Configuração do Gerador de Posts — Santarém Basket Clube
 *
 * Para ligar definitivamente a folha de cálculo do clube:
 * 1. Abra a Google Sheet do clube.
 * 2. Copie o ID da folha no URL (entre "/d/" e "/edit").
 * 3. Cole abaixo em DEFAULT_SHEET_ID.
 */

export const CONFIG = {
  // ID da Google Sheet oficial do clube (Santarém Basket — Agenda & Resultados).
  DEFAULT_SHEET_ID: '17jCLcQQXmxQdNAwqHV4Hya4wH4RGq6FXLjB-_gz3dbk',

  // Nome exato do separador (aba) principal da Google Sheet.
  DEFAULT_SHEET_NAME: 'Jogos',

  // Nome oficial exibido nos cartões de Resultados.
  CLUB_NAME: 'SANTARÉM BASKET',

  // Máximo de entradas por imagem do carrossel (preenche sempre 4 antes de abrir novo slide).
  MAX_PER_SLIDE: 4,

  // Dimensões finais de exportação (4:5 Instagram Feed).
  EXPORT_WIDTH: 1080,
  EXPORT_HEIGHT: 1350,

  // Coordenadas lógicas baseadas nos templates originais (819 x 1024).
  LOGICAL_WIDTH: 819,
  LOGICAL_HEIGHT: 1024,

  // Chave de armazenamento local para recordar o ID da folha no browser do utilizador.
  STORAGE_KEY_SHEET: 'sbc_posts_tool_sheet_id',
};

/**
 * Dados de demonstração baseados nos exemplos reais de Agenda e Resultados,
 * incluindo um fim de semana com 6 jogos para demonstrar a paginação em carrossel (4 + 2).
 */
export const DEMO_ROWS = [
  // Ciclo 1 — Exatamente os 4 jogos do exemplo de Agenda + 2 jogos extra para testar carrossel (6 jogos = 4 + 2)
  {
    ciclo: '13-15 Nov 2026',
    escalao: 'U23M',
    adversario: 'SCOCS',
    casa: true,
    competicao: 'CAMPEONATO NACIONAL ESPERANÇAS',
    data: '13 NOVEMBRO 2026',
    hora: '21:00',
    local: 'NAVE - PAV MUNICIPAL SANTARÉM',
    pontosSbc: '',
    pontosAdv: '',
    tipo: 'jogo',
  },
  {
    ciclo: '13-15 Nov 2026',
    escalao: 'U12M, U12F',
    adversario: 'CONVÍVIO MINI 12',
    casa: false,
    competicao: '',
    data: '14 NOVEMBRO 2026',
    hora: '09:00',
    local: 'PAVILHÃO BAIRRO PADRE CRUZ',
    pontosSbc: '',
    pontosAdv: '',
    tipo: 'evento',
  },
  {
    ciclo: '13-15 Nov 2026',
    escalao: 'U16M',
    adversario: 'CDTN-OAB',
    casa: true,
    competicao: 'CAMPEONATO DISTRITAL',
    data: '14 NOVEMBRO 2026',
    hora: '14:30',
    local: 'NAVE - PAV MUNICIPAL SANTARÉM',
    pontosSbc: '',
    pontosAdv: '',
    tipo: 'jogo',
  },
  {
    ciclo: '13-15 Nov 2026',
    escalao: 'U14M - B',
    adversario: 'RIO MAIOR BC',
    casa: true,
    competicao: 'CAMPEONATO DISTRITAL',
    data: '15 NOVEMBRO 2026',
    hora: '09:00',
    local: 'NAVE - PAV MUNICIPAL SANTARÉM',
    pontosSbc: '',
    pontosAdv: '',
    tipo: 'jogo',
  },
  {
    ciclo: '13-15 Nov 2026',
    escalao: 'U18M',
    adversario: 'BC TOMAR',
    casa: false,
    competicao: 'CAMPEONATO DISTRITAL',
    data: '15 NOVEMBRO 2026',
    hora: '11:30',
    local: 'PAVILHÃO MUNICIPAL DE TOMAR',
    pontosSbc: '',
    pontosAdv: '',
    tipo: 'jogo',
  },
  {
    ciclo: '13-15 Nov 2026',
    escalao: 'U16F',
    adversario: 'CN ABRANTES',
    casa: true,
    competicao: 'CAMPEONATO DISTRITAL',
    data: '15 NOVEMBRO 2026',
    hora: '16:00',
    local: 'PAVILHÃO MUNICIPAL SANTARÉM',
    pontosSbc: '',
    pontosAdv: '',
    tipo: 'jogo',
  },

  // Ciclo 2 — Exatamente os 4 jogos do exemplo de Resultados
  {
    ciclo: '6-8 Nov 2026',
    escalao: 'U23M',
    adversario: 'CN ABRANTES',
    casa: true,
    competicao: 'CAMPEONATO NACIONAL ESPERANÇAS',
    data: '6 NOVEMBRO 2026',
    hora: '21:00',
    local: 'NAVE - PAV MUNICIPAL SANTARÉM',
    pontosSbc: '63',
    pontosAdv: '54',
    tipo: 'jogo',
  },
  {
    ciclo: '6-8 Nov 2026',
    escalao: 'U16M',
    adversario: 'BC TOMAR',
    casa: false,
    competicao: 'CAMPEONATO DISTRITAL',
    data: '7 NOVEMBRO 2026',
    hora: '15:00',
    local: 'PAVILHÃO MUNICIPAL DE TOMAR',
    pontosSbc: '54',
    pontosAdv: '58',
    tipo: 'jogo',
  },
  {
    ciclo: '6-8 Nov 2026',
    escalao: 'U18M - B',
    adversario: 'RIO MAIOR BC',
    casa: true,
    competicao: 'CAMPEONATO DISTRITAL',
    data: '8 NOVEMBRO 2026',
    hora: '11:00',
    local: 'NAVE - PAV MUNICIPAL SANTARÉM',
    pontosSbc: '22',
    pontosAdv: '130',
    tipo: 'jogo',
  },
  {
    ciclo: '6-8 Nov 2026',
    escalao: 'U14M - B',
    adversario: 'CDTN-OAB',
    casa: false,
    competicao: 'CAMPEONATO DISTRITAL',
    data: '8 NOVEMBRO 2026',
    hora: '14:30',
    local: 'PAVILHÃO TORRES NOVAS',
    pontosSbc: '21',
    pontosAdv: '97',
    tipo: 'jogo',
  },
];

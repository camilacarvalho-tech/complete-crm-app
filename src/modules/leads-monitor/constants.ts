import type { FiltrosPesquisa, FontePesquisaTipo, FaixaFuncionarios } from './types'

export const LEADS_MONITOR_VERSION = '1.7.0'

/** Coleções Firestore sob empresas/{empresaId}/ */
export const COL_OPORTUNIDADES = 'leadsMonitorOportunidades'
export const COL_PESQUISAS = 'leadsMonitorPesquisas'
export const COL_CONFIG = 'leadsMonitorConfig'
export const COL_JOBS = 'leadsMonitorJobs'
export const COL_INBOX = 'leadsMonitorInbox'
export const COL_LOGS = 'leadsMonitorLogs'
export const COL_DLQ = 'leadsMonitorDLQ'
export const COL_AUDIT = 'leadsMonitorAudit'
export const COL_HEALTH = 'leadsMonitorHealth'
/** V1.2 — fontes de pesquisa configuráveis */
export const COL_FONTES = 'leadsMonitorFontes'
/** V1.2 — histórico / progresso de buscas inteligentes */
export const COL_SEARCH_RUNS = 'leadsMonitorSearchRuns'
/** V1.3 — pessoas pesquisadas a partir de uma empresa */
export const COL_PEOPLE_RESEARCH = 'companyPeopleResearch'
/** V1.3 — progresso da pesquisa de pessoas (doc id = opportunityId) */
export const COL_PEOPLE_RUNS = 'leadsMonitorPeopleRuns'
/** V1.4 — processamentos do robô (busca ou importação) */
export const COL_PROCESS_RUNS = 'leadsMonitorProcessRuns'
export const COL_PROCESS_RECORDS = 'leadsMonitorProcessRecords'

export const ESTADOS_BR = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
] as const

export const ESTADOS_BR_NOMES: Array<{ uf: string; nome: string }> = [
  { uf: 'AC', nome: 'Acre' },
  { uf: 'AL', nome: 'Alagoas' },
  { uf: 'AP', nome: 'Amapá' },
  { uf: 'AM', nome: 'Amazonas' },
  { uf: 'BA', nome: 'Bahia' },
  { uf: 'CE', nome: 'Ceará' },
  { uf: 'DF', nome: 'Distrito Federal' },
  { uf: 'ES', nome: 'Espírito Santo' },
  { uf: 'GO', nome: 'Goiás' },
  { uf: 'MA', nome: 'Maranhão' },
  { uf: 'MT', nome: 'Mato Grosso' },
  { uf: 'MS', nome: 'Mato Grosso do Sul' },
  { uf: 'MG', nome: 'Minas Gerais' },
  { uf: 'PA', nome: 'Pará' },
  { uf: 'PB', nome: 'Paraíba' },
  { uf: 'PR', nome: 'Paraná' },
  { uf: 'PE', nome: 'Pernambuco' },
  { uf: 'PI', nome: 'Piauí' },
  { uf: 'RJ', nome: 'Rio de Janeiro' },
  { uf: 'RN', nome: 'Rio Grande do Norte' },
  { uf: 'RS', nome: 'Rio Grande do Sul' },
  { uf: 'RO', nome: 'Rondônia' },
  { uf: 'RR', nome: 'Roraima' },
  { uf: 'SC', nome: 'Santa Catarina' },
  { uf: 'SP', nome: 'São Paulo' },
  { uf: 'SE', nome: 'Sergipe' },
  { uf: 'TO', nome: 'Tocantins' },
]

export const OPERACOES_MONITOR = [
  { id: 'INSS', label: 'INSS' },
  { id: 'CREDITO_CLT', label: 'Crédito CLT' },
  { id: 'CREDITO_PESSOAL', label: 'Crédito pessoal' },
  { id: 'CREDITO_CONTA_ENERGIA', label: 'Crédito na conta de energia' },
  { id: 'SAQUE_FGTS', label: 'Saque FGTS' },
  { id: 'REFIN_CASA', label: 'Refinanciamento de casa' },
  { id: 'REFIN_CARRO', label: 'Refinanciamento de carro' },
  { id: 'CREDITO_IMOBILIARIO', label: 'Crédito imobiliário' },
  { id: 'PORTABILIDADE_CONSIGNADO', label: 'Portabilidade de consignado' },
  { id: 'SERVIDOR_SIAPE', label: 'Servidor SIAPE' },
  { id: 'SERVIDOR_PREFEITURA', label: 'Servidor prefeitura' },
  { id: 'LIMPA_NOME', label: 'Limpa nome' },
  { id: 'FGTS', label: 'FGTS' },
  { id: 'EMPRESTIMOS', label: 'Empréstimos' },
  { id: 'SERVIDOR', label: 'Servidor' },
  { id: 'OUTROS', label: 'Outros' },
] as const

export const SEGMENTOS_NICHOS = [
  { id: 'clinicas', label: 'Clínicas' },
  { id: 'supermercados', label: 'Supermercados' },
  { id: 'mercados', label: 'Mercados' },
  { id: 'industrias', label: 'Indústrias' },
  { id: 'academias', label: 'Academias' },
  { id: 'pet_shops', label: 'Pet shops' },
  { id: 'empresa_b2b', label: 'Empresas' },
  { id: 'outros', label: 'Outros' },
] as const

export const SEGMENTOS = [
  ...SEGMENTOS_NICHOS,
  { id: 'inss', label: 'INSS / Aposentadoria' },
  { id: 'credito_clt', label: 'Crédito CLT' },
  { id: 'emprestimo', label: 'Empréstimo Pessoal' },
  { id: 'fgts', label: 'FGTS' },
  { id: 'cartao', label: 'Cartão Benefício' },
  { id: 'corban', label: 'Correspondente Bancário' },
] as const

export const PALAVRAS_CHAVE_PROSPECCAO = ['INSS', 'CRÉDITO CLT', 'EMPRÉSTIMOS', 'FGTS'] as const
export const PROCESS_BATCH_SIZE = 40

export const FAIXAS_FUNCIONARIOS: Array<{ id: FaixaFuncionarios; label: string }> = [
  { id: 'qualquer', label: 'Qualquer quantidade' },
  { id: '1-10', label: '1–10' },
  { id: '11-50', label: '11–50' },
  { id: '51-100', label: '51–100' },
  { id: '101-500', label: '101–500' },
  { id: '501-1000', label: '501–1.000' },
  { id: '1001-5000', label: '1.001–5.000' },
  { id: '5001-10000', label: '5.001–10.000' },
  { id: '10001-50000', label: '10.001–50.000' },
  { id: '50000+', label: '50.000+' },
]

export const BENEFICIOS_CONSIGNAVEIS: Array<{ id: string; label: string }> = [
  { id: 'todos', label: 'Todos' },
  { id: '1', label: '1 benefício consignável' },
  { id: '2', label: '2 benefícios consignáveis' },
  { id: '3', label: '3 benefícios consignáveis' },
  { id: '4', label: '4 benefícios consignáveis' },
  { id: '5+', label: '5 ou mais benefícios consignáveis' },
]

/** Catálogo de tipos de fonte (UI + seeds). */
export const FONTES_TIPOS: Array<{
  id: FontePesquisaTipo
  label: string
  /** true = pode buscar sem credencial externa (CSV local / webhook já V1.1). */
  prontoSemCredencial: boolean
}> = [
  { id: 'openstreetmap', label: 'OpenStreetMap / Overpass', prontoSemCredencial: true },
  { id: 'google_places', label: 'Google Places API (opcional)', prontoSemCredencial: false },
  { id: 'google_maps', label: 'Google Maps (opcional)', prontoSemCredencial: false },
  { id: 'gbp', label: 'Google Business Profile', prontoSemCredencial: false },
  { id: 'google_search', label: 'Google Search', prontoSemCredencial: false },
  { id: 'instagram', label: 'Instagram', prontoSemCredencial: false },
  { id: 'facebook_pages', label: 'Facebook Pages', prontoSemCredencial: false },
  { id: 'linkedin_companies', label: 'LinkedIn Companies', prontoSemCredencial: false },
  { id: 'site_proprio', label: 'Sites próprios', prontoSemCredencial: false },
  { id: 'api_externa', label: 'APIs externas', prontoSemCredencial: false },
  { id: 'csv', label: 'Arquivos CSV', prontoSemCredencial: true },
  { id: 'webhook', label: 'Webhooks', prontoSemCredencial: true },
  { id: 'custom', label: 'Outras fontes', prontoSemCredencial: false },
]

export const FILTROS_VAZIOS: FiltrosPesquisa = {
  cidade: '',
  estado: '',
  segmento: '',
  palavraChave: '',
  bairro: '',
  cep: '',
  cnae: '',
  nomeEmpresa: '',
  site: '',
  instagram: '',
  facebook: '',
  googleMapsQuery: '',
  scoreMinimo: 70,
  temperaturaMinima: '',
  maxResultsPerCycle: 10,
  faixaFuncionarios: 'qualquer',
  pais: 'Brasil',
  abrangenciaGeografica: 'CIDADE',
  cidadesSelecionadas: [],
  cargos: [],
  operacao: '',
  campanha: '',
  produtos: [],
  banco: 'todos',
  cnpjConsulta: '',
  tipoBeneficiario: 'todos',
  idadeMinima: null,
  idadeMaxima: null,
  dataNascimentoInicial: '',
  dataNascimentoFinal: '',
  tipoBeneficio: '',
  especieBeneficio: '',
  situacaoBeneficio: '',
  beneficiosConsignaveis: 'todos',
  fontesHabilitadas: [],
  contextosSegmento: [],
  personFieldsRequested: [],
  contactFieldsRequested: [],
  tipoBusca: 'empresa',
  personSourcesHabilitadas: [],
  segmentoCustomNome: '',
  segmentoCustomCategoria: '',
  campaignContext: '',
  subsegment: '',
}

/** Intervalo padrão de auto-atualização (ms) para pesquisas ativas */
export const AUTO_REFRESH_MS = 90_000

/** Nesta etapa o Auto ON fica desligado até validarmos busca manual real. */
export const AUTO_SEARCH_ENABLED = false

export const SCORE_THRESHOLDS = {
  muitoQuente: 80,
  quente: 65,
  morno: 45,
} as const

export const DEFAULT_SCORE_MINIMO = 70
export const MAX_RESULTS_PER_CYCLE = 5000

export const JOB_MAX_ATTEMPTS = 5
export const JOB_LEASE_MS = 60_000

/** Limite diário default ao cadastrar fonte */
export const FONTE_LIMITE_DIARIO_DEFAULT = 100

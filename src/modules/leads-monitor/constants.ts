import type { FiltrosPesquisa, FontePesquisaTipo } from './types'

export const LEADS_MONITOR_VERSION = '1.2.0'

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

export const ESTADOS_BR = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
] as const

export const SEGMENTOS = [
  { id: 'inss', label: 'INSS / Aposentadoria' },
  { id: 'credito_clt', label: 'Crédito CLT' },
  { id: 'emprestimo', label: 'Empréstimo Pessoal' },
  { id: 'consignado', label: 'Consignado' },
  { id: 'fgts', label: 'FGTS' },
  { id: 'cartao', label: 'Cartão Benefício' },
  { id: 'empresa_b2b', label: 'Empresas B2B' },
  { id: 'corban', label: 'Correspondente Bancário' },
] as const

/** Catálogo de tipos de fonte (UI + seeds). */
export const FONTES_TIPOS: Array<{
  id: FontePesquisaTipo
  label: string
  /** true = pode buscar sem credencial externa (CSV local / webhook já V1.1). */
  prontoSemCredencial: boolean
}> = [
  { id: 'google_places', label: 'Google Places API', prontoSemCredencial: false },
  { id: 'google_maps', label: 'Google Maps', prontoSemCredencial: false },
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
}

/** Intervalo padrão de auto-atualização (ms) para pesquisas ativas */
export const AUTO_REFRESH_MS = 90_000

export const SCORE_THRESHOLDS = {
  quente: 75,
  morno: 45,
} as const

export const JOB_MAX_ATTEMPTS = 5
export const JOB_LEASE_MS = 60_000

/** Limite diário default ao cadastrar fonte */
export const FONTE_LIMITE_DIARIO_DEFAULT = 100

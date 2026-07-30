import type { FiltrosPesquisa } from './types'

export const LEADS_MONITOR_VERSION = '1.0.0'

/** Coleções Firestore sob empresas/{empresaId}/ */
export const COL_OPORTUNIDADES = 'leadsMonitorOportunidades'
export const COL_PESQUISAS = 'leadsMonitorPesquisas'

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

export const FILTROS_VAZIOS: FiltrosPesquisa = {
  cidade: '',
  estado: '',
  segmento: '',
  palavraChave: '',
}

/** Intervalo padrão de auto-atualização (ms) para pesquisas ativas */
export const AUTO_REFRESH_MS = 90_000

export const SCORE_THRESHOLDS = {
  quente: 75,
  morno: 45,
} as const

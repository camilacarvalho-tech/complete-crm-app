/**
 * Nexus Leads Monitor V1 — tipos do núcleo.
 * Fontes concretas vivem em connectors/ (não aqui).
 */

export type LeadMonitorStatus =
  | 'novo'
  | 'qualificado'
  | 'aprovado'
  | 'enviado_crm'
  | 'rejeitado'
  | 'duplicado'

export type LeadTemperatura = 'Quente' | 'Morno' | 'Frio'

export type TipoOportunidade = 'pessoa' | 'empresa'

export interface FiltrosPesquisa {
  cidade: string
  estado: string
  segmento: string
  palavraChave: string
}

export interface PesquisaSalva extends FiltrosPesquisa {
  id: string
  nome: string
  ativa: boolean
  intervaloMinutos: number
  ultimaExecucao?: unknown
  criadoEm?: unknown
  atualizadoEm?: unknown
  empresaId?: string
}

export interface LeadScoreResult {
  score: number
  temperatura: LeadTemperatura
  classificacao: string
  categoria?: string
  motivos: string[]
  origemScore: 'nexus_ai_heuristica' | 'nexus_ai_llm'
}

/** Documento persistido no Monitor (pós pipeline até CRM). */
export interface OportunidadeMonitor {
  id: string
  empresaId: string
  connectorId: string
  /** @deprecated use connectorId */
  origemFonte?: string
  origemLabel: string
  dedupeKey: string
  tipo: TipoOportunidade
  nome: string
  telefone?: string
  email?: string
  cidade: string
  estado: string
  segmento: string
  palavraChaveMatch?: string
  empresaNome?: string
  cnpj?: string
  consentimentoLgpd: boolean
  baseLegal: string
  observacoes?: string
  metadados?: Record<string, unknown>
  externalId?: string
  status: LeadMonitorStatus
  score: number
  temperatura: LeadTemperatura
  classificacao: string
  categoriaClassificacao?: string
  motivosScore: string[]
  origemScore: LeadScoreResult['origemScore']
  pesquisaId?: string
  crmClienteId?: string
  rejeitadoMotivo?: string
  encontradoEm?: unknown
  atualizadoEm?: unknown
  criadoEm?: unknown
}

export interface MonitorRunResult {
  encontrados: number
  novos: number
  duplicados: number
  fontes: string[]
}

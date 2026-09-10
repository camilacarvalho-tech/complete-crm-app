/**
 * Nexus Leads Monitor — tipos do núcleo (V1.2).
 * Fontes concretas vivem em connectors/ (não aqui).
 */

export type LeadMonitorStatus =
  | 'novo'
  | 'qualificado'
  | 'aprovado'
  | 'enviado_crm'
  | 'rejeitado'
  | 'duplicado'

export type LeadTemperatura = 'Muito quente' | 'Quente' | 'Morno' | 'Frio'

export type TipoOportunidade = 'pessoa' | 'empresa'

/** Tipos de fonte de pesquisa (cadastro + stubs / conectores reais). */
export type FontePesquisaTipo =
  | 'google_places'
  | 'google_maps'
  | 'gbp'
  | 'google_search'
  | 'instagram'
  | 'facebook_pages'
  | 'linkedin_companies'
  | 'site_proprio'
  | 'api_externa'
  | 'csv'
  | 'webhook'
  | 'custom'

export type FontePesquisaStatus = 'ativa' | 'inativa'

export type FonteHealthStatus =
  | 'ok'
  | 'degraded'
  | 'error'
  | 'needs_credentials'
  | 'idle'

export type SearchRunStatus =
  | 'queued'
  | 'running'
  | 'paused'
  | 'cancelled'
  | 'succeeded'
  | 'failed'

/** Filtros do Buscador Inteligente (V1.2 estende V1.1). */
export interface FiltrosPesquisa {
  cidade: string
  estado: string
  segmento: string
  palavraChave: string
  bairro?: string
  cep?: string
  cnae?: string
  nomeEmpresa?: string
  site?: string
  instagram?: string
  facebook?: string
  googleMapsQuery?: string
  scoreMinimo?: number
  temperaturaMinima?: LeadTemperatura | ''
  maxResultsPerCycle?: number
}

export interface PesquisaSalva extends FiltrosPesquisa {
  id: string
  nome: string
  /** Auto ON/OFF — nesta etapa o padrão é OFF. */
  ativa: boolean
  intervaloMinutos: number
  limitePorCiclo?: number
  scoreMinimo?: number
  temperaturaMinima?: LeadTemperatura | ''
  ultimaExecucao?: unknown
  proximaExecucao?: unknown
  encontrados?: number
  novos?: number
  duplicados?: number
  aprovados?: number
  criadoEm?: unknown
  atualizadoEm?: unknown
  empresaId?: string
}

/** Cadastro de fonte — `empresas/{id}/leadsMonitorFontes`. */
export interface FontePesquisa {
  id: string
  empresaId: string
  nome: string
  tipo: FontePesquisaTipo
  status: FontePesquisaStatus
  limiteDiario: number
  usadoHoje: number
  ultimaSyncEm?: unknown
  errosRecentes?: Array<{ em: unknown; mensagem: string }>
  health: FonteHealthStatus
  /** Config não-secreta (URL, query template, mapeamento). */
  config?: Record<string, unknown>
  /** Apontador de secret — nunca plaintext. */
  secretRef?: string | null
  connectorId?: string
  connectorApiVersion?: number
  criadoEm?: unknown
  atualizadoEm?: unknown
}

export interface SearchRunProgresso {
  percent: number
  etapa: string
  fontesConcluidas: number
  fontesTotal: number
  encontrados: number
  novos: number
  duplicados: number
  tempoMs: number
  etaMs?: number
}

/** Histórico / progresso — `empresas/{id}/leadsMonitorSearchRuns`. */
export interface SearchRun {
  id: string
  empresaId: string
  filtros: FiltrosPesquisa
  fontesIds: string[]
  usuarioId?: string
  usuarioNome?: string
  status: SearchRunStatus
  progresso: SearchRunProgresso
  resultadoResumo?: {
    encontrados: number
    novos: number
    duplicados: number
    fontes: string[]
    tempoMs: number
  }
  jobId?: string
  lastError?: string | null
  criadoEm?: unknown
  finalizadoEm?: unknown
  atualizadoEm?: unknown
}

export interface LeadScoreResult {
  score: number
  temperatura: LeadTemperatura
  classificacao: string
  categoria?: string
  motivos: string[]
  origemScore: 'nexus_ai_heuristica' | 'nexus_ai_llm'
  /** V1.2 — sugestão de próximo contato (IA / heurística). */
  sugestaoContato?: string
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
  website?: string
  endereco?: string
  cep?: string
  placeId?: string
  dominio?: string
  cnpjValidado?: boolean
  vezesEncontrada?: number
  fontes?: string[]
  primeiraDescoberta?: unknown
  ultimaDescoberta?: unknown
  status: LeadMonitorStatus
  score: number
  temperatura: LeadTemperatura
  classificacao: string
  categoriaClassificacao?: string
  motivosScore: string[]
  origemScore: LeadScoreResult['origemScore']
  sugestaoContato?: string
  pesquisaId?: string
  searchRunId?: string
  fonteId?: string
  crmClienteId?: string
  rejeitadoMotivo?: string
  encontradoEm?: unknown
  atualizadoEm?: unknown
  criadoEm?: unknown
  dadosEnriquecidos?: {
    telefoneFormatado?: string
    razaoSocial?: string
    nomeFantasia?: string
    situacaoCadastral?: string
    cnaePrincipal?: string
    cnaesSecundarios?: string[]
    porteEmpresa?: string
    dataAbertura?: string
    cnpjValidado?: boolean
    scoreEnriquecimento?: number
    fonteEnriquecimento?: string[]
    observacao?: string
  }
}

export interface MonitorRunResult {
  encontrados: number
  novos: number
  duplicados: number
  fontes: string[]
  enriquecidos?: number
  rejeitados?: number
  scoreMedio?: number
  quentes?: number
  muitoQuentes?: number
  tempoMs?: number
  erros?: string[]
}

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
  | 'openstreetmap'
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
  | 'optional_indisponivel'
  | 'unavailable'
  | 'skipped'

export type SearchRunStatus =
  | 'queued'
  | 'running'
  | 'paused'
  | 'cancelled'
  | 'succeeded'
  | 'failed'

export type FaixaFuncionarios =
  | 'qualquer'
  | '1-10'
  | '11-50'
  | '51-100'
  | '101-500'
  | '501-1000'
  | '1001-5000'
  | '5001-10000'
  | '10001-50000'
  | '50000+'
  | '100+'
  | '100-499'
  | '500-999'
  | '1000-4999'
  | '5000-9999'
  | '10000-49999'

export type BeneficiosConsignaveis = 'todos' | '1' | '2' | '3' | '4' | '5+'

export type EmployeeCountStatus = 'nao_informada' | 'faixa_publica'

export type AbrangenciaGeografica = 'CIDADE' | 'ESTADO' | 'BRASIL'

export type OperacaoMonitor = 'INSS' | 'CREDITO_CLT' | 'FGTS' | 'EMPRESTIMOS' | 'SERVIDOR' | 'OUTROS' | ''

export type TipoBeneficiarioInss = 'todos' | 'aposentado' | 'pensionista' | 'outro'

/** Filtros do Buscador Inteligente (V1.2 estende V1.1). */
export interface FiltrosPesquisa {
  cidade: string
  cidadesSelecionadas?: string[]
  estado: string
  segmento: string
  palavraChave: string
  cargos?: string[]
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
  faixaFuncionarios?: FaixaFuncionarios
  pais?: string
  abrangenciaGeografica?: AbrangenciaGeografica
  operacao?: OperacaoMonitor
  campanha?: string
  produtos?: string[]
  banco?: string
  cnpjConsulta?: string
  tipoBeneficiario?: TipoBeneficiarioInss
  idadeMinima?: number | null
  idadeMaxima?: number | null
  dataNascimentoInicial?: string
  dataNascimentoFinal?: string
  tipoBeneficio?: string
  especieBeneficio?: string
  situacaoBeneficio?: string
  beneficiosConsignaveis?: BeneficiosConsignaveis
  /** @deprecated substituído por beneficiosConsignaveis */
  perfilTomador?: string
  /**
   * Fontes de captura da campanha/busca.
   * Vazio = todas as fontes runnable (compatibilidade).
   * Ids de UI: openstreetmap | google_places | csv | webhook | api_externa
   */
  fontesHabilitadas?: string[]
  /** Subcategorias/produtos do card de segmento (não apaga mercados/empresas históricos). */
  contextosSegmento?: string[]
  segmentoCustomNome?: string
  segmentoCustomCategoria?: string
}

export interface PesquisaSalva extends FiltrosPesquisa {
  id: string
  nome: string
  descricao?: string
  objetivo?: string
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
  origemDado?: string
  fonteDado?: string
  finalidadeTratamento?: string
  coletadoEm?: unknown
  retentionPolicy?: string
  retentionUntil?: unknown
  retentionStatus?: string
  observacoes?: string
  metadados?: Record<string, unknown>
  externalId?: string
  website?: string
  endereco?: string
  bairro?: string
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
  pesquisaId?: string | null
  employeeCount?: number | null
  employeeCountRange?: string | null
  employeeCountFonte?: string | null
  employeeCountStatus?: EmployeeCountStatus
  searchRunId?: string
  fonteId?: string
  crmClienteId?: string
  envioCrmErro?: string | null
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

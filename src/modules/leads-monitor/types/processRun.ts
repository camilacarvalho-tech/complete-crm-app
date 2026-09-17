export type ProcessRunStatus =
  | 'aguardando'
  | 'processando'
  | 'pausado'
  | 'concluido'
  | 'concluido_com_erros'
  | 'erro'
  | 'cancelado'

export type ProcessRunTipo = 'busca' | 'importacao'

export type ProcessRecordStatus = 'pendente' | 'processado' | 'duplicado' | 'invalido' | 'erro'

export const PROCESS_STAGES = [
  'Recebimento',
  'Normalização',
  'Validação',
  'Deduplicação',
  'Enriquecimento',
  'Pessoas',
  'Qualificação',
  'Finalização',
] as const

export interface ProcessRun {
  id: string
  empresaId: string
  nome: string
  tipo: ProcessRunTipo
  origem: string
  status: ProcessRunStatus
  total: number
  processados: number
  validos: number
  invalidos: number
  duplicados: number
  enriquecidos: number
  pessoasEncontradas: number
  qualificados: number
  aprovados: number
  rejeitados: number
  erros: number
  etapaAtual: string
  progresso: number
  cursor: number
  searchRunId?: string | null
  abrangenciaGeografica?: string
  geoUfs?: string[]
  geoUfIndex?: number
  geoCities?: string[]
  geoCityIndex?: number
  cidadesTotal?: number
  cidadesProcessadas?: number
  cidadesErro?: number
  cidadeAtual?: string | null
  geoBairro?: string | null
  geoCep?: string | null
  filtrosSnapshot?: Record<string, unknown>
  mapping?: Record<string, string>
  arquivoNome?: string
  lastError?: string | null
  usuarioId?: string | null
  usuarioNome?: string | null
  startedAt?: unknown
  updatedAt?: unknown
  completedAt?: unknown
  criadoEm?: unknown
}

export interface ProcessRecord {
  id: string
  empresaId: string
  processRunId: string
  rowIndex: number
  raw: Record<string, string>
  mapped: Record<string, string>
  status: ProcessRecordStatus
  validation?: string
  opportunityId?: string | null
  duplicateOf?: string | null
  duplicateReason?: string | null
  lastError?: string | null
  criadoEm?: unknown
  atualizadoEm?: unknown
}

export const CSV_TARGET_FIELDS = [
  'nome',
  'cpf',
  'cnpj',
  'telefone',
  'whatsapp',
  'email',
  'empresa',
  'razaoSocial',
  'nomeFantasia',
  'cargo',
  'cidade',
  'uf',
  'endereco',
  'segmento',
  'site',
  'observacoes',
  'dataNascimento',
  'idade',
  'tipoBeneficiario',
  'tipoBeneficio',
  'especieBeneficio',
  'situacaoBeneficio',
  'dataInicioBeneficio',
  'banco',
  'produto',
  'beneficiosConsignaveis',
] as const

export type CsvTargetField = (typeof CSV_TARGET_FIELDS)[number]

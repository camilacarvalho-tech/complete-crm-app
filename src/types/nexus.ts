import { ATTENDANCE_STAGES, LEAD_ORIGINS } from '../catalog/crmCatalog'

export const LEAD_SOURCES = LEAD_ORIGINS.map((o) => o.code)

export type LeadSource = (typeof LEAD_SOURCES)[number]

export const PIPELINE_STAGES = ATTENDANCE_STAGES.map((s) => ({ id: s.id, label: s.label }))

export type PipelineStageId = (typeof PIPELINE_STAGES)[number]['id']

export const DOCUMENT_CATEGORIES = [
  'RG',
  'CPF',
  'CNH',
  'Comprovante de residência',
  'Comprovante de renda',
  'Extrato',
  'Contrato',
  'Proposta',
  'Documentos bancários',
  'Documentos de portabilidade',
  'Outros',
] as const

export const MODALIDADES = [
  'FGTS',
  'INSS',
  'CLT',
  'Consignado',
  'Portabilidade',
  'Refinanciamento',
  'Margem',
  'Rating',
  'SIAPE',
  'Servidor Municipal',
] as const

export const USER_ROLES = [
  'MASTER',
  'SUPER_ADMIN',
  'ADMIN',
  'GESTOR',
  'SUPERVISOR',
  'VENDEDOR',
  'ATENDENTE',
  'OPERADOR',
  'FINANCEIRO',
  'MARKETING',
  'CONSULTA',
] as const

export type UserRole = (typeof USER_ROLES)[number]

export interface Attribution {
  source?: LeadSource | string
  campaign_id?: string
  ad_id?: string
  adset_id?: string
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_content?: string
}

export interface NexusCliente extends Attribution {
  id: string
  tenant_id?: string
  nome?: string
  cpf?: string
  rg?: string
  dataNascimento?: string
  telefone?: string
  whatsapp?: string
  email?: string
  cep?: string
  pais?: string
  estado?: string
  cidade?: string
  bairro?: string
  endereco?: string
  numero?: string
  complemento?: string
  profissao?: string
  renda?: string
  banco?: string
  agencia?: string
  conta?: string
  chavePix?: string
  observacoes?: string
  tags?: string[]
  modalidades?: string[]
  modalidade?: string
  status?: string
  pipeline?: string
  pipelineStage?: PipelineStageId | string
  origem?: string
  origemLead?: string
  origemDetalhe?: string
  fonte?: string
  fonteId?: string
  dataEntrada?: string
  horaEntrada?: string
  canalEntrada?: string
  historicoOrigens?: Array<Record<string, unknown>>
  campanhaId?: string
  campanhaNome?: string
  estadoOrigem?: string
  cidadeOrigem?: string
  convenio?: string
  subproduto?: string
  produto?: string
  equipe?: string
  campanha?: string
  atendente?: string
  primeiroContatoEm?: string
  ultimoContatoEm?: string
  ultimaInteracao?: string
  proximoFollowUp?: string
  consentimento?: string
  responsavel?: string
  responsavelId?: string
  score?: number
  temperatura?: string
  empresaNome?: string
  empresaCnpj?: string
  cargo?: string
  relacaoEmpresa?: string
  fontePesquisa?: string
  fonteUrl?: string
  linkedinUrl?: string
  instagramUrl?: string
  facebookUrl?: string
  youtubeUrl?: string
  tiktokUrl?: string
  twitterUrl?: string
  leadsMonitorPersonId?: string
  leadsMonitorOpportunityId?: string
  leadId?: string
  erpId?: string | null
  externalId?: string
  origin?: string
  valorLiberado?: number | null
  valorParcela?: number | null
  quantidadeParcelas?: number | null
  taxa?: number | null
  bancoOferta?: string
  dataConsultaCredito?: string
  statusConsultaCredito?: string
  camposExtras?: Record<string, unknown>
  criadoEm?: unknown
  atualizadoEm?: unknown
  created_at?: unknown
}

export type NexusRecord = { id: string; [key: string]: unknown }

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
  criadoEm?: unknown
  atualizadoEm?: unknown
  created_at?: unknown
}

export type NexusRecord = { id: string; [key: string]: unknown }

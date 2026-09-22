import type { CanonicalOrigin } from '../events/eventTypes.ts'

export type { CanonicalOrigin, IntegrationEvent } from '../events/eventTypes.ts'

export type LeadKind = 'empresa' | 'pessoa' | 'cliente'

export interface ErpLeadPayload {
  leadId: string
  source: string
  origin: CanonicalOrigin
  campaignId?: string
  externalId?: string
  erpId?: string | null
  status: string
  kind: LeadKind
  nome?: string
  telefone?: string
  whatsapp?: string
  email?: string
  cidade?: string
  estado?: string
}

export interface CrmLeadPayload {
  leadId: string
  source: string
  origin: CanonicalOrigin
  campaignId?: string
  externalId?: string
  crmId?: string
  status: string
  kind: LeadKind
  nome: string
  telefone?: string
  whatsapp?: string
  segmento?: string
  produto?: string
  operacao?: string
  cidade?: string
  estado?: string
  observacoes?: string
  score?: number
  classificacao?: string
  dataEntrada?: string
}

export interface CrmClientPayload extends CrmLeadPayload {
  crmId: string
  empresaNome?: string
}

export interface CrmConversationPayload {
  clienteId: string
  conversaId?: string
  titulo?: string
  telefone?: string
  origemLead: CanonicalOrigin
  campanhaId?: string
  campanhaNome?: string
  produto?: string
  operacao?: string
  cidade?: string
  estado?: string
}

export interface LeadSyncResult {
  ok: boolean
  duplicated: boolean
  alreadySynced: boolean
  clienteId?: string
  conversaId?: string
  createdCliente: boolean
  createdConversa: boolean
  queued: boolean
  code:
    | 'CRM_SYNC_SUCCESS'
    | 'CRM_SYNC_FAILED'
    | 'LEAD_ALREADY_SYNCED'
    | 'CRM_QUEUE_ADDED'
    | 'CRM_PAUSED'
  error?: string
  attempt: number
}

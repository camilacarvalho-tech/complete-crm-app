/** Origens canônicas do Nexus (CRM + ERP + Monitor). */
export const CANONICAL_ORIGINS = [
  'leads_monitor',
  'trafego_pago',
  'disparo_massa',
  'planilha_csv',
  'landing_page',
  'whatsapp',
  'webhook',
  'importacao',
  'manual',
  'outros',
] as const

export type CanonicalOrigin = (typeof CANONICAL_ORIGINS)[number]

export const CRM_TO_ERP_EVENTS = [
  'lead_created',
  'lead_updated',
  'lead_assigned',
  'lead_status_changed',
  'conversation_started',
  'conversation_finished',
  'client_created',
  'client_updated',
  'sale_created',
  'followup_created',
] as const

export type CrmToErpEventType = (typeof CRM_TO_ERP_EVENTS)[number]

export const ERP_TO_CRM_EVENTS = [
  'campaign_created',
  'contact_imported',
  'message_received',
  'message_sent',
  'campaign_contacted',
  'campaign_finished',
] as const

export type ErpToCrmEventType = (typeof ERP_TO_CRM_EVENTS)[number]

export type IntegrationEventType = CrmToErpEventType | ErpToCrmEventType

export type IntegrationEventDirection = 'crm_to_erp' | 'erp_to_crm'

export interface IntegrationEvent {
  id?: string
  empresaId: string
  type: IntegrationEventType
  direction: IntegrationEventDirection
  idempotencyKey: string
  payload: Record<string, unknown>
  status: 'recorded' | 'applied' | 'ignored'
  createdAt?: unknown
  processedAt?: unknown
}

export function directionForType(type: IntegrationEventType): IntegrationEventDirection {
  return (CRM_TO_ERP_EVENTS as readonly string[]).includes(type) ? 'crm_to_erp' : 'erp_to_crm'
}

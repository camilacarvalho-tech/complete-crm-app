/**
 * Adapter NX ERP — campanhas, templates Meta e disparo.
 * Não inventa endpoint. Enquanto a API do ERP não estiver ligada, todas as
 * operações retornam not_configured. O motor de envio continua no ERP, não no CRM.
 */
import type { Health } from './providers'

export type NxErpSyncStatus = 'NOT_CONFIGURED' | 'NOT_SYNCED' | 'SYNCING' | 'SYNCED' | 'ERROR'

export interface NxErpTemplate {
  id: string
  name: string
  category?: string
  language?: string
  status: string
}

export interface NxErpCampaignPayload {
  campaignId: string
  campaignName: string
  product?: string
  operation?: string
  segment?: string
  templateId?: string
  origin?: string
  source?: string
  subsegment?: string
  contacts?: Array<Record<string, unknown>>
  scores?: number[]
  leads: Array<Record<string, unknown>>
}

export interface NxErpCampaignAdapter {
  healthCheck(): Promise<Health>
  createCampaign(payload: NxErpCampaignPayload): Promise<{ ok: false; status: NxErpSyncStatus; message: string; erpCampaignId?: string }>
  syncLeads(payload: NxErpCampaignPayload): Promise<{ ok: false; status: NxErpSyncStatus; message: string }>
  getCampaign(): Promise<{ ok: false; status: NxErpSyncStatus; message: string }>
  getTemplates(): Promise<{ ok: false; status: NxErpSyncStatus; templates: NxErpTemplate[]; message: string }>
  prepareCampaign(): Promise<{ ok: false; status: NxErpSyncStatus; message: string }>
  sendCampaign(): Promise<{ ok: false; status: NxErpSyncStatus; message: string }>
  getCampaignStatus(): Promise<{ ok: false; status: NxErpSyncStatus; message: string }>
  receiveWebhook(): Promise<Health>
  handleInboundMessage(): Promise<{ ok: false; status: NxErpSyncStatus; message: string }>
}

const MSG =
  'NX ERP de disparo/templates Meta não está conectado neste CRM. Não há URL/credencial de campanha configurada. O CRM não envia WhatsApp por conta própria — use o motor do ERP quando a API for ligada.'

const fail = async () => ({ ok: false as const, status: 'NOT_CONFIGURED' as NxErpSyncStatus, message: MSG })

export const UnconfiguredNxErpCampaignAdapter: NxErpCampaignAdapter = {
  healthCheck: async () => ({ status: 'not_configured', message: MSG }),
  createCampaign: fail,
  syncLeads: fail,
  getCampaign: fail,
  getTemplates: async () => ({ ok: false as const, status: 'NOT_CONFIGURED' as NxErpSyncStatus, templates: [], message: MSG }),
  prepareCampaign: fail,
  sendCampaign: fail,
  getCampaignStatus: fail,
  receiveWebhook: async () => ({ status: 'not_configured', message: MSG }),
  handleInboundMessage: fail,
}

export function getNxErpCampaignAdapter(): NxErpCampaignAdapter {
  return UnconfiguredNxErpCampaignAdapter
}

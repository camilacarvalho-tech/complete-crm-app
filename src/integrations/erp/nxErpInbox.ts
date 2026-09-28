/**
 * Mapeia o que o NX ERP já envia (wamid, status Meta, eventos).
 * Não cria status nem chama a Meta.
 */
import type { ErpToCrmEventType } from '../events/eventTypes'

/** Status que o NX ERP ou a Meta já devolvem. Qualquer outro é ignorado. */
export const NX_ERP_STATUS = ['aceito', 'falha', 'enviado', 'sent', 'delivered', 'read', 'failed'] as const

export type NxErpStatus = (typeof NX_ERP_STATUS)[number]

const STATUS_LABEL: Record<NxErpStatus, string> = {
  aceito: 'aceita pelo ERP',
  falha: 'falhou',
  enviado: 'enviada à Meta',
  sent: 'enviada à Meta',
  delivered: 'entregue',
  read: 'lida',
  failed: 'falhou',
}

export function nxErpStatus(value: unknown): NxErpStatus | null {
  const raw = String(value || '').trim().toLowerCase()
  return (NX_ERP_STATUS as readonly string[]).includes(raw) ? (raw as NxErpStatus) : null
}

export function nxErpStatusLabel(value: unknown): string | null {
  const status = nxErpStatus(value)
  return status ? STATUS_LABEL[status] : null
}

export interface NxErpInboundMessage {
  messageId: string
  phone: string
  whatsapp: string
  nome: string
  message: string
  messageType: string
  timestamp: string
  wamid: string
  conversa: string
  contato: string
  origin: string
  source: string
  campaignId: string
  campanhaNome: string
  disparoId: string
  templateId: string
  produto: string
  status: NxErpStatus | null
}

export function inboundIdempotencyKey(body: Record<string, unknown>): string {
  return String(body.wamid || body.message_id || body.messageId || body.mensagem_id || '').trim()
}

export function mapInboundMessage(body: Record<string, unknown>): NxErpInboundMessage {
  const key = inboundIdempotencyKey(body)
  const phone = String(body.telefone || body.phone || body.whatsapp || '').trim()
  return {
    messageId: key,
    phone,
    whatsapp: String(body.whatsapp || body.telefone || body.phone || '').trim(),
    nome: String(body.nome || body.nome_contato || '').trim(),
    message: String(body.mensagem || body.message || body.texto || body.text || '').trim(),
    messageType: String(body.tipo || body.messageType || 'texto').trim() || 'texto',
    timestamp: String(body.timestamp || body.data_hora || body.dataHora || '').trim(),
    wamid: String(body.wamid || '').trim(),
    conversa: String(body.conversa || body.conversa_id || body.erp_conversa_id || '').trim(),
    contato: String(body.contato || body.contato_id || '').trim(),
    origin: String(body.origem || body.origin || 'whatsapp').trim() || 'whatsapp',
    source: 'NX_ERP',
    campaignId: String(body.campanhaId || body.campanha_id || body.campaignId || '').trim(),
    campanhaNome: String(body.campanhaNome || body.campanha_nome || body.campaignName || '').trim(),
    disparoId: String(body.disparoId || body.disparo_id || '').trim(),
    templateId: String(body.template || body.templateId || '').trim(),
    produto: String(body.produto || '').trim(),
    status: nxErpStatus(body.status),
  }
}

const CAMPAIGN_EVENT: Record<string, ErpToCrmEventType> = {
  campanha_criada: 'campaign_created',
  campaign_created: 'campaign_created',
  disparo_iniciado: 'campaign_contacted',
  campaign_contacted: 'campaign_contacted',
  disparo_finalizado: 'campaign_finished',
  campaign_finished: 'campaign_finished',
  mensagem_enviada: 'message_sent',
  message_sent: 'message_sent',
  mensagem_entregue: 'message_sent',
  mensagem_lida: 'message_sent',
  mensagem_falhou: 'message_sent',
  resposta_cliente: 'message_received',
  message_received: 'message_received',
  campanha_envio: 'message_sent',
}

export function mapCampaignEvent(tipo: string): ErpToCrmEventType | null {
  return CAMPAIGN_EVENT[String(tipo || '').trim().toLowerCase()] || null
}

export function alreadySeen(known: Iterable<string>, key: string): boolean {
  const id = key.trim()
  if (!id) return false
  for (const item of known) {
    if (item === id) return true
  }
  return false
}

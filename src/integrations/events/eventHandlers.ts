/**
 * Handlers ERP → CRM. Sem API inventada: aplica o que já existe no CRM
 * (erpInbound / Chat / campanhas) quando o evento chegar.
 */
import { collection, doc, getDocs, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore'
import { db } from '../../firebase'
import { handleInboundErpMessage, type InboundErpPayload } from '../../lib/inboundErpMessage'
import { originCode } from '../../catalog/crmCatalog'
import { markIntegrationEventApplied, subscribeIntegrationEvents, COL_CRM_ERP_EVENTS } from './eventBus'
import type { ErpToCrmEventType, IntegrationEvent } from './eventTypes'

export async function handleErpToCrmEvent(event: IntegrationEvent): Promise<void> {
  if (event.direction !== 'erp_to_crm') return
  const type = event.type as ErpToCrmEventType
  const p = event.payload || {}
  const empresaId = event.empresaId

  if (type === 'message_received') {
    await handleInboundErpMessage(empresaId, {
      messageId: String(p.messageId || event.idempotencyKey),
      phone: String(p.phone || ''),
      whatsapp: String(p.whatsapp || p.phone || ''),
      clientId: String(p.clientId || p.crmId || ''),
      leadId: String(p.leadId || ''),
      campaignId: String(p.campaignId || ''),
      erpCampaignId: String(p.erpCampaignId || p.erpId || ''),
      message: String(p.message || p.text || ''),
      messageType: String(p.messageType || 'texto'),
      source: String(p.source || 'NX_ERP'),
      direction: 'INBOUND',
    } satisfies InboundErpPayload)
    await markIntegrationEventApplied(empresaId, event.id || event.idempotencyKey, 'applied')
    return
  }

  if (type === 'message_sent') {
    await markIntegrationEventApplied(empresaId, event.id || event.idempotencyKey, 'applied')
    return
  }

  if (type === 'campaign_created' || type === 'campaign_contacted' || type === 'campaign_finished') {
    const campaignId = String(p.campaignId || p.erpCampaignId || '')
    if (campaignId) {
      const col = collection(db, 'empresas', empresaId, 'campanhas')
      const snap = await getDocs(query(col, where('campaignId', '==', campaignId)))
      const hit = snap.docs[0]
      const patch = {
        empresaId,
        erpId: p.erpId || p.erpCampaignId || null,
        erpSyncStatus: type === 'campaign_finished' ? 'SYNCED' : 'SYNCING',
        atualizadoEm: serverTimestamp(),
        ...(type === 'campaign_finished' ? { status: 'finalizada' } : {}),
      }
      if (hit) await updateDoc(hit.ref, patch)
      else {
        await setDoc(doc(col, campaignId), {
          ...patch,
          campaignId,
          nome: String(p.campaignName || campaignId),
          origem: originCode(String(p.origin || p.source || 'leads_monitor')),
          origin: originCode(String(p.origin || p.source || 'leads_monitor')),
          source: originCode(String(p.source || p.origin || 'leads_monitor')),
          criadoEm: serverTimestamp(),
        })
      }
    }
    await markIntegrationEventApplied(empresaId, event.id || event.idempotencyKey, 'applied')
    return
  }

  if (type === 'contact_imported') {
    await markIntegrationEventApplied(empresaId, event.id || event.idempotencyKey, 'ignored')
    return
  }

  await markIntegrationEventApplied(empresaId, event.id || event.idempotencyKey, 'ignored')
}

export function registerErpEventHandlers(): () => void {
  return subscribeIntegrationEvents((ev) => {
    if (ev.direction === 'erp_to_crm') void handleErpToCrmEvent(ev)
  })
}

/** Processa eventos ERP→CRM gravados em empresas/{id}/crmErpEvents (sem jobQueue). */
export async function drainErpToCrmEvents(empresaId: string): Promise<number> {
  const col = collection(db, 'empresas', empresaId, COL_CRM_ERP_EVENTS)
  const snap = await getDocs(query(col, where('status', '==', 'recorded')))
  let n = 0
  for (const d of snap.docs) {
    const data = d.data() as IntegrationEvent
    if (data.direction !== 'erp_to_crm') continue
    try {
      await handleErpToCrmEvent({ ...data, id: d.id })
      n += 1
    } catch {
      await markIntegrationEventApplied(empresaId, d.id, 'ignored')
    }
  }
  return n
}

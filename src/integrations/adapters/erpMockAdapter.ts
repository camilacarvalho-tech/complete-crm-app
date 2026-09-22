/**
 * Adapter mock do NX ERP — sem WhatsApp/SMS/Meta.
 * Health nunca marca CONNECTED. Chaves só no backend.
 */
import type { ErpLeadPayload } from '../crm/types'
import { INTEGRATION_LOG } from '../crm/syncLog'
import { interpretErpHealth, withCheckedAt } from '../erp/connectionStatus'
import type { ErpCampaignAdapter, ErpMockRecord } from './erpTypes'

const inbox: ErpMockRecord[] = []

export type { ErpCampaignAdapter, ErpMockRecord }

export const erpMockAdapter: ErpCampaignAdapter = {
  async healthCheck() {
    return withCheckedAt(
      interpretErpHealth({
        enabled: false,
        urlConfigured: false,
        keyConfigured: false,
        healthPathConfigured: false,
      })
    )
  },
  async receiveLead(payload) {
    const dup = inbox.some((r) => r.leadId === payload.leadId)
    if (dup) return { ok: true, duplicated: true, message: INTEGRATION_LOG.LEAD_ALREADY_SYNCED }
    inbox.push({
      leadId: payload.leadId,
      origin: payload.origin,
      receivedAt: new Date().toISOString(),
      payload,
    })
    return { ok: true, duplicated: false, message: INTEGRATION_LOG.ERP_SYNC_SUCCESS }
  },
  listReceived() {
    return [...inbox]
  },
}

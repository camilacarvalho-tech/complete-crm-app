import type { ErpLeadPayload } from '../crm/types'
import type { ErpHealthResult } from '../erp/connectionStatus'

export interface ErpMockRecord {
  leadId: string
  origin: string
  receivedAt: string
  payload: ErpLeadPayload
}

/** Interface compartilhada: mock e NX ERP real. O erpBridge não escolhe o adapter. */
export interface ErpCampaignAdapter {
  healthCheck(): Promise<ErpHealthResult>
  receiveLead(payload: ErpLeadPayload): Promise<{ ok: boolean; duplicated: boolean; message: string }>
  listReceived(): ErpMockRecord[]
}

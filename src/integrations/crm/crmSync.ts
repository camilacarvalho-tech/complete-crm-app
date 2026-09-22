import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '../../firebase'
import { originCode } from '../../catalog/crmCatalog'
import { publishIntegrationEvent } from '../events/eventBus'
import { getNxErpCampaignAdapter } from '../nxErpCampaign'
import type { CanonicalOrigin } from '../events/eventTypes'

export const COL_CRM_ERP_SYNC = 'crmErpSync'

export interface CrmErpLink {
  leadId: string
  source: string
  origin: CanonicalOrigin | string
  campaignId?: string
  externalId?: string
  crmId: string
  erpId?: string | null
  status: string
  kind: 'empresa' | 'pessoa' | 'cliente'
  createdAt?: unknown
  updatedAt?: unknown
  empresaId: string
}

function syncDocId(kind: string, leadId: string) {
  return `${kind}:${leadId}`.replace(/[/#]/g, '_').slice(0, 700)
}

export async function upsertCrmErpSync(link: CrmErpLink): Promise<void> {
  const id = syncDocId(link.kind, link.leadId)
  const ref = doc(db, 'empresas', link.empresaId, COL_CRM_ERP_SYNC, id)
  const prev = await getDoc(ref)
  await setDoc(
    ref,
    {
      empresaId: link.empresaId,
      leadId: link.leadId,
      source: link.source,
      origin: originCode(String(link.origin || 'leads_monitor')),
      campaignId: link.campaignId || '',
      externalId: link.externalId || link.leadId,
      crmId: link.crmId,
      erpId: link.erpId || null,
      status: link.status,
      kind: link.kind,
      updatedAt: serverTimestamp(),
      ...(prev.exists() ? {} : { createdAt: serverTimestamp() }),
    },
    { merge: true }
  )
}

export async function afterCrmLeadSynced(opts: {
  empresaId: string
  leadId: string
  crmId: string
  kind: 'empresa' | 'pessoa'
  jaExistia: boolean
  campaignId?: string
  origin?: string
}): Promise<void> {
  const origin = originCode(String(opts.origin || 'leads_monitor'))
  await upsertCrmErpSync({
    empresaId: opts.empresaId,
    leadId: opts.leadId,
    crmId: opts.crmId,
    kind: opts.kind,
    origin,
    source: origin,
    campaignId: opts.campaignId,
    externalId: opts.leadId,
    status: 'synced_crm',
  })
  await publishIntegrationEvent({
    empresaId: opts.empresaId,
    type: opts.jaExistia ? 'lead_updated' : 'lead_created',
    idempotencyKey: `${opts.jaExistia ? 'lead_updated' : 'lead_created'}:${opts.leadId}`,
    payload: {
      leadId: opts.leadId,
      crmId: opts.crmId,
      origin,
      campaignId: opts.campaignId || '',
      kind: opts.kind,
    },
  })
  await publishIntegrationEvent({
    empresaId: opts.empresaId,
    type: opts.jaExistia ? 'client_updated' : 'client_created',
    idempotencyKey: `${opts.jaExistia ? 'client_updated' : 'client_created'}:${opts.crmId}`,
    payload: { leadId: opts.leadId, crmId: opts.crmId, origin },
  })
  await publishIntegrationEvent({
    empresaId: opts.empresaId,
    type: 'conversation_started',
    idempotencyKey: `conversation_started:${opts.crmId}`,
    payload: { leadId: opts.leadId, crmId: opts.crmId, origin },
  })
  void getNxErpCampaignAdapter()
  const { writeIntegrationLog, INTEGRATION_LOG } = await import('./syncLog')
  await writeIntegrationLog({
    empresaId: opts.empresaId,
    code: opts.jaExistia ? INTEGRATION_LOG.LEAD_ALREADY_SYNCED : INTEGRATION_LOG.CRM_SYNC_SUCCESS,
    leadId: opts.leadId,
    origin,
    operation: 'afterCrmLeadSynced',
    result: opts.jaExistia ? 'LEAD_ALREADY_SYNCED' : 'CRM_SYNC_SUCCESS',
  })
}

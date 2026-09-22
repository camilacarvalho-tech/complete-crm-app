/**
 * Ponte NX ERP ↔ Nexus CRM ↔ Leads Monitor.
 * Reutiliza sendToCrm, sendPersonToCrm, garantirConversaFila e origens canônicas.
 * Não duplica jobQueue, enrichmentEngine nem a Central de Robôs.
 */
import { addDoc, collection, doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '../../firebase'
import { originCode } from '../../catalog/crmCatalog'
import { garantirConversaFila } from '../../lib/garantirConversaFila'
import { eventoOrigem } from '../../lib/origemLead'
import { assertRobotNotPaused } from '../../modules/leads-monitor/services/robotControl'
import { enviarOportunidadeParaCrm } from '../../modules/leads-monitor/pipeline/sendToCrm'
import { enviarPessoaParaCrm } from '../../modules/leads-monitor/pipeline/sendPersonToCrm'
import {
  applyClienteMerge,
  asText,
  findExistingCliente,
} from '../../modules/leads-monitor/pipeline/crmClientePayload'
import type { OportunidadeMonitor } from '../../modules/leads-monitor/types'
import type { CompanyPeopleResearch } from '../../modules/leads-monitor/types/peopleResearch'
import { publishIntegrationEvent } from '../events/eventBus'
import { afterCrmLeadSynced, COL_CRM_ERP_SYNC, upsertCrmErpSync, type CrmErpLink } from './crmSync'
import { writeIntegrationLog, INTEGRATION_LOG } from './syncLog'

export { afterCrmLeadSynced, COL_CRM_ERP_SYNC, upsertCrmErpSync, type CrmErpLink }

export async function sendLeadToCrm(opts: {
  empresaId: string
  kind: 'empresa' | 'pessoa'
  oportunidade?: OportunidadeMonitor
  person?: CompanyPeopleResearch
  company?: OportunidadeMonitor
  actor?: { usuarioId?: string; usuarioNome?: string }
}): Promise<{ clienteId: string; jaExistia: boolean }> {
  const leadId = opts.kind === 'pessoa' ? opts.person?.id : opts.oportunidade?.id
  await writeIntegrationLog({
    empresaId: opts.empresaId,
    code: INTEGRATION_LOG.CRM_SYNC_STARTED,
    leadId,
    origin: 'leads_monitor',
    operation: 'sendLeadToCrm',
  })
  try {
    await assertRobotNotPaused(opts.empresaId, 'crm', 'Robô CRM pausado — retome na Central de Robôs para enviar.')
    let result: { clienteId: string; jaExistia: boolean }
    if (opts.kind === 'pessoa') {
      if (!opts.person || !opts.company) throw new Error('Envio de pessoa exige PersonLead e empresa de origem.')
      result = await enviarPessoaParaCrm(opts.empresaId, opts.person, opts.company, opts.actor)
    } else {
      if (!opts.oportunidade) throw new Error('Envio de empresa exige oportunidade aprovada.')
      result = await enviarOportunidadeParaCrm(opts.empresaId, opts.oportunidade, opts.actor?.usuarioNome, opts.actor)
    }
    await writeIntegrationLog({
      empresaId: opts.empresaId,
      code: result.jaExistia ? INTEGRATION_LOG.LEAD_ALREADY_SYNCED : INTEGRATION_LOG.CRM_SYNC_SUCCESS,
      leadId,
      origin: 'leads_monitor',
      operation: 'sendLeadToCrm',
    })
    return result
  } catch (e: unknown) {
    await writeIntegrationLog({
      empresaId: opts.empresaId,
      code: INTEGRATION_LOG.CRM_SYNC_FAILED,
      leadId,
      origin: 'leads_monitor',
      operation: 'sendLeadToCrm',
      error: e instanceof Error ? e.message : String(e),
    })
    throw e
  }
}

export async function updateLeadInCrm(opts: {
  empresaId: string
  crmId: string
  patch: Record<string, unknown>
}): Promise<void> {
  await assertRobotNotPaused(opts.empresaId, 'crm', 'Robô CRM pausado — retome na Central de Robôs para enviar.')
  await updateDoc(doc(db, 'empresas', opts.empresaId, 'clientes', opts.crmId), {
    ...opts.patch,
    empresaId: opts.empresaId,
    atualizadoEm: serverTimestamp(),
  })
  await publishIntegrationEvent({
    empresaId: opts.empresaId,
    type: 'lead_updated',
    idempotencyKey: `lead_updated:${opts.crmId}:${Date.now()}`,
    payload: { crmId: opts.crmId, fields: Object.keys(opts.patch) },
  })
}

export async function createClientInCrm(opts: {
  empresaId: string
  payload: Record<string, unknown>
  actor?: { usuarioId?: string; usuarioNome?: string }
}): Promise<{ clienteId: string; jaExistia: boolean }> {
  await assertRobotNotPaused(opts.empresaId, 'crm', 'Robô CRM pausado — retome na Central de Robôs para enviar.')
  const origin = originCode(String(opts.payload.origin || opts.payload.origem || opts.payload.origemLead || 'manual'))
  const existing = await findExistingCliente({
    empresaId: opts.empresaId,
    kind: opts.payload.leadsMonitorPersonId ? 'pessoa' : 'empresa',
    telefone: asText(opts.payload.telefone),
    whatsapp: asText(opts.payload.whatsapp),
    email: asText(opts.payload.email),
    nome: asText(opts.payload.nome),
    empresaCnpj: asText(opts.payload.empresaCnpj),
    leadsMonitorPersonId: asText(opts.payload.leadsMonitorPersonId),
    leadsMonitorOpportunityId: asText(opts.payload.leadsMonitorOpportunityId || opts.payload.leadId),
  })
  if (existing) {
    await applyClienteMerge(opts.empresaId, existing.id, existing.data, {
      ...opts.payload,
      origem: origin,
      origemLead: origin,
      origin,
      source: origin,
    })
    return { clienteId: existing.id, jaExistia: true }
  }
  const ref = await addDoc(collection(db, 'empresas', opts.empresaId, 'clientes'), {
    ...opts.payload,
    empresaId: opts.empresaId,
    origem: origin,
    origemLead: origin,
    origin,
    source: origin,
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp(),
  })
  return { clienteId: ref.id, jaExistia: false }
}

export async function updateClientInCrm(opts: {
  empresaId: string
  crmId: string
  patch: Record<string, unknown>
}): Promise<void> {
  return updateLeadInCrm(opts)
}

export async function createConversationInCrm(opts: {
  empresaId: string
  clienteId: string
  titulo?: string
  telefone?: string
  origemLead?: string
  campanhaId?: string
  campanhaNome?: string
  produto?: string
  operacao?: string
  cidade?: string
  estado?: string
  actor?: { usuarioId?: string; usuarioNome?: string }
}): Promise<{ conversaId: string; criada: boolean }> {
  return garantirConversaFila({
    empresaId: opts.empresaId,
    clienteId: opts.clienteId,
    titulo: opts.titulo,
    telefone: opts.telefone,
    origemLead: originCode(String(opts.origemLead || 'leads_monitor')),
    campanhaId: opts.campanhaId,
    campanhaNome: opts.campanhaNome,
    produto: opts.produto,
    operacao: opts.operacao,
    cidade: opts.cidade,
    estado: opts.estado,
    usuarioId: opts.actor?.usuarioId,
    usuarioNome: opts.actor?.usuarioNome,
  })
}

export async function addLeadToAttendanceQueue(opts: Parameters<typeof createConversationInCrm>[0]) {
  return createConversationInCrm(opts)
}

export async function registerCampaignOrigin(opts: {
  empresaId: string
  clienteId: string
  origin: string
  campaignId?: string
  campaignName?: string
  fonte?: string
}): Promise<void> {
  const origin = originCode(opts.origin)
  const ref = doc(db, 'empresas', opts.empresaId, 'clientes', opts.clienteId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return
  const prev = (snap.data()?.historicoOrigens as unknown[]) || []
  await updateDoc(ref, {
    origemLead: origin,
    origem: origin,
    origin,
    source: origin,
    campanhaId: opts.campaignId || snap.data()?.campanhaId || '',
    campanhaNome: opts.campaignName || snap.data()?.campanhaNome || '',
    historicoOrigens: [
      ...prev,
      eventoOrigem({
        origem: origin,
        campanha: opts.campaignName,
        campanhaId: opts.campaignId,
        fonte: opts.fonte,
      }),
    ],
    atualizadoEm: serverTimestamp(),
  })
}

export async function syncLeadStatus(opts: {
  empresaId: string
  crmId: string
  status: string
  leadId?: string
}): Promise<void> {
  await updateDoc(doc(db, 'empresas', opts.empresaId, 'clientes', opts.crmId), {
    status: opts.status,
    atualizadoEm: serverTimestamp(),
  })
  if (opts.leadId) {
    await upsertCrmErpSync({
      empresaId: opts.empresaId,
      leadId: opts.leadId,
      crmId: opts.crmId,
      kind: 'cliente',
      origin: 'leads_monitor',
      source: 'leads_monitor',
      status: opts.status,
    })
  }
  await publishIntegrationEvent({
    empresaId: opts.empresaId,
    type: 'lead_status_changed',
    idempotencyKey: `lead_status_changed:${opts.crmId}:${opts.status}`,
    payload: { crmId: opts.crmId, leadId: opts.leadId || '', status: opts.status },
  })
}

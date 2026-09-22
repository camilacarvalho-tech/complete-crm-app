/**
 * Adapter CRM — chama erpBridge (clientes/conversas/fila existentes).
 * Sem disparo de canal. CRM_API_KEY só no backend.
 */
import { sendLeadToCrm, createConversationInCrm } from '../crm/erpBridge'
import { writeIntegrationLog, INTEGRATION_LOG } from '../crm/syncLog'
import { canStartCrmJob } from '../crm/idempotency'
import type { LeadSyncResult } from '../crm/types'
import type { OportunidadeMonitor } from '../../modules/leads-monitor/types'
import type { CompanyPeopleResearch } from '../../modules/leads-monitor/types/peopleResearch'
import { loadRobotControl } from '../../modules/leads-monitor/services/robotControl'

export interface CrmAdapter {
  sendApprovedLead(opts: {
    empresaId: string
    kind: 'empresa' | 'pessoa'
    oportunidade?: OportunidadeMonitor
    person?: CompanyPeopleResearch
    company?: OportunidadeMonitor
    actor?: { usuarioId?: string; usuarioNome?: string }
    attempt?: number
  }): Promise<LeadSyncResult>
}

export const crmAdapter: CrmAdapter = {
  async sendApprovedLead(opts) {
    const attempt = opts.attempt ?? 0
    const origin = 'leads_monitor'
    const leadId = opts.kind === 'pessoa' ? opts.person?.id : opts.oportunidade?.id
    await writeIntegrationLog({
      empresaId: opts.empresaId,
      code: INTEGRATION_LOG.CRM_SYNC_STARTED,
      leadId,
      origin,
      operation: 'sendApprovedLead',
      attempt,
    })
    const control = await loadRobotControl(opts.empresaId)
    if (!canStartCrmJob(control.crm)) {
      await writeIntegrationLog({
        empresaId: opts.empresaId,
        code: INTEGRATION_LOG.CRM_SYNC_FAILED,
        leadId,
        origin,
        operation: 'sendApprovedLead',
        error: 'CRM_PAUSED',
        attempt,
      })
      return {
        ok: false,
        duplicated: false,
        alreadySynced: false,
        createdCliente: false,
        createdConversa: false,
        queued: false,
        code: 'CRM_PAUSED',
        error: 'Robô CRM pausado',
        attempt,
      }
    }
    try {
      const sent = await sendLeadToCrm(opts)
      const queue = await createConversationInCrm({
        empresaId: opts.empresaId,
        clienteId: sent.clienteId,
        titulo: opts.person?.personName || opts.oportunidade?.nome,
        telefone: opts.person?.phone || opts.oportunidade?.telefone,
        origemLead: origin,
        campanhaId: opts.oportunidade?.pesquisaId || undefined,
      })
      const already = sent.jaExistia && !queue.criada
      const code = already ? INTEGRATION_LOG.LEAD_ALREADY_SYNCED : queue.criada ? INTEGRATION_LOG.CRM_QUEUE_ADDED : INTEGRATION_LOG.CRM_SYNC_SUCCESS
      await writeIntegrationLog({
        empresaId: opts.empresaId,
        code,
        leadId,
        origin,
        operation: 'sendApprovedLead',
        result: code,
        attempt,
      })
      return {
        ok: true,
        duplicated: sent.jaExistia,
        alreadySynced: already,
        clienteId: sent.clienteId,
        conversaId: queue.conversaId,
        createdCliente: !sent.jaExistia,
        createdConversa: queue.criada,
        queued: Boolean(queue.conversaId),
        code: already ? 'LEAD_ALREADY_SYNCED' : queue.criada ? 'CRM_QUEUE_ADDED' : 'CRM_SYNC_SUCCESS',
        attempt,
      }
    } catch (e: unknown) {
      const error = e instanceof Error ? e.message : String(e)
      await writeIntegrationLog({
        empresaId: opts.empresaId,
        code: INTEGRATION_LOG.CRM_SYNC_FAILED,
        leadId,
        origin,
        operation: 'sendApprovedLead',
        error,
        attempt,
      })
      return {
        ok: false,
        duplicated: false,
        alreadySynced: false,
        createdCliente: false,
        createdConversa: false,
        queued: false,
        code: 'CRM_SYNC_FAILED',
        error,
        attempt,
      }
    }
  },
}

export function getCrmAdapter(): CrmAdapter {
  return crmAdapter
}

/**
 * Logs da ponte CRM↔ERP. Reutiliza leadsMonitorLogs (sem jobQueue novo).
 */
import { writeLeadsMonitorLog } from '../../modules/leads-monitor/services/opsLogs'

export const INTEGRATION_LOG = {
  ERP_SYNC_STARTED: 'ERP_SYNC_STARTED',
  ERP_SYNC_SUCCESS: 'ERP_SYNC_SUCCESS',
  ERP_SYNC_FAILED: 'ERP_SYNC_FAILED',
  CRM_SYNC_STARTED: 'CRM_SYNC_STARTED',
  CRM_SYNC_SUCCESS: 'CRM_SYNC_SUCCESS',
  CRM_SYNC_FAILED: 'CRM_SYNC_FAILED',
  LEAD_ALREADY_SYNCED: 'LEAD_ALREADY_SYNCED',
  CRM_QUEUE_ADDED: 'CRM_QUEUE_ADDED',
} as const

export type IntegrationLogCode = (typeof INTEGRATION_LOG)[keyof typeof INTEGRATION_LOG]

export async function writeIntegrationLog(opts: {
  empresaId: string
  code: IntegrationLogCode
  leadId?: string
  origin?: string
  operation?: string
  result?: string
  error?: string
  attempt?: number
}): Promise<void> {
  await writeLeadsMonitorLog({
    empresaId: opts.empresaId,
    level: opts.code.endsWith('FAILED') ? 'error' : 'info',
    message: opts.code,
    meta: {
      leadId: opts.leadId || null,
      origin: opts.origin || null,
      operation: opts.operation || null,
      result: opts.result || opts.code,
      error: opts.error || null,
      attempt: opts.attempt ?? 0,
      at: new Date().toISOString(),
    },
  })
}

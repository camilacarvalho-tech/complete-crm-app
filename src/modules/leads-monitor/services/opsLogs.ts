/**
 * Logs operacionais + DLQ do Leads Monitor.
 */
import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '../../../firebase'
import { COL_DLQ, COL_LOGS } from '../constants'
import { enqueueJob } from './jobQueue'
import { writeLeadsMonitorAudit } from './auditTrail'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export async function writeLeadsMonitorLog(opts: {
  empresaId: string
  level: LogLevel
  message: string
  connectorId?: string
  jobId?: string
  meta?: Record<string, unknown>
}): Promise<void> {
  if (!opts.empresaId) return
  try {
    await addDoc(collection(db, 'empresas', opts.empresaId, COL_LOGS), {
      empresaId: opts.empresaId,
      level: opts.level,
      message: opts.message.slice(0, 1000),
      connectorId: opts.connectorId || null,
      jobId: opts.jobId || null,
      meta: opts.meta || null,
      at: serverTimestamp(),
    })
  } catch (e) {
    console.warn('[leads-monitor:log]', e)
  }
}

export async function moveToDlq(opts: {
  empresaId: string
  jobId?: string
  connectorId?: string
  reason: string
  payload: Record<string, unknown>
}): Promise<string> {
  const ref = await addDoc(collection(db, 'empresas', opts.empresaId, COL_DLQ), {
    empresaId: opts.empresaId,
    jobId: opts.jobId || null,
    connectorId: opts.connectorId || null,
    reason: opts.reason.slice(0, 500),
    payload: opts.payload,
    status: 'open',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  await writeLeadsMonitorLog({
    empresaId: opts.empresaId,
    level: 'error',
    message: `DLQ: ${opts.reason}`,
    connectorId: opts.connectorId,
    jobId: opts.jobId,
    meta: { dlqId: ref.id },
  })
  return ref.id
}

export async function reprocessDlq(opts: {
  empresaId: string
  dlqId: string
  actor?: { usuarioId?: string; usuarioNome?: string }
}): Promise<string> {
  const jobId = await enqueueJob({
    empresaId: opts.empresaId,
    type: 'reprocess_dlq',
    payload: { dlqId: opts.dlqId },
    actor: opts.actor,
  })
  await updateDoc(doc(db, 'empresas', opts.empresaId, COL_DLQ, opts.dlqId), {
    status: 'requeued',
    requeueJobId: jobId,
    updatedAt: serverTimestamp(),
  })
  await writeLeadsMonitorAudit({
    empresaId: opts.empresaId,
    action: 'dlq.reprocess',
    origem: 'ui',
    usuarioId: opts.actor?.usuarioId,
    usuarioNome: opts.actor?.usuarioNome,
    entidade: 'dlq',
    entidadeId: opts.dlqId,
    after: { jobId },
  })
  return jobId
}

/**
 * Worker assíncrono (cliente) — processa jobs sem bloquear a UI.
 * Contrato de lease permite múltiplas instâncias (escala horizontal).
 */
import { bootstrapConnectors } from '../connectors'
import { runLeadPipeline } from '../pipeline'
import {
  claimNextJob,
  markJobFailed,
  markJobRunning,
  markJobSucceeded,
  type LeadsMonitorJob,
} from './jobQueue'
import { writeLeadsMonitorLog, moveToDlq } from './opsLogs'
import { FILTROS_VAZIOS } from '../constants'

let loopTimer: ReturnType<typeof setInterval> | null = null
let busy = false

export async function processOneJob(empresaId: string): Promise<boolean> {
  bootstrapConnectors()
  const job = await claimNextJob(empresaId)
  if (!job) return false

  await markJobRunning(empresaId, job.id)
  await writeLeadsMonitorLog({
    empresaId,
    level: 'info',
    message: `Job iniciado: ${job.type}`,
    jobId: job.id,
  })

  try {
    if (job.type === 'search' || job.type === 'drain_inbox' || job.type === 'reprocess_dlq') {
      const filtros = job.payload.filtros || { ...FILTROS_VAZIOS }
      // Um único fetch por conector ocorre dentro do pipeline (+ health)
      const result = await runLeadPipeline({
        empresaId,
        filtros,
        pesquisaId: job.payload.pesquisaId,
        llmBudget: job.type === 'search' ? 3 : 0,
      })

      await markJobSucceeded(empresaId, job.id, result)
      await writeLeadsMonitorLog({
        empresaId,
        level: 'info',
        message: `Job ok: +${result.novos} leads`,
        jobId: job.id,
        meta: result as unknown as Record<string, unknown>,
      })
    }
    return true
  } catch (e: any) {
    const msg = e?.message || String(e)
    const outcome = await markJobFailed(empresaId, job, msg)
    await writeLeadsMonitorLog({
      empresaId,
      level: 'error',
      message: msg,
      jobId: job.id,
    })
    if (outcome === 'dead') {
      await moveToDlq({
        empresaId,
        jobId: job.id,
        reason: msg,
        payload: { type: job.type, payload: job.payload },
      })
    }
    return true
  }
}

/** Loop leve no cliente — UI só observa; não bloqueia botões. */
export function startJobWorkerLoop(empresaId: string, intervalMs = 8000): () => void {
  if (loopTimer) clearInterval(loopTimer)
  const tick = async () => {
    if (busy || !empresaId) return
    busy = true
    try {
      await processOneJob(empresaId)
    } finally {
      busy = false
    }
  }
  loopTimer = setInterval(tick, intervalMs)
  void tick()
  return () => {
    if (loopTimer) clearInterval(loopTimer)
    loopTimer = null
  }
}

export type { LeadsMonitorJob }

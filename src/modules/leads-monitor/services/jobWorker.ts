/**
 * Worker assíncrono (cliente) — processa jobs sem bloquear a UI.
 * Contrato de lease permite múltiplas instâncias (escala horizontal).
 */
import { bootstrapConnectors } from '../connectors'
import { runLeadPipeline } from '../pipeline'
import { runSearchEngine } from '../search/SearchEngine'
import { requestSearchCancel } from '../search/SearchProgress'
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
    if (job.type === 'search_cancel') {
      const searchRunId = job.payload.searchRunId
      if (searchRunId) {
        await requestSearchCancel({ empresaId, searchRunId })
      }
      await markJobSucceeded(empresaId, job.id, { cancelled: true })
      return true
    }

    if (job.type === 'search_inteligente') {
      const searchRunId = job.payload.searchRunId
      if (!searchRunId) throw new Error('search_inteligente sem searchRunId')
      const result = await runSearchEngine({
        empresaId,
        searchRunId,
        jobId: job.id,
        filtros: job.payload.filtros || { ...FILTROS_VAZIOS },
        fontesIds: job.payload.fontesIds,
        pesquisaId: job.payload.pesquisaId,
        llmBudget: 3,
      })
      await markJobSucceeded(empresaId, job.id, result)
      await writeLeadsMonitorLog({
        empresaId,
        level: 'info',
        message: `Search inteligente ok: +${result.novos} leads · ${result.encontrados} encontrados`,
        jobId: job.id,
        meta: { ...result, searchRunId } as unknown as Record<string, unknown>,
      })
      return true
    }

    if (job.type === 'import_csv') {
      // E4 — SearchEngine + conector csv_import processam via search_inteligente;
      // import_csv dedicado pode reutilizar o mesmo engine com fonte CSV.
      const searchRunId = job.payload.searchRunId
      if (searchRunId) {
        const result = await runSearchEngine({
          empresaId,
          searchRunId,
          jobId: job.id,
          filtros: job.payload.filtros || { ...FILTROS_VAZIOS },
          fontesIds: job.payload.fontesIds,
          llmBudget: 0,
        })
        await markJobSucceeded(empresaId, job.id, result)
        return true
      }
      throw new Error('import_csv sem searchRunId')
    }

    if (job.type === 'search' || job.type === 'drain_inbox' || job.type === 'reprocess_dlq') {
      const filtros = job.payload.filtros || { ...FILTROS_VAZIOS }
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
export function startJobWorkerLoop(empresaId: string, intervalMs = 4000): () => void {
  if (loopTimer) clearInterval(loopTimer)
  const tick = async () => {
    if (busy || !empresaId) return
    busy = true
    try {
      // Drena até 2 jobs por tick para não atrasar fila de busca
      await processOneJob(empresaId)
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

import { doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '../../../firebase'
import { COL_SEARCH_RUNS } from '../constants'
import { runLeadPipeline } from '../pipeline'
import type { FiltrosPesquisa, MonitorRunResult } from '../types'

export async function runSearchEngine(opts: { empresaId: string; searchRunId: string; jobId?: string; filtros: FiltrosPesquisa; fontesIds?: string[]; pesquisaId?: string; llmBudget?: number }): Promise<MonitorRunResult> {
  const runRef = doc(db, 'empresas', opts.empresaId, COL_SEARCH_RUNS, opts.searchRunId)
  await updateDoc(runRef, { status: 'running', jobId: opts.jobId || null, atualizadoEm: serverTimestamp(), progresso: { percent: 10, etapa: 'Processando fontes', fontesConcluidas: 0, fontesTotal: opts.fontesIds?.length || 0, encontrados: 0, novos: 0, duplicados: 0, tempoMs: 0 } })
  const startedAt = Date.now()
  try {
    const result = await runLeadPipeline({ empresaId: opts.empresaId, filtros: opts.filtros, pesquisaId: opts.pesquisaId, llmBudget: opts.llmBudget, limitePorConector: opts.filtros.maxResultsPerCycle })
    const tempoMs = Date.now() - startedAt
    await updateDoc(runRef, { status: 'succeeded', resultadoResumo: { ...result, tempoMs }, progresso: { percent: 100, etapa: 'Concluída', fontesConcluidas: result.fontes.length, fontesTotal: opts.fontesIds?.length || result.fontes.length, encontrados: result.encontrados, novos: result.novos, duplicados: result.duplicados, tempoMs }, finalizadoEm: serverTimestamp(), atualizadoEm: serverTimestamp() })
    return result
  } catch (error: any) {
    await updateDoc(runRef, { status: 'failed', lastError: error?.message || String(error), finalizadoEm: serverTimestamp(), atualizadoEm: serverTimestamp() })
    throw error
  }
}

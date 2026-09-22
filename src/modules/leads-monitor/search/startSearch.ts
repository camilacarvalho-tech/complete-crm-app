import { addDoc, collection, getDocs, query, serverTimestamp, where } from 'firebase/firestore'
import { db } from '../../../firebase'
import { COL_FONTES, COL_SEARCH_RUNS } from '../constants'
import { enqueueJob } from '../services/jobQueue'
import { writeLeadsMonitorAudit } from '../services/auditTrail'
import type { FiltrosPesquisa } from '../types'
import { normalizeFiltros } from './filters'
import { clearSearchCancel } from './searchCancel'

export async function startIntelligentSearch(opts: {
  empresaId: string
  filtros: FiltrosPesquisa
  pesquisaId?: string | null
  processRunId?: string | null
  actor?: { usuarioId?: string; usuarioNome?: string }
}): Promise<{ searchRunId: string; jobId: string; fontesIds: string[] }> {
  if (opts.processRunId) clearSearchCancel({ processRunId: opts.processRunId })
  const fontesSnap = await getDocs(query(collection(db, 'empresas', opts.empresaId, COL_FONTES), where('status', '==', 'ativa')))
  const fontesIds = fontesSnap.docs.map((item) => item.id)
  const filtros = normalizeFiltros(opts.filtros)
  const produtoId = (filtros.produtos && filtros.produtos[0]) || filtros.operacao || ''
  const runRef = await addDoc(collection(db, 'empresas', opts.empresaId, COL_SEARCH_RUNS), {
    empresaId: opts.empresaId,
    filtros,
    fontesIds,
    fontesHabilitadas: filtros.fontesHabilitadas || [],
    produto: produtoId,
    operacao: filtros.operacao || '',
    segmento: filtros.segmento || '',
    limite: filtros.maxResultsPerCycle || 100,
    scoreMinimo: filtros.scoreMinimo || 70,
    processRunId: opts.processRunId || null,
    usuarioId: opts.actor?.usuarioId || null,
    usuarioNome: opts.actor?.usuarioNome || null,
    status: 'queued',
    progresso: {
      percent: 0,
      etapa: 'Na fila',
      fontesConcluidas: 0,
      fontesTotal: fontesIds.length,
      encontrados: 0,
      novos: 0,
      duplicados: 0,
      tempoMs: 0,
    },
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp(),
  })
  clearSearchCancel({ processRunId: opts.processRunId, searchRunId: runRef.id })
  const pesquisaId =
    typeof opts.pesquisaId === 'string' && opts.pesquisaId.trim() ? opts.pesquisaId.trim() : null
  const jobId = await enqueueJob({
    empresaId: opts.empresaId,
    type: 'search_inteligente',
    payload: {
      filtros,
      fontesIds,
      fontesHabilitadas: filtros.fontesHabilitadas || [],
      searchRunId: runRef.id,
      pesquisaId,
      processRunId: opts.processRunId || undefined,
    },
    idempotencyKey: `search:${opts.empresaId}:${runRef.id}`,
    actor: opts.actor,
  })
  await writeLeadsMonitorAudit({
    empresaId: opts.empresaId,
    action: 'search.start',
    origem: 'ui',
    usuarioId: opts.actor?.usuarioId,
    usuarioNome: opts.actor?.usuarioNome,
    entidade: 'search_run',
    entidadeId: runRef.id,
    after: {
      jobId,
      fontesIds,
      fontesHabilitadas: filtros.fontesHabilitadas || [],
      filtros: {
        estado: filtros.estado,
        cidade: filtros.cidade,
        bairro: filtros.bairro,
        cep: filtros.cep,
        abrangencia: filtros.abrangenciaGeografica,
        segmento: filtros.segmento,
        operacao: filtros.operacao,
        produtos: filtros.produtos,
        fontesHabilitadas: filtros.fontesHabilitadas,
        maxResultsPerCycle: filtros.maxResultsPerCycle,
        scoreMinimo: filtros.scoreMinimo,
        faixaFuncionarios: filtros.faixaFuncionarios,
        palavraChave: filtros.palavraChave,
      },
    },
  })
  return { searchRunId: runRef.id, jobId, fontesIds }
}

export async function requestSearchCancel(opts: {
  empresaId: string
  searchRunId: string
  processRunId?: string | null
  actor?: { usuarioId?: string; usuarioNome?: string }
}): Promise<void> {
  const { requestSearchCancel: cancel } = await import('./SearchProgress')
  await cancel(opts)
}

/** Cancelamento definitivo da execução atual (UI + Firestore + fila + AbortController). */
export async function stopSearchExecution(opts: {
  empresaId: string
  searchRunId?: string | null
  processRunId?: string | null
  actor?: { usuarioId?: string; usuarioNome?: string }
}): Promise<void> {
  const { abortSearchExecution } = await import('./searchCancel')
  const { cancelQueuedSearchJobs } = await import('../services/jobQueue')
  const { setProcessControl } = await import('../services/processRunStore')
  abortSearchExecution({ searchRunId: opts.searchRunId, processRunId: opts.processRunId })
  if (opts.searchRunId) {
    await requestSearchCancel({
      empresaId: opts.empresaId,
      searchRunId: opts.searchRunId,
      processRunId: opts.processRunId,
      actor: opts.actor,
    })
  }
  if (opts.processRunId) {
    await setProcessControl({
      empresaId: opts.empresaId,
      runId: opts.processRunId,
      status: 'cancelado',
      actor: opts.actor,
    })
  }
  await cancelQueuedSearchJobs({
    empresaId: opts.empresaId,
    searchRunId: opts.searchRunId,
    processRunId: opts.processRunId,
  })
}

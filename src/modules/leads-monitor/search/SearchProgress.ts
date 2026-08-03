/**
 * Persistência / progresso de SearchRun (tempo real via onSnapshot na UI).
 */
import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore'
import { db } from '../../../firebase'
import { COL_SEARCH_RUNS } from '../constants'
import { writeLeadsMonitorAudit } from '../services/auditTrail'
import { writeLeadsMonitorLog } from '../services/opsLogs'
import { normalizeFiltros } from './filters'
import type {
  FiltrosPesquisa,
  SearchRun,
  SearchRunProgresso,
  SearchRunStatus,
} from '../types'

export function emptyProgress(fontesTotal = 0): SearchRunProgresso {
  return {
    percent: 0,
    etapa: 'queued',
    fontesConcluidas: 0,
    fontesTotal,
    encontrados: 0,
    novos: 0,
    duplicados: 0,
    tempoMs: 0,
    etaMs: undefined,
  }
}

export async function createSearchRun(opts: {
  empresaId: string
  filtros: FiltrosPesquisa
  fontesIds: string[]
  usuarioId?: string
  usuarioNome?: string
}): Promise<string> {
  const filtros = normalizeFiltros(opts.filtros)
  const ref = await addDoc(collection(db, 'empresas', opts.empresaId, COL_SEARCH_RUNS), {
    empresaId: opts.empresaId,
    filtros,
    fontesIds: opts.fontesIds,
    usuarioId: opts.usuarioId || null,
    usuarioNome: opts.usuarioNome || null,
    status: 'queued' satisfies SearchRunStatus,
    progresso: emptyProgress(opts.fontesIds.length),
    resultadoResumo: null,
    jobId: null,
    lastError: null,
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp(),
    finalizadoEm: null,
  })

  await writeLeadsMonitorAudit({
    empresaId: opts.empresaId,
    action: 'search.start',
    origem: 'ui',
    usuarioId: opts.usuarioId,
    usuarioNome: opts.usuarioNome,
    entidade: 'searchRun',
    entidadeId: ref.id,
    after: { fontesIds: opts.fontesIds, filtros },
  })

  await writeLeadsMonitorLog({
    empresaId: opts.empresaId,
    level: 'info',
    message: `SearchRun criado: ${ref.id} · ${opts.fontesIds.length} fonte(s)`,
    meta: { searchRunId: ref.id },
  })

  return ref.id
}

export async function attachJobToSearchRun(
  empresaId: string,
  searchRunId: string,
  jobId: string
): Promise<void> {
  await updateDoc(doc(db, 'empresas', empresaId, COL_SEARCH_RUNS, searchRunId), {
    jobId,
    atualizadoEm: serverTimestamp(),
  })
}

export async function getSearchRun(
  empresaId: string,
  searchRunId: string
): Promise<(SearchRun & { id: string }) | null> {
  const snap = await getDoc(doc(db, 'empresas', empresaId, COL_SEARCH_RUNS, searchRunId))
  if (!snap.exists()) return null
  return { id: snap.id, ...(snap.data() as Omit<SearchRun, 'id'>) }
}

export async function isSearchCancelled(empresaId: string, searchRunId: string): Promise<boolean> {
  const run = await getSearchRun(empresaId, searchRunId)
  if (!run) return true
  return run.status === 'cancelled' || run.status === 'paused'
}

export async function updateSearchProgress(
  empresaId: string,
  searchRunId: string,
  progresso: SearchRunProgresso,
  status?: SearchRunStatus
): Promise<void> {
  const patch: Record<string, unknown> = {
    progresso,
    atualizadoEm: serverTimestamp(),
  }
  if (status) patch.status = status
  await updateDoc(doc(db, 'empresas', empresaId, COL_SEARCH_RUNS, searchRunId), patch)
}

export async function requestSearchCancel(opts: {
  empresaId: string
  searchRunId: string
  actor?: { usuarioId?: string; usuarioNome?: string }
}): Promise<void> {
  const { empresaId, searchRunId, actor } = opts
  const run = await getSearchRun(empresaId, searchRunId)
  if (!run) throw new Error('SearchRun não encontrado')
  if (run.status === 'succeeded' || run.status === 'failed' || run.status === 'cancelled') {
    return
  }
  await updateDoc(doc(db, 'empresas', empresaId, COL_SEARCH_RUNS, searchRunId), {
    status: 'cancelled',
    progresso: {
      ...run.progresso,
      etapa: 'cancelled',
    },
    atualizadoEm: serverTimestamp(),
    finalizadoEm: serverTimestamp(),
  })
  await writeLeadsMonitorAudit({
    empresaId,
    action: 'search.cancel',
    origem: 'ui',
    usuarioId: actor?.usuarioId,
    usuarioNome: actor?.usuarioNome,
    entidade: 'searchRun',
    entidadeId: searchRunId,
  })
  await writeLeadsMonitorLog({
    empresaId,
    level: 'warn',
    message: `Busca cancelada: ${searchRunId}`,
    meta: { searchRunId },
  })
}

export async function finalizeSearchRun(opts: {
  empresaId: string
  searchRunId: string
  status: Extract<SearchRunStatus, 'succeeded' | 'failed' | 'cancelled'>
  progresso: SearchRunProgresso
  resultadoResumo?: SearchRun['resultadoResumo']
  lastError?: string | null
}): Promise<void> {
  await updateDoc(doc(db, 'empresas', opts.empresaId, COL_SEARCH_RUNS, opts.searchRunId), {
    status: opts.status,
    progresso: opts.progresso,
    resultadoResumo: opts.resultadoResumo || null,
    lastError: opts.lastError ?? null,
    finalizadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp(),
  })
  await writeLeadsMonitorAudit({
    empresaId: opts.empresaId,
    action: 'search.complete',
    origem: 'worker',
    entidade: 'searchRun',
    entidadeId: opts.searchRunId,
    after: {
      status: opts.status,
      resultadoResumo: opts.resultadoResumo || null,
      lastError: opts.lastError || null,
    },
  })
}

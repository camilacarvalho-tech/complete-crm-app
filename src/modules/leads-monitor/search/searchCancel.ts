import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../../firebase'
import { COL_PROCESS_RUNS, COL_SEARCH_RUNS } from '../constants'

export class SearchCancelledError extends Error {
  code = 'cancelled' as const
  constructor(message = 'Pesquisa cancelada') {
    super(message)
    this.name = 'SearchCancelledError'
  }
}

export function isSearchCancelledError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const e = error as { name?: string; code?: string }
  return e.name === 'SearchCancelledError' || (e instanceof SearchCancelledError)
}

export type SearchCancelIds = {
  searchRunId?: string | null
  processRunId?: string | null
}

const cancelledKeys = new Set<string>()
const controllers = new Map<string, AbortController>()

function idKeys(ids: SearchCancelIds): string[] {
  return [ids.processRunId, ids.searchRunId].filter((k): k is string => Boolean(k && String(k).trim()))
}

export function isSearchHardCancelled(ids: SearchCancelIds): boolean {
  return idKeys(ids).some((k) => cancelledKeys.has(k))
}

export function beginSearchAbort(ids: SearchCancelIds): AbortSignal {
  const ac = new AbortController()
  for (const k of idKeys(ids)) {
    controllers.set(k, ac)
  }
  if (isSearchHardCancelled(ids)) ac.abort()
  return ac.signal
}

export function abortSearchExecution(ids: SearchCancelIds): void {
  for (const k of idKeys(ids)) {
    cancelledKeys.add(k)
    controllers.get(k)?.abort()
  }
}

export function clearSearchCancel(ids: SearchCancelIds): void {
  for (const k of idKeys(ids)) {
    cancelledKeys.delete(k)
  }
}

export function throwIfSearchCancelled(ids: SearchCancelIds): void {
  if (isSearchHardCancelled(ids)) throw new SearchCancelledError()
}

export async function readExecutionFlags(
  empresaId: string,
  ids: SearchCancelIds
): Promise<{ cancelled: boolean; paused: boolean }> {
  if (isSearchHardCancelled(ids)) return { cancelled: true, paused: false }
  let cancelled = false
  let paused = false
  if (ids.processRunId) {
    const snap = await getDoc(doc(db, 'empresas', empresaId, COL_PROCESS_RUNS, ids.processRunId))
    const st = String(snap.data()?.status || '')
    if (st === 'cancelado') cancelled = true
    if (st === 'pausado') paused = true
  }
  if (ids.searchRunId) {
    const snap = await getDoc(doc(db, 'empresas', empresaId, COL_SEARCH_RUNS, ids.searchRunId))
    const st = String(snap.data()?.status || '')
    if (st === 'cancelled') cancelled = true
    if (st === 'paused') paused = true
  }
  try {
    const { isRobotPaused } = await import('../services/robotControl')
    if (await isRobotPaused(empresaId, 'search')) paused = true
  } catch {
    /* controle indisponível — segue flags do ProcessRun */
  }
  if (cancelled) abortSearchExecution(ids)
  return { cancelled, paused }
}

export async function throwIfExecutionCancelled(empresaId: string, ids: SearchCancelIds): Promise<void> {
  throwIfSearchCancelled(ids)
  const flags = await readExecutionFlags(empresaId, ids)
  if (flags.cancelled) throw new SearchCancelledError()
}

/** Combina cancelamento da pesquisa com timeout da requisição. */
export function attachTimeout(signal: AbortSignal | undefined, timeoutMs: number): { signal: AbortSignal; cleanup: () => void } {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  const onAbort = () => ctrl.abort()
  if (signal) {
    if (signal.aborted) ctrl.abort()
    else signal.addEventListener('abort', onAbort)
  }
  return {
    signal: ctrl.signal,
    cleanup: () => {
      clearTimeout(timer)
      signal?.removeEventListener('abort', onAbort)
    },
  }
}

/**
 * Fila assíncrona de jobs — preparada para escala horizontal (lease/claim).
 */
import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db } from '../../../firebase'
import { COL_JOBS, JOB_LEASE_MS, JOB_MAX_ATTEMPTS } from '../constants'
import { writeLeadsMonitorAudit } from './auditTrail'
import type { FiltrosPesquisa } from '../types'

export type JobType =
  | 'search'
  | 'drain_inbox'
  | 'reprocess_dlq'
  | 'search_inteligente'
  | 'search_cancel'
  | 'import_csv'
export type JobStatus = 'queued' | 'leased' | 'running' | 'succeeded' | 'failed' | 'dead'

export interface LeadsMonitorJob {
  id: string
  empresaId: string
  type: JobType
  status: JobStatus
  attempts: number
  maxAttempts: number
  nextAttemptAt?: unknown
  leaseOwner?: string | null
  leaseUntil?: unknown
  idempotencyKey: string
  payload: {
    filtros?: FiltrosPesquisa
    connectorIds?: string[]
    fontesIds?: string[]
    searchRunId?: string
    dlqId?: string
    pesquisaId?: string
  }
  lastError?: string | null
  createdAt?: unknown
  updatedAt?: unknown
}

function workerId(): string {
  return `worker-${Math.random().toString(36).slice(2, 10)}`
}

function toMillis(v: unknown): number {
  if (!v) return 0
  if (typeof (v as { toMillis?: () => number }).toMillis === 'function') {
    return (v as { toMillis: () => number }).toMillis()
  }
  if (v instanceof Date) return v.getTime()
  if (typeof v === 'number') return v
  return 0
}

function isClaimable(cur: Omit<LeadsMonitorJob, 'id'>, now: number): boolean {
  if (cur.empresaId == null) return false
  if ((cur.attempts || 0) >= (cur.maxAttempts || JOB_MAX_ATTEMPTS)) return false

  const nextAt = toMillis(cur.nextAttemptAt)
  if (nextAt > now && (cur.status === 'queued' || cur.status === 'failed')) return false

  if (cur.status === 'queued' || cur.status === 'failed') return true

  // Reclaim expired lease (horizontal scale — worker crash / timeout)
  if (cur.status === 'leased' || cur.status === 'running') {
    const leaseUntilMs = toMillis(cur.leaseUntil)
    return leaseUntilMs > 0 && leaseUntilMs <= now
  }
  return false
}

export async function enqueueJob(opts: {
  empresaId: string
  type: JobType
  payload?: LeadsMonitorJob['payload']
  idempotencyKey?: string
  actor?: { usuarioId?: string; usuarioNome?: string }
}): Promise<string> {
  const { empresaId, type, payload = {}, actor } = opts
  const idempotencyKey =
    opts.idempotencyKey || `${type}:${empresaId}:${Date.now()}:${Math.random().toString(36).slice(2, 7)}`

  // Best-effort dedupe: skip if identical key still active
  try {
    const existing = await getDocs(
      query(
        collection(db, 'empresas', empresaId, COL_JOBS),
        where('idempotencyKey', '==', idempotencyKey),
        limit(5)
      )
    )
    for (const d of existing.docs) {
      const st = (d.data() as LeadsMonitorJob).status
      if (st === 'queued' || st === 'leased' || st === 'running' || st === 'failed') {
        return d.id
      }
    }
  } catch {
    /* index may be missing — continue enqueue */
  }

  const ref = await addDoc(collection(db, 'empresas', empresaId, COL_JOBS), {
    empresaId,
    type,
    status: 'queued' satisfies JobStatus,
    attempts: 0,
    maxAttempts: JOB_MAX_ATTEMPTS,
    nextAttemptAt: serverTimestamp(),
    leaseOwner: null,
    leaseUntil: null,
    idempotencyKey,
    payload,
    lastError: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  await writeLeadsMonitorAudit({
    empresaId,
    action: 'job.enqueue',
    origem: 'ui',
    usuarioId: actor?.usuarioId,
    usuarioNome: actor?.usuarioNome,
    entidade: 'job',
    entidadeId: ref.id,
    after: { type, idempotencyKey, status: 'queued' },
  })

  return ref.id
}

/**
 * Claim atômico de um job queued/failed (respeitando nextAttemptAt)
 * ou leased/running com lease expirado.
 * Vários workers em paralelo sem double-processing.
 */
export async function claimNextJob(
  empresaId: string,
  owner = workerId()
): Promise<LeadsMonitorJob | null> {
  const now = Date.now()

  // Pass 1: queued / failed
  const qReady = query(
    collection(db, 'empresas', empresaId, COL_JOBS),
    where('status', 'in', ['queued', 'failed']),
    limit(15)
  )
  // Pass 2: possibly expired leases
  const qLeased = query(
    collection(db, 'empresas', empresaId, COL_JOBS),
    where('status', 'in', ['leased', 'running']),
    limit(10)
  )

  const [readySnap, leasedSnap] = await Promise.all([getDocs(qReady), getDocs(qLeased)])
  const candidates = [...readySnap.docs, ...leasedSnap.docs]

  for (const d of candidates) {
    const data = d.data() as Omit<LeadsMonitorJob, 'id'>
    if (data.empresaId !== empresaId) continue
    if (!isClaimable(data, now)) continue

    try {
      const claimed = await runTransaction(db, async (tx) => {
        const ref = doc(db, 'empresas', empresaId, COL_JOBS, d.id)
        const fresh = await tx.get(ref)
        if (!fresh.exists()) return null
        const cur = fresh.data() as Omit<LeadsMonitorJob, 'id'>
        if (cur.empresaId !== empresaId) return null
        if (!isClaimable(cur, Date.now())) return null

        tx.update(ref, {
          status: 'leased',
          leaseOwner: owner,
          leaseUntil: new Date(Date.now() + JOB_LEASE_MS),
          updatedAt: serverTimestamp(),
        })
        return { id: d.id, ...cur, status: 'leased' as JobStatus, leaseOwner: owner }
      })
      if (claimed) return claimed as LeadsMonitorJob
    } catch {
      /* outro worker pegou */
    }
  }
  return null
}

export async function markJobRunning(empresaId: string, jobId: string): Promise<void> {
  await updateDoc(doc(db, 'empresas', empresaId, COL_JOBS, jobId), {
    status: 'running',
    updatedAt: serverTimestamp(),
  })
}

export async function markJobSucceeded(empresaId: string, jobId: string, meta?: object): Promise<void> {
  await updateDoc(doc(db, 'empresas', empresaId, COL_JOBS, jobId), {
    status: 'succeeded',
    leaseOwner: null,
    leaseUntil: null,
    lastError: null,
    result: meta || null,
    updatedAt: serverTimestamp(),
  })
  await writeLeadsMonitorAudit({
    empresaId,
    action: 'job.complete',
    origem: 'worker',
    entidade: 'job',
    entidadeId: jobId,
    after: { status: 'succeeded', ...(meta || {}) },
  })
}

export async function markJobFailed(
  empresaId: string,
  job: LeadsMonitorJob,
  error: string
): Promise<'failed' | 'dead'> {
  const attempts = (job.attempts || 0) + 1
  const maxAttempts = job.maxAttempts || JOB_MAX_ATTEMPTS
  const dead = attempts >= maxAttempts
  const backoffMs = Math.min(30 * 60 * 1000, 1000 * 2 ** Math.min(attempts, 8))

  await updateDoc(doc(db, 'empresas', empresaId, COL_JOBS, job.id), {
    status: dead ? 'dead' : 'failed',
    attempts,
    lastError: error.slice(0, 500),
    leaseOwner: null,
    leaseUntil: null,
    nextAttemptAt: dead ? null : new Date(Date.now() + backoffMs),
    updatedAt: serverTimestamp(),
  })

  await writeLeadsMonitorAudit({
    empresaId,
    action: 'job.fail',
    origem: 'worker',
    entidade: 'job',
    entidadeId: job.id,
    after: { status: dead ? 'dead' : 'failed', attempts, error: error.slice(0, 200) },
  })

  return dead ? 'dead' : 'failed'
}

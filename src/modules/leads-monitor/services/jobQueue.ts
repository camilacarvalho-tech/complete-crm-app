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

export type JobType = 'search' | 'drain_inbox' | 'reprocess_dlq'
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
 * Claim atômico de um job queued (ou lease expirado).
 * Vários workers podem chamar em paralelo sem double-processing.
 */
export async function claimNextJob(
  empresaId: string,
  owner = workerId()
): Promise<LeadsMonitorJob | null> {
  const q = query(
    collection(db, 'empresas', empresaId, COL_JOBS),
    where('status', 'in', ['queued', 'failed']),
    limit(10)
  )
  const snap = await getDocs(q)
  const now = Date.now()

  for (const d of snap.docs) {
    const data = d.data() as Omit<LeadsMonitorJob, 'id'>
    if (data.empresaId !== empresaId) continue
    if ((data.attempts || 0) >= (data.maxAttempts || JOB_MAX_ATTEMPTS)) continue

    try {
      const claimed = await runTransaction(db, async (tx) => {
        const ref = doc(db, 'empresas', empresaId, COL_JOBS, d.id)
        const fresh = await tx.get(ref)
        if (!fresh.exists()) return null
        const cur = fresh.data() as Omit<LeadsMonitorJob, 'id'>
        if (cur.empresaId !== empresaId) return null
        if (cur.status !== 'queued' && cur.status !== 'failed') return null
        const leaseUntilMs =
          cur.leaseUntil && typeof (cur.leaseUntil as any).toMillis === 'function'
            ? (cur.leaseUntil as any).toMillis()
            : 0
        if (cur.status === 'leased' && leaseUntilMs > now) return null

        tx.update(ref, {
          status: 'leased',
          leaseOwner: owner,
          leaseUntil: new Date(now + JOB_LEASE_MS),
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
    action: dead ? 'job.fail' : 'job.fail',
    origem: 'worker',
    entidade: 'job',
    entidadeId: job.id,
    after: { status: dead ? 'dead' : 'failed', attempts, error: error.slice(0, 200) },
  })

  return dead ? 'dead' : 'failed'
}

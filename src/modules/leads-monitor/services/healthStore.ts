/**
 * Saúde dos conectores — last sync, falhas, latência, online/offline.
 */
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '../../../firebase'
import { COL_HEALTH } from '../constants'

export type ConnectorHealthStatus = 'online' | 'degraded' | 'offline'

export interface ConnectorHealth {
  connectorId: string
  status: ConnectorHealthStatus
  lastSyncAt?: unknown
  lastAttemptAt?: unknown
  consecutiveFailures: number
  lastLatencyMs?: number
  lastError?: string | null
  connectorVersion?: string
  empresaId: string
}

function statusFromFailures(failures: number, ok: boolean): ConnectorHealthStatus {
  if (ok && failures === 0) return 'online'
  if (ok && failures > 0) return 'degraded'
  if (failures >= 3) return 'offline'
  return 'degraded'
}

export async function recordConnectorSuccess(opts: {
  empresaId: string
  connectorId: string
  latencyMs: number
  connectorVersion?: string
}): Promise<void> {
  const ref = doc(db, 'empresas', opts.empresaId, COL_HEALTH, opts.connectorId)
  await setDoc(
    ref,
    {
      empresaId: opts.empresaId,
      connectorId: opts.connectorId,
      status: 'online' satisfies ConnectorHealthStatus,
      lastSyncAt: serverTimestamp(),
      lastAttemptAt: serverTimestamp(),
      consecutiveFailures: 0,
      lastLatencyMs: Math.round(opts.latencyMs),
      lastError: null,
      connectorVersion: opts.connectorVersion || null,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  )
}

export async function recordConnectorFailure(opts: {
  empresaId: string
  connectorId: string
  error: string
  previousFailures?: number
  latencyMs?: number
  connectorVersion?: string
}): Promise<void> {
  const ref = doc(db, 'empresas', opts.empresaId, COL_HEALTH, opts.connectorId)
  let previous = opts.previousFailures
  if (previous == null) {
    try {
      const snap = await getDoc(ref)
      previous = snap.exists()
        ? Number((snap.data() as ConnectorHealth).consecutiveFailures || 0)
        : 0
    } catch {
      previous = 0
    }
  }
  const failures = previous + 1
  await setDoc(
    ref,
    {
      empresaId: opts.empresaId,
      connectorId: opts.connectorId,
      status: statusFromFailures(failures, false),
      lastAttemptAt: serverTimestamp(),
      consecutiveFailures: failures,
      lastLatencyMs: opts.latencyMs != null ? Math.round(opts.latencyMs) : null,
      lastError: opts.error.slice(0, 300),
      connectorVersion: opts.connectorVersion || null,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  )
}

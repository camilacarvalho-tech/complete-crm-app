/**
 * Barramento de eventos CRM ↔ ERP.
 * Não é jobQueue: só persiste eventos idempotentes e notifica listeners in-memory.
 * Eventos crm_to_erp não disparam WhatsApp/SMS/Meta.
 */
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '../../firebase'
import {
  directionForType,
  type IntegrationEvent,
  type IntegrationEventType,
} from './eventTypes'

export const COL_CRM_ERP_EVENTS = 'crmErpEvents'

type Listener = (event: IntegrationEvent) => void | Promise<void>
const listeners = new Set<Listener>()

const SECRET_KEY = /token|secret|password|senha|authorization|apikey|api_key|hmac|bearer|ciphertext/i

function sanitize(payload: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(payload)) {
    if (SECRET_KEY.test(k)) {
      out[k] = '[REDACTED]'
      continue
    }
    if (v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) {
      out[k] = sanitize(v as Record<string, unknown>)
      continue
    }
    out[k] = v
  }
  return out
}

function eventDocId(idempotencyKey: string) {
  return idempotencyKey.replace(/[/#]/g, '_').slice(0, 700)
}

export function subscribeIntegrationEvents(fn: Listener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export async function publishIntegrationEvent(opts: {
  empresaId: string
  type: IntegrationEventType
  idempotencyKey: string
  payload: Record<string, unknown>
}): Promise<{ id: string; duplicated: boolean }> {
  const id = eventDocId(opts.idempotencyKey)
  const ref = doc(db, 'empresas', opts.empresaId, COL_CRM_ERP_EVENTS, id)
  const existing = await getDoc(ref)
  if (existing.exists()) {
    return { id, duplicated: true }
  }
  const event: IntegrationEvent = {
    empresaId: opts.empresaId,
    type: opts.type,
    direction: directionForType(opts.type),
    idempotencyKey: opts.idempotencyKey,
    payload: sanitize(opts.payload),
    status: 'recorded',
    createdAt: serverTimestamp(),
  }
  await setDoc(ref, event)
  const live = { ...event, id }
  for (const fn of listeners) {
    await fn(live)
  }
  return { id, duplicated: false }
}

export async function markIntegrationEventApplied(empresaId: string, eventId: string, status: 'applied' | 'ignored') {
  await setDoc(
    doc(db, 'empresas', empresaId, COL_CRM_ERP_EVENTS, eventId),
    { status, processedAt: serverTimestamp(), empresaId },
    { merge: true }
  )
}

import { CANONICAL_ORIGINS, type CanonicalOrigin } from '../events/eventTypes.ts'
import type { LeadKind, LeadSyncResult } from './types.ts'

export function isCanonicalOrigin(value: string): value is CanonicalOrigin {
  return (CANONICAL_ORIGINS as readonly string[]).includes(value)
}

export function canStartCrmJob(crmIntent: 'running' | 'paused' | 'idle'): boolean {
  return crmIntent !== 'paused'
}

export function resolveClienteAction(existingCrmId?: string | null): 'create' | 'reuse' {
  return existingCrmId ? 'reuse' : 'create'
}

export function resolveConversaAction(existingConversaId?: string | null): 'create' | 'reuse' {
  return existingConversaId ? 'reuse' : 'create'
}

export function personMustKeepOwnContact(personPhone: string, companyPhone: string): boolean {
  const p = (personPhone || '').replace(/\D/g, '')
  const c = (companyPhone || '').replace(/\D/g, '')
  if (!p) return true
  if (!c) return true
  return p !== c || Boolean(personPhone)
}

export function nextRetry(attempt: number, failed: boolean, max = 2): { retry: boolean; attempt: number } {
  if (!failed) return { retry: false, attempt }
  const next = attempt + 1
  return { retry: next < max, attempt: next }
}

export function syncResultFromFlags(opts: {
  existingCliente: boolean
  existingConversa: boolean
  crmPaused: boolean
  kind: LeadKind
  origin: string
  error?: string
  attempt?: number
}): LeadSyncResult {
  const attempt = opts.attempt ?? 0
  if (opts.crmPaused) {
    return {
      ok: false,
      duplicated: false,
      alreadySynced: false,
      createdCliente: false,
      createdConversa: false,
      queued: false,
      code: 'CRM_PAUSED',
      error: 'Robô CRM pausado',
      attempt,
    }
  }
  if (opts.error) {
    return {
      ok: false,
      duplicated: opts.existingCliente,
      alreadySynced: opts.existingCliente,
      createdCliente: false,
      createdConversa: false,
      queued: false,
      code: 'CRM_SYNC_FAILED',
      error: opts.error,
      attempt,
    }
  }
  if (opts.existingCliente && opts.existingConversa) {
    return {
      ok: true,
      duplicated: true,
      alreadySynced: true,
      createdCliente: false,
      createdConversa: false,
      queued: false,
      code: 'LEAD_ALREADY_SYNCED',
      attempt,
    }
  }
  return {
    ok: true,
    duplicated: opts.existingCliente,
    alreadySynced: opts.existingCliente,
    createdCliente: !opts.existingCliente,
    createdConversa: !opts.existingConversa,
    queued: !opts.existingConversa,
    code: opts.existingConversa ? 'CRM_SYNC_SUCCESS' : 'CRM_QUEUE_ADDED',
    attempt,
  }
}

/**
 * Audit Trail do Leads Monitor — rastreabilidade completa por tenant.
 * Nunca inclui segredos (tokens/chaves) em before/after.
 */
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from '../../../firebase'
import { COL_AUDIT } from '../constants'
import { auditDateUtc, auditTimeSaoPaulo } from '../utils/datetime'

export type AuditOrigem = 'ui' | 'webhook' | 'worker' | 'system'

export type AuditAction =
  | 'config.update'
  | 'job.enqueue'
  | 'job.complete'
  | 'job.fail'
  | 'webhook.accept'
  | 'dlq.reprocess'
  | 'secret.rotate'
  | 'oportunidade.create'
  | 'oportunidade.approve'
  | 'oportunidade.reject'
  | 'oportunidade.send_crm'
  | 'opportunity.send_crm'
  | 'pesquisa.create'
  | 'pesquisa.update'
  | 'fonte.create'
  | 'fonte.update'
  | 'search.start'
  | 'search.complete'
  | 'search.cancel'
  | 'people.search_started'
  | 'people.search_source'
  | 'people.search_result'
  | 'people.approved'
  | 'people.ignored'
  | 'people.send_crm'
  | 'people.search_error'
  | string

export interface LeadsMonitorAuditEntry {
  empresaId: string
  action: AuditAction
  origem: AuditOrigem
  connectorId?: string
  connectorVersion?: string
  usuarioId?: string
  usuarioNome?: string
  entidade: string
  entidadeId?: string
  before?: Record<string, unknown>
  after?: Record<string, unknown>
  requestId?: string
  /** Campos extras não sensíveis */
  meta?: Record<string, unknown>
}

const SECRET_KEYS = /token|secret|password|senha|authorization|apikey|api_key|hmac|cipher|bearer/i
const PERSONAL_KEYS = /cpf|telefonepessoal|whatsapppessoal|emailpessoal/i

function redactCpfValue(value: string): string {
  const d = value.replace(/\D/g, '')
  if (d.length < 2) return '***.***.***-**'
  return `***.***.***-${d.slice(-2)}`
}

/** Remove chaves sensíveis de objetos de audit. */
export function sanitizeAuditPayload(
  input?: Record<string, unknown> | null
): Record<string, unknown> | undefined {
  if (!input) return undefined
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(input)) {
    if (SECRET_KEYS.test(k)) {
      out[k] = '[REDACTED]'
      continue
    }
    if (PERSONAL_KEYS.test(k) && typeof v === 'string') {
      out[k] = /cpf/i.test(k) ? redactCpfValue(v) : '[DADO PESSOAL OMITIDO]'
      continue
    }
    if (v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) {
      out[k] = sanitizeAuditPayload(v as Record<string, unknown>)
    } else {
      out[k] = v
    }
  }
  return out
}

export async function writeLeadsMonitorAudit(entry: LeadsMonitorAuditEntry): Promise<string | null> {
  if (!entry.empresaId) {
    console.warn('[leads-monitor:audit] empresaId obrigatório')
    return null
  }
  try {
    const ref = await addDoc(collection(db, 'empresas', entry.empresaId, COL_AUDIT), {
      action: entry.action,
      origem: entry.origem,
      connectorId: entry.connectorId || null,
      connectorVersion: entry.connectorVersion || null,
      usuarioId: entry.usuarioId || null,
      usuarioNome: entry.usuarioNome || null,
      entidade: entry.entidade,
      entidadeId: entry.entidadeId || null,
      before: sanitizeAuditPayload(entry.before) || null,
      after: sanitizeAuditPayload(entry.after) || null,
      requestId: entry.requestId || null,
      meta: sanitizeAuditPayload(entry.meta) || null,
      empresaId: entry.empresaId,
      at: serverTimestamp(),
      data: auditDateUtc(),
      hora: auditTimeSaoPaulo(),
    })
    return ref.id
  } catch (e) {
    console.warn('[leads-monitor:audit]', e)
    return null
  }
}

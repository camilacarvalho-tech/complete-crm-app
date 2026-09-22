import assert from 'node:assert/strict'
import test from 'node:test'
import {
  canStartCrmJob,
  isCanonicalOrigin,
  nextRetry,
  personMustKeepOwnContact,
  resolveClienteAction,
  resolveConversaAction,
  syncResultFromFlags,
} from './idempotency.ts'
import { CANONICAL_ORIGINS } from '../events/eventTypes.ts'

test('1. lead novo cria cliente e fila', () => {
  const r = syncResultFromFlags({ existingCliente: false, existingConversa: false, crmPaused: false, kind: 'empresa', origin: 'leads_monitor' })
  assert.equal(r.createdCliente, true)
  assert.equal(r.createdConversa, true)
  assert.equal(r.code, 'CRM_QUEUE_ADDED')
  assert.equal(resolveClienteAction(null), 'create')
})

test('2. lead duplicado não cria outro cliente', () => {
  assert.equal(resolveClienteAction('cli-1'), 'reuse')
  const r = syncResultFromFlags({ existingCliente: true, existingConversa: true, crmPaused: false, kind: 'empresa', origin: 'leads_monitor' })
  assert.equal(r.createdCliente, false)
  assert.equal(r.createdConversa, false)
  assert.equal(r.code, 'LEAD_ALREADY_SYNCED')
  assert.equal(r.duplicated, true)
})

test('3. cliente existente reutiliza id', () => {
  assert.equal(resolveClienteAction('abc'), 'reuse')
  const r = syncResultFromFlags({ existingCliente: true, existingConversa: false, crmPaused: false, kind: 'cliente', origin: 'leads_monitor' })
  assert.equal(r.createdCliente, false)
  assert.equal(r.createdConversa, true)
})

test('4. CRM pausado não inicia próximo job', () => {
  assert.equal(canStartCrmJob('paused'), false)
  const r = syncResultFromFlags({ existingCliente: false, existingConversa: false, crmPaused: true, kind: 'empresa', origin: 'leads_monitor' })
  assert.equal(r.code, 'CRM_PAUSED')
  assert.equal(r.ok, false)
})

test('5. CRM retomado pode iniciar job', () => {
  assert.equal(canStartCrmJob('running'), true)
})

test('6. erro de sincronização', () => {
  const r = syncResultFromFlags({
    existingCliente: false,
    existingConversa: false,
    crmPaused: false,
    kind: 'empresa',
    origin: 'leads_monitor',
    error: 'timeout',
  })
  assert.equal(r.code, 'CRM_SYNC_FAILED')
  assert.equal(r.error, 'timeout')
})

test('7. retry até o limite', () => {
  assert.deepEqual(nextRetry(0, true), { retry: true, attempt: 1 })
  assert.deepEqual(nextRetry(1, true), { retry: false, attempt: 2 })
  assert.deepEqual(nextRetry(0, false), { retry: false, attempt: 0 })
})

test('8. origem leads_monitor', () => {
  assert.equal(isCanonicalOrigin('leads_monitor'), true)
})

test('9. origem trafego_pago', () => {
  assert.equal(isCanonicalOrigin('trafego_pago'), true)
  for (const o of CANONICAL_ORIGINS) assert.equal(isCanonicalOrigin(o), true)
  assert.equal(isCanonicalOrigin('inventada'), false)
})

test('10. PERSON_LEAD não copia telefone da empresa', () => {
  assert.equal(personMustKeepOwnContact('11999990000', '1133334444'), true)
  assert.equal(personMustKeepOwnContact('', '1133334444'), true)
})

test('11. empresa vs pessoa', () => {
  const emp = syncResultFromFlags({ existingCliente: false, existingConversa: false, crmPaused: false, kind: 'empresa', origin: 'leads_monitor' })
  const pes = syncResultFromFlags({ existingCliente: false, existingConversa: false, crmPaused: false, kind: 'pessoa', origin: 'leads_monitor' })
  assert.equal(emp.createdCliente, pes.createdCliente)
})

test('12. conversa existente não duplica', () => {
  assert.equal(resolveConversaAction('conv-1'), 'reuse')
  assert.equal(resolveConversaAction(null), 'create')
})

test('13. fila de atendimento só na primeira vez', () => {
  const first = syncResultFromFlags({ existingCliente: false, existingConversa: false, crmPaused: false, kind: 'pessoa', origin: 'leads_monitor' })
  const second = syncResultFromFlags({ existingCliente: true, existingConversa: true, crmPaused: false, kind: 'pessoa', origin: 'leads_monitor' })
  assert.equal(first.queued, true)
  assert.equal(second.queued, false)
})

test('mock ERP não duplica lead e não dispara canal', async () => {
  const inbox = new Set<string>()
  async function receiveLead(leadId: string) {
    if (inbox.has(leadId)) return { duplicated: true, status: 'not_configured' as const }
    inbox.add(leadId)
    return { duplicated: false, status: 'not_configured' as const }
  }
  const a = await receiveLead('lead-test-1')
  const b = await receiveLead('lead-test-1')
  assert.equal(a.duplicated, false)
  assert.equal(b.duplicated, true)
  assert.equal(a.status, 'not_configured')
})

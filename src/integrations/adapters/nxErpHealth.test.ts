import assert from 'node:assert/strict'
import test from 'node:test'
import {
  interpretErpHealth,
  leadSyncAdapterKind,
  REAL_LEAD_SYNC_DISABLED,
  sanitizeErpLog,
  statusLabel,
} from '../erp/connectionStatus.ts'
import { createNxErpAdapter } from './nxErpAdapter.ts'

test('NOT_CONFIGURED sem secrets nem path de health', () => {
  const r = interpretErpHealth({})
  assert.equal(r.connection, 'NOT_CONFIGURED')
  assert.equal(r.mode, 'mock')
  assert.equal(r.status, 'not_configured')
  assert.match(r.label, /Não configurado/)
})

test('CONNECTED com /health público (sem API key)', () => {
  const r = interpretErpHealth({
    enabled: true,
    urlConfigured: true,
    healthPathConfigured: true,
    httpStatus: 200,
  })
  assert.equal(r.connection, 'CONNECTED')
  assert.equal(r.status, 'online')
})

test('AUTH_ERROR em 401', () => {
  const r = interpretErpHealth({ httpStatus: 401, urlConfigured: true, keyConfigured: true })
  assert.equal(r.connection, 'AUTH_ERROR')
})

test('TIMEOUT', () => {
  const r = interpretErpHealth({ timeout: true, enabled: true, urlConfigured: true, keyConfigured: true, healthPathConfigured: true })
  assert.equal(r.connection, 'TIMEOUT')
})

test('UNAVAILABLE em 503', () => {
  const r = interpretErpHealth({
    enabled: true,
    urlConfigured: true,
    keyConfigured: true,
    healthPathConfigured: true,
    httpStatus: 503,
  })
  assert.equal(r.connection, 'UNAVAILABLE')
})

test('HTTP 200 sem path documentado não inventa CONNECTED', () => {
  const r = interpretErpHealth({
    enabled: true,
    urlConfigured: true,
    keyConfigured: true,
    healthPathConfigured: false,
    httpStatus: 200,
  })
  assert.equal(r.connection, 'NOT_CONFIGURED')
})

test('mock continua sendo o adapter de sync de leads', () => {
  assert.equal(leadSyncAdapterKind(), 'mock')
})

test('adapter real não envia lead', async () => {
  const adapter = createNxErpAdapter({
    probe: async () => ({ functionMissing: true }),
  })
  const sent = await adapter.receiveLead({
    leadId: 'x',
    source: 'leads_monitor',
    origin: 'leads_monitor',
    status: 'novo',
    kind: 'pessoa',
  })
  assert.equal(sent.ok, false)
  assert.equal(sent.message, REAL_LEAD_SYNC_DISABLED.message)
  const health = await adapter.healthCheck()
  assert.equal(health.connection, 'NOT_CONFIGURED')
})

test('secrets não são expostos no log', () => {
  const clean = sanitizeErpLog({
    Authorization: 'Bearer secret-token-value',
    apiKey: 'nx-erp-key',
    NX_ERP_API_KEY: 'abc',
    connection: 'NOT_CONFIGURED',
  }) as Record<string, unknown>
  const blob = JSON.stringify(clean)
  assert.equal(clean.connection, 'NOT_CONFIGURED')
  assert.equal(clean.Authorization, '[REDACTED]')
  assert.doesNotMatch(blob, /secret-token-value/)
  assert.doesNotMatch(blob, /nx-erp-key/)
  assert.doesNotMatch(blob, /"abc"/)
})

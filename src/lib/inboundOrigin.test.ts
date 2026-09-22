import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveInboundOrigin } from './inboundOrigin.ts'

test('campanha/disparo vira disparo_massa', () => {
  assert.equal(resolveInboundOrigin({ campaignId: 'c1', source: 'NX_ERP' }), 'disparo_massa')
  assert.equal(resolveInboundOrigin({ source: 'disparo_massa' }), 'disparo_massa')
})

test('anúncio vira trafego_pago', () => {
  assert.equal(resolveInboundOrigin({ origin: 'trafego_pago' }), 'trafego_pago')
  assert.equal(resolveInboundOrigin({ source: 'meta_ads' }), 'trafego_pago')
})

test('whatsapp inbound padrão', () => {
  assert.equal(resolveInboundOrigin({ source: 'whatsapp' }), 'whatsapp')
})

test('webhook genérico', () => {
  assert.equal(resolveInboundOrigin({}), 'webhook')
})

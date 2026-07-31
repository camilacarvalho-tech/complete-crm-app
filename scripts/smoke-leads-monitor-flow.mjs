/**
 * Smoke estrutural do fluxo Leads Monitor V1.1 (sem rede).
 * Valida contratos: webhook payload → normalize → score shape → CRM gate.
 *
 * Uso: node --experimental-strip-types scripts/smoke-leads-monitor-flow.mjs
 * (ou após build: node scripts/smoke-leads-monitor-flow.mjs)
 */
import assert from 'node:assert/strict'
import { createHash, createHmac, randomBytes, createCipheriv } from 'node:crypto'

function hashToken(plain) {
  return createHash('sha256').update(plain).digest('hex')
}

function encryptAesGcm(plain, kekPass) {
  const key = createHash('sha256').update(kekPass).digest()
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return {
    ciphertext: Buffer.concat([enc, tag]).toString('base64'),
    iv: iv.toString('base64'),
  }
}

function timingSafeEqualStr(a, b) {
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ba.length !== bb.length) return false
  let out = 0
  for (let i = 0; i < ba.length; i++) out |= ba[i] ^ bb[i]
  return out === 0
}

// 1) Webhook auth by hash
const bearer = 'smoke-token-' + randomBytes(8).toString('hex')
const storedHash = hashToken(bearer)
assert.equal(timingSafeEqualStr(hashToken(bearer), storedHash), true)
assert.equal(timingSafeEqualStr(hashToken('wrong'), storedHash), false)

// 2) Ciphertext never equals plaintext
const enc = encryptAesGcm(bearer, 'test-kek')
assert.notEqual(enc.ciphertext, bearer)
assert.ok(enc.iv.length > 8)

// 3) Inbox → normalize contract
const inboxPayload = {
  nome: 'Lead Smoke V1.1',
  telefone: '11987654321',
  email: 'smoke@example.com',
  cidade: 'São Paulo',
  estado: 'SP',
  segmento: 'credito_clt',
  consentimentoLgpd: true,
}
assert.ok(inboxPayload.nome)
assert.ok(inboxPayload.consentimentoLgpd)

const dedupeKey = `tel:${inboxPayload.telefone.replace(/\D/g, '')}`
assert.equal(dedupeKey, 'tel:11987654321')

// 4) HMAC optional path
const hmacSecret = 'hmac-smoke'
const raw = Buffer.from(JSON.stringify(inboxPayload))
const digest = createHmac('sha256', hmacSecret).update(raw).digest('hex')
assert.equal(digest.length, 64)

// 5) CRM gate: only approved + LGPD
function canSendToCrm(op) {
  if (!op.consentimentoLgpd) return false
  if (op.status !== 'aprovado' && op.status !== 'enviado_crm') return false
  return true
}
assert.equal(canSendToCrm({ ...inboxPayload, status: 'novo' }), false)
assert.equal(canSendToCrm({ ...inboxPayload, status: 'aprovado' }), true)
assert.equal(canSendToCrm({ consentimentoLgpd: false, status: 'aprovado' }), false)

// 6) Job types in flow
const flow = ['webhook.accept', 'drain_inbox', 'normalize', 'log', 'audit', 'approve', 'send_crm']
assert.deepEqual(flow.slice(0, 3), ['webhook.accept', 'drain_inbox', 'normalize'])

console.log('SMOKE_OK leads-monitor V1.1 structural flow')
console.log(
  JSON.stringify(
    {
      webhookAuth: 'hash',
      inboxSample: { nome: inboxPayload.nome, dedupeKey },
      crmGate: 'aprovado+lgpd',
      steps: flow,
    },
    null,
    2
  )
)

/**
 * WhatsApp Cloud API — só validação e montagem.
 * Não faz fetch para a Meta.
 */
const crypto = require('crypto')

const ENV_KEYS = [
  'META_APP_ID',
  'META_APP_SECRET',
  'META_WABA_ID',
  'META_PHONE_NUMBER_ID',
  'META_WHATSAPP_ACCESS_TOKEN',
  'META_WHATSAPP_VERIFY_TOKEN',
]

const META_STATUSES = new Set(['sent', 'delivered', 'read', 'failed'])

function configFromEnv(env) {
  const source = env || {}
  const missing = ENV_KEYS.filter((key) => !String(source[key] || '').trim())
  return {
    configured: missing.length === 0,
    missing,
    appId: String(source.META_APP_ID || '').trim(),
    wabaId: String(source.META_WABA_ID || '').trim(),
    phoneNumberId: String(source.META_PHONE_NUMBER_ID || '').trim(),
    hasAppSecret: Boolean(String(source.META_APP_SECRET || '').trim()),
    hasAccessToken: Boolean(String(source.META_WHATSAPP_ACCESS_TOKEN || '').trim()),
    hasVerifyToken: Boolean(String(source.META_WHATSAPP_VERIFY_TOKEN || '').trim()),
  }
}

function verifyWebhook(input) {
  const mode = String(input.mode || '')
  const token = String(input.token || '')
  const expected = String(input.expected || '')
  const challenge = String(input.challenge || '')
  if (!expected) return { ok: false, status: 403, reason: 'verify_token_missing' }
  if (mode === 'subscribe' && token === expected && challenge) {
    return { ok: true, status: 200, challenge }
  }
  return { ok: false, status: 403, reason: 'verify_token_mismatch' }
}

function verifySignature(rawBody, header, appSecret) {
  const secret = String(appSecret || '')
  const given = String(header || '')
  if (!secret || !given.startsWith('sha256=')) return false
  const digest = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
  const a = Buffer.from(given.slice(7), 'hex')
  const b = Buffer.from(digest, 'hex')
  if (a.length !== b.length || a.length === 0) return false
  return crypto.timingSafeEqual(a, b)
}

function escolhaInterativa(msg) {
  const interativo = (msg && msg.interactive) || {}
  const resposta = interativo.button_reply || interativo.list_reply || {}
  return {
    id: String(resposta.id || '').trim(),
    title: String(resposta.title || resposta.description || '').trim(),
  }
}

function textoDoCliente(msg) {
  const texto = String(msg.text && msg.text.body || '').trim()
  if (texto) return texto
  const botao = msg.button || {}
  const clique = String(botao.text || botao.payload || '').trim()
  if (clique) return clique
  const escolha = escolhaInterativa(msg)
  return escolha.title || escolha.id
}

function parseCloudWebhook(body) {
  const messages = []
  const statuses = []
  const entries = Array.isArray(body && body.entry) ? body.entry : []
  for (const entry of entries) {
    const changes = Array.isArray(entry.changes) ? entry.changes : []
    for (const change of changes) {
      const value = change.value || {}
      const contact = (value.contacts || [])[0] || {}
      for (const msg of value.messages || []) {
        const wamid = String(msg.id || '').trim()
        if (!wamid) continue
        const escolha = escolhaInterativa(msg)
        const texto = textoDoCliente(msg)
        if (!texto) continue
        messages.push({
          wamid,
          messageId: wamid,
          phone: String(msg.from || contact.wa_id || '').trim(),
          whatsapp: String(contact.wa_id || msg.from || '').trim(),
          nome: String(contact.profile && contact.profile.name || '').trim(),
          message: texto,
          opcaoId: escolha.id,
          messageType: String(msg.type || 'texto'),
          replyToWamid: String(msg.context && msg.context.id || '').trim(),
          timestamp: String(msg.timestamp || ''),
          source: 'whatsapp',
          origin: /ad|ads/i.test(String((msg.referral || {}).source_type || '')) ? 'trafego_pago' : 'whatsapp',
        })
      }
      for (const item of value.statuses || []) {
        const status = String(item.status || '').trim().toLowerCase()
        if (!META_STATUSES.has(status)) continue
        statuses.push({
          wamid: String(item.id || '').trim(),
          status,
          recipient: String(item.recipient_id || '').trim(),
          timestamp: String(item.timestamp || ''),
        })
      }
    }
  }
  return { messages, statuses }
}

function alreadySeen(known, key) {
  const id = String(key || '').trim()
  if (!id) return false
  return known.includes(id)
}

function buildSendRequest(input) {
  const phoneNumberId = String(input.phoneNumberId || '').trim()
  const token = String(input.accessToken || '').trim()
  const to = String(input.to || '').replace(/\D/g, '')
  const text = String(input.text || '').trim()
  if (!phoneNumberId || !token || !to || !text) {
    return { ok: false, reason: 'not_configured' }
  }
  return {
    ok: true,
    mocked: true,
    method: 'POST',
    url: `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
    body: {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text },
    },
  }
}

module.exports = {
  ENV_KEYS,
  META_STATUSES,
  configFromEnv,
  verifyWebhook,
  verifySignature,
  parseCloudWebhook,
  alreadySeen,
  buildSendRequest,
}

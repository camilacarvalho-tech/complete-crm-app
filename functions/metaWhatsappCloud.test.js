const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const test = require('node:test')
const {
  alreadySeen,
  buildSendRequest,
  configFromEnv,
  parseCloudWebhook,
  verifySignature,
  verifyWebhook,
} = require('./metaWhatsappCloud')

const envOk = {
  META_APP_ID: 'app',
  META_APP_SECRET: 'secret-de-teste',
  META_WABA_ID: 'waba',
  META_PHONE_NUMBER_ID: 'phone',
  META_WHATSAPP_ACCESS_TOKEN: 'token-de-teste',
  META_WHATSAPP_VERIFY_TOKEN: 'verify-de-teste',
}

test('configuração ausente lista só os nomes das variáveis', () => {
  const cfg = configFromEnv({})
  assert.equal(cfg.configured, false)
  assert.ok(cfg.missing.includes('META_WHATSAPP_ACCESS_TOKEN'))
  assert.equal(JSON.stringify(cfg).includes('token-de-teste'), false)
})

test('configuração válida não devolve o segredo', () => {
  const cfg = configFromEnv(envOk)
  assert.equal(cfg.configured, true)
  assert.equal(cfg.missing.length, 0)
  assert.equal(cfg.hasAccessToken, true)
  assert.equal(Object.prototype.hasOwnProperty.call(cfg, 'accessToken'), false)
})

test('validação do webhook aceita o challenge e recusa token errado', () => {
  const ok = verifyWebhook({
    mode: 'subscribe',
    token: 'verify-de-teste',
    expected: 'verify-de-teste',
    challenge: '123',
  })
  assert.equal(ok.ok, true)
  assert.equal(ok.challenge, '123')
  const bad = verifyWebhook({ mode: 'subscribe', token: 'outro', expected: 'verify-de-teste', challenge: '123' })
  assert.equal(bad.ok, false)
  assert.equal(bad.status, 403)
})

test('falha de autenticação quando a assinatura não confere', () => {
  const raw = Buffer.from('{"ok":true}')
  const good = 'sha256=' + crypto.createHmac('sha256', 'secret-de-teste').update(raw).digest('hex')
  assert.equal(verifySignature(raw, good, 'secret-de-teste'), true)
  assert.equal(verifySignature(raw, good, 'outro-segredo'), false)
  assert.equal(verifySignature(raw, '', 'secret-de-teste'), false)
})

test('processa mensagem recebida e status sem chamar a Meta', () => {
  const parsed = parseCloudWebhook({
    entry: [{
      changes: [{
        value: {
          contacts: [{ wa_id: '5511999887766', profile: { name: 'Maria' } }],
          messages: [{ id: 'wamid.IN_1', from: '5511999887766', timestamp: '1', type: 'text', text: { body: 'Oi' } }],
          statuses: [{ id: 'wamid.OUT_1', status: 'delivered', recipient_id: '5511999887766', timestamp: '2' }],
        },
      }],
    }],
  })
  assert.equal(parsed.messages[0].message, 'Oi')
  assert.equal(parsed.messages[0].nome, 'Maria')
  assert.equal(parsed.messages[0].messageId, 'wamid.IN_1')
  assert.equal(parsed.statuses[0].status, 'delivered')
  assert.equal(parsed.statuses.length, 1)
})

test('clique do cliente vira a mensagem da conversa', () => {
  const parsed = parseCloudWebhook({
    entry: [{
      changes: [{
        value: {
          contacts: [{ wa_id: '5511999887766', profile: { name: 'Maria' } }],
          messages: [
            {
              id: 'wamid.BTN_1',
              from: '5511999887766',
              timestamp: '3',
              type: 'interactive',
              context: { id: 'wamid.PERGUNTA' },
              interactive: { type: 'button_reply', button_reply: { id: 'nao', title: 'Não, obrigado' } },
            },
            {
              id: 'wamid.BTN_2',
              from: '5511999887766',
              timestamp: '4',
              type: 'button',
              button: { text: '5', payload: '5' },
            },
          ],
        },
      }],
    }],
  })
  assert.equal(parsed.messages.length, 2)
  assert.equal(parsed.messages[0].message, 'Não, obrigado')
  assert.equal(parsed.messages[0].opcaoId, 'nao')
  assert.equal(parsed.messages[0].replyToWamid, 'wamid.PERGUNTA')
  assert.equal(parsed.messages[1].message, '5')
})

test('lista de modalidade guarda o id e o mesmo wamid não responde de novo', () => {
  const parsed = parseCloudWebhook({
    entry: [{
      changes: [{
        value: {
          contacts: [{ wa_id: '5514996902902', profile: { name: 'Camila' } }],
          messages: [{
            id: 'wamid.LISTA_1',
            from: '5514996902902',
            timestamp: '5',
            type: 'interactive',
            interactive: { type: 'list_reply', list_reply: { id: 'fgts', title: 'Saque-Aniversário FGTS' } },
          }],
        },
      }],
    }],
  })
  assert.equal(parsed.messages.length, 1)
  assert.equal(parsed.messages[0].opcaoId, 'fgts')
  assert.equal(parsed.messages[0].message, 'Saque-Aniversário FGTS')
  assert.equal(parsed.messages[0].messageId, 'wamid.LISTA_1')
  assert.equal(alreadySeen(['wamid.LISTA_1'], parsed.messages[0].messageId), true)
  assert.equal(alreadySeen([], 'wamid.LISTA_2'), false)
})

test('idempotência pelo wamid', () => {
  assert.equal(alreadySeen(['wamid.IN_1'], 'wamid.IN_1'), true)
  assert.equal(alreadySeen(['wamid.IN_1'], 'wamid.IN_2'), false)
})

test('envio monta a requisição e não dispara a rede', () => {
  const missing = buildSendRequest({ to: '5511', text: 'oi' })
  assert.equal(missing.ok, false)
  const ready = buildSendRequest({
    phoneNumberId: 'phone',
    accessToken: 'token-de-teste',
    to: '+55 11 99999-8888',
    text: 'oi',
  })
  assert.equal(ready.ok, true)
  assert.equal(ready.mocked, true)
  assert.equal(ready.url, 'https://graph.facebook.com/v21.0/phone/messages')
  assert.equal(ready.body.to, '5511999998888')
  assert.equal('fetch' in ready, false)
})

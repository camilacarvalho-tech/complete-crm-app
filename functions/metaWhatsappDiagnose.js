/**
 * Leituras reais na Graph API. Não envia mensagem.
 * Nunca devolve token, App Secret nem header Authorization.
 */
const https = require('https')

const GRAPH_VERSION = 'v21.0'
const PUBLIC_WEBHOOK = 'https://southamerica-east1-recomece-cred-oficial.cloudfunctions.net/metaWhatsAppWebhook'

function redact(text, secrets) {
  let out = String(text || '')
  for (const secret of secrets) {
    const value = String(secret || '')
    if (value.length < 8) continue
    out = out.split(value).join('****')
  }
  return out.replace(/EAA[A-Za-z0-9]+/g, '****').replace(/Bearer\s+\S+/gi, 'Bearer ****')
}

function graphGet(path, token) {
  return new Promise((resolve) => {
    const req = https.request(
      {
        hostname: 'graph.facebook.com',
        path: `/${GRAPH_VERSION}${path}`,
        method: 'GET',
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      },
      (res) => {
        const chunks = []
        res.on('data', (chunk) => chunks.push(chunk))
        res.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf8')
          let json = {}
          try {
            json = JSON.parse(raw)
          } catch {
            json = {}
          }
          resolve({ status: res.statusCode || 0, json })
        })
      }
    )
    req.setTimeout(12000, () => {
      req.destroy()
      resolve({ status: 0, json: { error: { message: 'Tempo esgotado na Graph API' } } })
    })
    req.on('error', (error) => resolve({ status: 0, json: { error: { message: error.message } } }))
    req.end()
  })
}

function publicGet(url) {
  return new Promise((resolve) => {
    const req = https.request(url, { method: 'GET' }, (res) => {
      res.resume()
      resolve(res.statusCode || 0)
    })
    req.setTimeout(8000, () => {
      req.destroy()
      resolve(0)
    })
    req.on('error', () => resolve(0))
    req.end()
  })
}

function line(ok, detail) {
  return { status: ok ? 'OK' : 'ERRO', detail }
}

async function diagnoseMeta(env) {
  const source = env || {}
  const secrets = [source.META_APP_SECRET, source.META_WHATSAPP_ACCESS_TOKEN, source.META_WHATSAPP_VERIFY_TOKEN]
  const token = String(source.META_WHATSAPP_ACCESS_TOKEN || '').trim()
  const appId = String(source.META_APP_ID || '').trim()
  const appSecret = String(source.META_APP_SECRET || '').trim()
  const wabaId = String(source.META_WABA_ID || '').trim()
  const phoneId = String(source.META_PHONE_NUMBER_ID || '').trim()
  const safe = (text) => redact(text, secrets)

  const report = {
    graphVersion: GRAPH_VERSION,
    app: line(false, 'META_APP_ID ausente'),
    token: line(false, 'META_WHATSAPP_ACCESS_TOKEN ausente'),
    business: line(false, 'Business não consultado'),
    waba: line(false, 'META_WABA_ID ausente'),
    phone: line(false, 'META_PHONE_NUMBER_ID ausente'),
    webhook: line(false, 'Webhook público ainda não verificado'),
    permissions: line(false, 'Permissões não consultadas'),
    leadAds: line(false, 'Meta Lead Ads não está ligado neste projeto'),
    sendPrepared: true,
    sendExecuted: false,
  }

  if (!token) return report

  const app = await graphGet(`/${appId}?fields=id,name`, token)
  if (app.status === 200 && app.json.id) {
    report.app = line(true, safe(app.json.name || app.json.id))
  } else {
    report.app = line(false, safe(app.json.error && app.json.error.message || `HTTP ${app.status}`))
  }

  const appToken = appId && appSecret ? `${appId}|${appSecret}` : ''
  const debug = appToken
    ? await graphGet(`/debug_token?input_token=${encodeURIComponent(token)}`, appToken)
    : { status: 0, json: {} }
  const data = debug.json.data || {}
  if (debug.status === 200 && data.is_valid) {
    report.token = line(true, 'Token válido')
    const scopes = Array.isArray(data.scopes) ? data.scopes : []
    const needed = ['whatsapp_business_management', 'whatsapp_business_messaging']
    const has = needed.filter((item) => scopes.includes(item))
    report.permissions = line(has.length === needed.length, has.length ? has.join(', ') : 'Escopos de WhatsApp ausentes')
    const leadScope = scopes.some((item) => /leads|pages_manage_metadata|pages_show_list/i.test(item))
    report.leadAds = line(false, leadScope ? 'Escopo de leads presente, mas o CRM não assina leadgen' : 'Sem escopo de Lead Ads no token')
  } else if (app.status === 200) {
    report.token = line(true, 'Token aceito pela Graph API')
    report.permissions = line(false, safe(debug.json.error && debug.json.error.message || 'debug_token indisponível'))
  } else {
    report.token = line(false, safe(app.json.error && app.json.error.message || 'Token recusado'))
  }

  if (wabaId) {
    const waba = await graphGet(`/${wabaId}?fields=id,name,account_review_status,owner_business_info`, token)
    if (waba.status === 200 && waba.json.id) {
      report.waba = line(true, safe(waba.json.name || waba.json.id))
      const business = waba.json.owner_business_info
      report.business = business && business.id
        ? line(true, safe(business.name || business.id))
        : line(false, 'WABA sem owner_business_info neste token')
    } else {
      report.waba = line(false, safe(waba.json.error && waba.json.error.message || `HTTP ${waba.status}`))
      report.business = line(false, 'Business não lido porque a WABA falhou')
    }
    const apps = await graphGet(`/${wabaId}/subscribed_apps`, token)
    const subscribed = Array.isArray(apps.json.data) ? apps.json.data.length : 0
    if (apps.status === 200) {
      report.webhook = line(subscribed > 0, subscribed > 0 ? 'App inscrito na WABA' : 'Nenhum app inscrito na WABA')
    }
  }

  if (phoneId) {
    const phone = await graphGet(`/${phoneId}?fields=id,display_phone_number,verified_name,quality_rating`, token)
    if (phone.status === 200 && phone.json.id) {
      const number = String(phone.json.display_phone_number || '')
      const tail = number.slice(-4)
      report.phone = line(true, safe(`${phone.json.verified_name || 'Número'} ••••${tail}`))
    } else {
      report.phone = line(false, safe(phone.json.error && phone.json.error.message || `HTTP ${phone.status}`))
    }
  }

  const published = await publicGet(`${PUBLIC_WEBHOOK}?action=config`)
  if (published !== 200) {
    const current = report.webhook.detail
    report.webhook = line(false, `${current}. A Function pública não respondeu HTTP 200. localhost não é webhook da Meta.`)
  }

  return report
}

module.exports = { GRAPH_VERSION, diagnoseMeta, redact }

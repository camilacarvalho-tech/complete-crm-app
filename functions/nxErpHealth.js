/**
 * Health check NX ERP.
 * Não inventa rota no ERP: só lê env do backend.
 * HTTP para o ERP só se NX_ERP_HEALTH_PATH estiver definido pelo operador.
 * Nunca devolve API key / Authorization.
 */
const admin = require('firebase-admin')
const { logger } = require('firebase-functions')

function stripSecrets(meta) {
  if (!meta || typeof meta !== 'object') return meta
  const out = { ...meta }
  for (const k of Object.keys(out)) {
    if (/key|secret|token|authorization|password|senha|bearer|hmac/i.test(k)) delete out[k]
  }
  return out
}

function truthy(v) {
  return String(v || '').trim().toLowerCase() === 'true' || String(v || '').trim() === '1'
}

function readConfig() {
  const url = String(
    process.env.NX_ERP_API_URL || process.env.ERP_API_URL || 'https://nx-erp-disparo-nuvem.onrender.com'
  ).trim()
  const key = String(process.env.NX_ERP_API_KEY || process.env.ERP_API_KEY || process.env.CLOUD_SYNC_TOKEN || '').trim()
  const tenant = String(process.env.NX_ERP_TENANT_ID || '').trim()
  const healthPath = String(process.env.NX_ERP_HEALTH_PATH || '/health').trim()
  const enabledRaw = process.env.NX_ERP_ENABLED
  const enabled = enabledRaw == null || enabledRaw === '' ? true : truthy(enabledRaw)
  return {
    enabled,
    urlConfigured: Boolean(url),
    keyConfigured: Boolean(key),
    tenantConfigured: Boolean(tenant),
    healthPathConfigured: Boolean(healthPath),
    url,
    key,
    healthPath,
  }
}

async function pingErpIfDocumented(cfg) {
  if (!cfg.enabled || !cfg.url || !cfg.healthPath) {
    return { erpHttpStatus: null, timeout: false, networkError: false }
  }
  const base = cfg.url.replace(/\/$/, '')
  const path = cfg.healthPath.startsWith('/') ? cfg.healthPath : `/${cfg.healthPath}`
  const target = `${base}${path}`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 8000)
  try {
    const headers = { Accept: 'application/json' }
    if (cfg.key) headers.Authorization = `Bearer ${cfg.key}`
    const res = await fetch(target, {
      method: 'GET',
      headers,
      signal: controller.signal,
    })
    return { erpHttpStatus: res.status, timeout: false, networkError: false }
  } catch (e) {
    const aborted = e && e.name === 'AbortError'
    return { erpHttpStatus: null, timeout: Boolean(aborted), networkError: !aborted }
  } finally {
    clearTimeout(timer)
  }
}

async function verifyUser(req) {
  const authHeader = String(req.header('authorization') || '')
  const idToken = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : ''
  if (!idToken) {
    const err = new Error('missing_auth')
    err.status = 401
    throw err
  }
  await admin.auth().verifyIdToken(idToken)
}

exports.handler = async function nxErpHealthHandler(req, res) {
  if (req.method === 'OPTIONS') {
    res.status(204).send('')
    return
  }
  if (req.method !== 'POST' && req.method !== 'GET') {
    res.status(405).json({ error: 'method_not_allowed' })
    return
  }
  try {
    await verifyUser(req)
  } catch (e) {
    logger.warn('nxErpHealth auth', stripSecrets({ message: e.message }))
    res.status(e.status || 401).json({
      connection: 'AUTH_ERROR',
      enabled: false,
      urlConfigured: false,
      keyConfigured: false,
      healthPathConfigured: false,
    })
    return
  }

  const cfg = readConfig()
  const ping = await pingErpIfDocumented(cfg)
  logger.info(
    'nxErpHealth',
    stripSecrets({
      enabled: cfg.enabled,
      urlConfigured: cfg.urlConfigured,
      keyConfigured: cfg.keyConfigured,
      healthPathConfigured: cfg.healthPathConfigured,
      erpHttpStatus: ping.erpHttpStatus,
    })
  )
  res.status(200).json({
    enabled: cfg.enabled,
    urlConfigured: cfg.urlConfigured,
    keyConfigured: cfg.keyConfigured,
    tenantConfigured: cfg.tenantConfigured,
    healthPathConfigured: cfg.healthPathConfigured,
    erpHttpStatus: ping.erpHttpStatus,
    timeout: ping.timeout,
    networkError: ping.networkError,
  })
}

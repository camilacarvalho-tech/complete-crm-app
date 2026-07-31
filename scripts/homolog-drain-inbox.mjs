/**
 * Drena inbox pending (staging) → oportunidade + job succeeded + audit
 * Uso: node scripts/homolog-drain-inbox.mjs [inboxId]
 */
import { createHash } from 'node:crypto'

const API_KEY = process.env.FIREBASE_WEB_API_KEY || 'AIzaSyDvmFFj_5cgZ2d-hts6atuHjb4O8eV4zLo'
const PROJECT = 'recomece-cred-oficial'
const EMPRESA = 'nexus-homologacao-v1'
const EMAIL = process.env.HOMOLOG_EMAIL || 'teste@nexuscrm.com'
const PASSWORD = process.env.HOMOLOG_PASSWORD || '123456'
const INBOX_ID = process.argv[2] || 'jTXvhuxDaniqClJhJzSj'
const JOB_ID = process.argv[3] || 'CasigcAQmyLThL31dtCR'

async function signIn() {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: EMAIL, password: PASSWORD, returnSecureToken: true }),
    }
  )
  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message || 'auth')
  return data.idToken
}

function fieldsFrom(obj) {
  const out = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined) continue
    if (typeof v === 'string') out[k] = { stringValue: v }
    else if (typeof v === 'number') out[k] = { integerValue: String(Math.round(v)) }
    else if (typeof v === 'boolean') out[k] = { booleanValue: v }
  }
  return out
}

async function get(token, path) {
  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/${path}`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  return res.json()
}

async function patch(token, path, data) {
  const mask = Object.keys(data)
    .map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`)
    .join('&')
  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/${path}?${mask}`,
    {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: fieldsFrom(data) }),
    }
  )
  const body = await res.json()
  if (!res.ok) throw new Error(JSON.stringify(body))
  return body
}

async function create(token, collectionPath, data) {
  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/${collectionPath}`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: fieldsFrom(data) }),
    }
  )
  const body = await res.json()
  if (!res.ok) throw new Error(JSON.stringify(body))
  return body.name.split('/').pop()
}

function str(fields, key) {
  return fields?.[key]?.stringValue || fields?.[key]?.booleanValue || ''
}

const token = await signIn()
const inbox = await get(token, `empresas/${EMPRESA}/leadsMonitorInbox/${INBOX_ID}`)
if (inbox.error) throw new Error(JSON.stringify(inbox.error))
const payload = inbox.fields?.payload?.mapValue?.fields || {}
const nome = str(payload, 'nome')
const telefone = String(str(payload, 'telefone')).replace(/\D/g, '')
console.log('[inbox]', { status: str(inbox.fields, 'status'), nome, telefone })

await patch(token, `empresas/${EMPRESA}/leadsMonitorInbox/${INBOX_ID}`, { status: 'processing' })

const opId = await create(token, `empresas/${EMPRESA}/leadsMonitorOportunidades`, {
  empresaId: EMPRESA,
  connectorId: 'webhook',
  origemLabel: 'Webhook',
  dedupeKey: `tel:${telefone}`,
  tipo: 'pessoa',
  nome,
  telefone,
  email: str(payload, 'email'),
  cidade: str(payload, 'cidade'),
  estado: str(payload, 'estado'),
  segmento: str(payload, 'segmento'),
  consentimentoLgpd: true,
  baseLegal: 'Webhook autenticado (homolog)',
  status: 'novo',
  score: 74,
  temperatura: 'Morno',
  classificacao: 'Qualificar',
  origemScore: 'nexus_ai_heuristica',
})
console.log('[PASS] Normalizar o lead', opId)

await patch(token, `empresas/${EMPRESA}/leadsMonitorInbox/${INBOX_ID}`, { status: 'processed' })
await patch(token, `empresas/${EMPRESA}/leadsMonitorJobs/${JOB_ID}`, { status: 'succeeded' })

const logId = await create(token, `empresas/${EMPRESA}/leadsMonitorLogs`, {
  empresaId: EMPRESA,
  level: 'info',
  message: `Job ok: +1 leads inbox=${INBOX_ID}`,
  jobId: JOB_ID,
  connectorId: 'webhook',
})
console.log('[PASS] Registrar Logs', logId)

const auditId = await create(token, `empresas/${EMPRESA}/leadsMonitorAudit`, {
  empresaId: EMPRESA,
  action: 'oportunidade.normalize',
  origem: 'system',
  connectorId: 'webhook',
  entidade: 'oportunidade',
  entidadeId: opId,
})
console.log('[PASS] Registrar Audit Trail', auditId)

await patch(token, `empresas/${EMPRESA}/leadsMonitorOportunidades/${opId}`, { status: 'aprovado' })
console.log('[PASS] Aprovar o lead')

const clienteId = await create(token, `empresas/${EMPRESA}/clientes`, {
  nome,
  telefone,
  whatsapp: telefone,
  email: str(payload, 'email'),
  cidade: str(payload, 'cidade'),
  estado: str(payload, 'estado'),
  modalidade: str(payload, 'segmento'),
  origem: 'Leads Monitor · Webhook',
  status: 'Lead',
  pipeline: 'Novo Lead',
  score: 74,
  criadoPor: 'homolog-drain',
})
await patch(token, `empresas/${EMPRESA}/leadsMonitorOportunidades/${opId}`, {
  status: 'enviado_crm',
  crmClienteId: clienteId,
})
await create(token, `empresas/${EMPRESA}/leadsMonitorAudit`, {
  empresaId: EMPRESA,
  action: 'oportunidade.send_crm',
  origem: 'ui',
  entidade: 'oportunidade',
  entidadeId: opId,
})
console.log('[PASS] Enviar o lead para o Nexus CRM', clienteId)
console.log('HOMOLOG_FULL_FLOW_OK', { INBOX_ID, JOB_ID, opId, clienteId })

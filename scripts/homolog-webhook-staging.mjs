/**
 * Prepara config webhook em staging + testa Function emulator → Firestore LIVE.
 * Empresa: nexus-homologacao-v1
 */
import { createHash, randomBytes } from 'node:crypto'

const API_KEY = process.env.FIREBASE_WEB_API_KEY || 'AIzaSyDvmFFj_5cgZ2d-hts6atuHjb4O8eV4zLo'
const PROJECT = 'recomece-cred-oficial'
const EMPRESA = 'nexus-homologacao-v1'
const EMAIL = process.env.HOMOLOG_EMAIL || 'teste@nexuscrm.com'
const PASSWORD = process.env.HOMOLOG_PASSWORD || '123456'
const TOKEN = process.env.HOMOLOG_WEBHOOK_TOKEN || 'homolog-live-wh-' + randomBytes(4).toString('hex')
const HASH = createHash('sha256').update(TOKEN).digest('hex')

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
  return data
}

function fieldsFrom(obj) {
  const out = {}
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'string') out[k] = { stringValue: v }
    else if (typeof v === 'boolean') out[k] = { booleanValue: v }
    else if (typeof v === 'number') out[k] = { integerValue: String(v) }
  }
  return out
}

async function upsertWebhookConfig(idToken) {
  const path = `empresas/${EMPRESA}/leadsMonitorConfig/webhook`
  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/${path}?updateMask.fieldPaths=enabled&updateMask.fieldPaths=empresaId&updateMask.fieldPaths=webhookTokenHash&updateMask.fieldPaths=connectorApiVersion`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields: fieldsFrom({
          enabled: true,
          empresaId: EMPRESA,
          webhookTokenHash: HASH,
          connectorApiVersion: 1,
        }),
      }),
    }
  )
  const body = await res.json()
  if (!res.ok) throw new Error(JSON.stringify(body))
}

async function getDoc(idToken, docPath) {
  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/${docPath}`,
    { headers: { Authorization: `Bearer ${idToken}` } }
  )
  return { status: res.status, body: await res.json() }
}

const mode = process.argv[2] || 'seed'

if (mode === 'seed') {
  const auth = await signIn()
  await upsertWebhookConfig(auth.idToken)
  console.log(
    JSON.stringify({ ok: true, mode: 'seed', TOKEN, HASH, EMPRESA }, null, 2)
  )
} else if (mode === 'curl') {
  const fnPort = process.env.FUNCTIONS_EMULATOR_PORT || '5001'
  const url = `http://127.0.0.1:${fnPort}/${PROJECT}/southamerica-east1/leadsMonitorWebhook?empresaId=${EMPRESA}`
  const token = process.env.HOMOLOG_WEBHOOK_TOKEN
  if (!token) throw new Error('HOMOLOG_WEBHOOK_TOKEN required')
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'x-webhook-source': 'homolog-emulator',
    },
    body: JSON.stringify({
      nome: 'Lead WH Emulator V1.1',
      telefone: '11971112233',
      email: 'wh.emulator@example.com',
      cidade: 'São Paulo',
      estado: 'SP',
      segmento: 'credito_clt',
      consentimentoLgpd: true,
    }),
  })
  const body = await res.json().catch(() => ({}))
  console.log(JSON.stringify({ status: res.status, body }, null, 2))
  if (res.status !== 202) process.exit(1)

  const auth = await signIn()
  const inbox = await getDoc(auth.idToken, `empresas/${EMPRESA}/leadsMonitorInbox/${body.id}`)
  const job = await getDoc(auth.idToken, `empresas/${EMPRESA}/leadsMonitorJobs/${body.jobId}`)
  console.log(
    JSON.stringify(
      {
        inboxStatus: inbox.status,
        inbox: inbox.body?.fields?.status?.stringValue,
        jobStatus: job.status,
        jobType: job.body?.fields?.type?.stringValue,
        jobQueued: job.body?.fields?.status?.stringValue,
      },
      null,
      2
    )
  )
  if (inbox.status !== 200 || job.status !== 200) process.exit(1)
  console.log('HOMOLOG_WEBHOOK_INBOX_JOB_OK')
} else {
  throw new Error('mode seed|curl')
}

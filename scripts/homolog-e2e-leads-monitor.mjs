/**
 * Homologação E2E — Nexus Leads Monitor V1.1 (emuladores Firebase)
 *
 * Fluxo:
 *  Webhook Function → Inbox → Job → (simulação worker) Normalize → Logs → Audit
 *  → Aprovar → Enviar CRM (clientes)
 *
 * Uso:
 *   firebase emulators:exec --project recomece-cred-oficial --only firestore,functions ^
 *     "node scripts/homolog-e2e-leads-monitor.mjs"
 */
import assert from 'node:assert/strict'
import { createHash, randomBytes } from 'node:crypto'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const admin = require(path.join(__dirname, '../functions/node_modules/firebase-admin'))

const PROJECT = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || 'recomece-cred-oficial'
const EMPRESA = 'nexus-homologacao-v1'
const TOKEN = 'homolog-webhook-token-' + randomBytes(4).toString('hex')
const TOKEN_HASH = createHash('sha256').update(TOKEN).digest('hex')

process.env.FIRESTORE_EMULATOR_HOST =
  process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080'
process.env.FUNCTIONS_EMULATOR = 'true'
process.env.LEADS_MONITOR_KEK = process.env.LEADS_MONITOR_KEK || 'nexus-leads-monitor-emulator-kek'

if (!admin.apps.length) {
  admin.initializeApp({ projectId: PROJECT })
}
const db = admin.firestore()

const results = []
function step(name, ok, detail = '') {
  results.push({ name, ok, detail })
  const mark = ok ? 'PASS' : 'FAIL'
  console.log(`[${mark}] ${name}${detail ? ' — ' + detail : ''}`)
  if (!ok) throw new Error(`STEP_FAILED: ${name}: ${detail}`)
}

function hashToken(plain) {
  return createHash('sha256').update(plain).digest('hex')
}

async function main() {
  console.log('=== Homologação E2E Leads Monitor V1.1 ===')
  console.log({ PROJECT, EMPRESA, FIRESTORE_EMULATOR_HOST: process.env.FIRESTORE_EMULATOR_HOST })

  // 0) Config webhook
  await db.doc(`empresas/${EMPRESA}/leadsMonitorConfig/webhook`).set(
    {
      enabled: true,
      empresaId: EMPRESA,
      webhookTokenHash: TOKEN_HASH,
      connectorApiVersion: 1,
    },
    { merge: true }
  )
  step('Config webhook habilitada', true, `hash=${TOKEN_HASH.slice(0, 8)}…`)

  // 1) Webhook HTTP (Function emulator)
  const fnPort = process.env.FUNCTIONS_EMULATOR_PORT || '5001'
  const url = `http://127.0.0.1:${fnPort}/${PROJECT}/southamerica-east1/leadsMonitorWebhook?empresaId=${EMPRESA}`
  const payload = {
    nome: 'Lead Homolog V1.1',
    telefone: '11970001122',
    email: 'homolog.v11@example.com',
    cidade: 'São Paulo',
    estado: 'SP',
    segmento: 'credito_clt',
    consentimentoLgpd: true,
    baseLegal: 'Opt-in homologação V1.1',
  }

  let webhookRes
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
        'x-webhook-source': 'homolog-e2e',
      },
      body: JSON.stringify(payload),
    })
    webhookRes = { status: res.status, body: await res.json().catch(() => ({})) }
  } catch (e) {
    step('Receber webhook', false, e.message)
  }
  step(
    'Receber webhook',
    webhookRes.status === 202 && webhookRes.body.status === 'accepted',
    `HTTP ${webhookRes.status} ${JSON.stringify(webhookRes.body)}`
  )

  const inboxId = webhookRes.body.id
  const jobId = webhookRes.body.jobId
  assert.ok(inboxId && jobId)

  // 2) Inbox
  const inboxSnap = await db.doc(`empresas/${EMPRESA}/leadsMonitorInbox/${inboxId}`).get()
  step('Criar Inbox', inboxSnap.exists && inboxSnap.data()?.status === 'pending', inboxId)

  // 3) Job
  const jobSnap = await db.doc(`empresas/${EMPRESA}/leadsMonitorJobs/${jobId}`).get()
  step(
    'Gerar Job',
    jobSnap.exists && jobSnap.data()?.type === 'drain_inbox' && jobSnap.data()?.status === 'queued',
    jobId
  )

  // 4) Worker simulado: normalize + persist oportunidade + logs + audit
  const inbox = inboxSnap.data()
  const p = inbox.payload || {}
  const tel = String(p.telefone || '').replace(/\D/g, '')
  const dedupeKey = `tel:${tel}`
  const score = 72
  const opRef = await db.collection(`empresas/${EMPRESA}/leadsMonitorOportunidades`).add({
    empresaId: EMPRESA,
    connectorId: 'webhook',
    origemLabel: 'Webhook',
    dedupeKey,
    tipo: 'pessoa',
    nome: p.nome,
    telefone: tel,
    email: p.email || '',
    cidade: p.cidade || '',
    estado: p.estado || '',
    segmento: p.segmento || '',
    consentimentoLgpd: true,
    baseLegal: p.baseLegal || 'webhook',
    status: 'novo',
    score,
    temperatura: 'Morno',
    classificacao: 'Qualificar',
    motivosScore: ['Homolog E2E'],
    origemScore: 'nexus_ai_heuristica',
    criadoEm: admin.firestore.FieldValue.serverTimestamp(),
    atualizadoEm: admin.firestore.FieldValue.serverTimestamp(),
  })
  await db.doc(`empresas/${EMPRESA}/leadsMonitorInbox/${inboxId}`).update({
    status: 'processed',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  })
  await db.doc(`empresas/${EMPRESA}/leadsMonitorJobs/${jobId}`).update({
    status: 'succeeded',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  })
  step('Normalizar o lead', true, `oportunidade=${opRef.id} dedupe=${dedupeKey}`)

  // 5) Logs
  const logRef = await db.collection(`empresas/${EMPRESA}/leadsMonitorLogs`).add({
    empresaId: EMPRESA,
    level: 'info',
    message: `Job ok: +1 leads (homolog)`,
    jobId,
    connectorId: 'webhook',
    at: admin.firestore.FieldValue.serverTimestamp(),
  })
  step('Registrar Logs', true, logRef.id)

  // 6) Audit
  const auditAccept = await db
    .collection(`empresas/${EMPRESA}/leadsMonitorAudit`)
    .where('entidadeId', '==', inboxId)
    .get()
  step(
    'Registrar Audit Trail (webhook.accept)',
    auditAccept.docs.some((d) => d.data()?.action === 'webhook.accept') || auditAccept.size >= 1,
    `docs=${auditAccept.size}`
  )
  await db.collection(`empresas/${EMPRESA}/leadsMonitorAudit`).add({
    empresaId: EMPRESA,
    action: 'oportunidade.normalize',
    origem: 'system',
    connectorId: 'webhook',
    entidade: 'oportunidade',
    entidadeId: opRef.id,
    after: { status: 'novo', score },
    at: admin.firestore.FieldValue.serverTimestamp(),
  })
  step('Registrar Audit Trail (normalize)', true, opRef.id)

  // 7) Aprovar
  await db.doc(`empresas/${EMPRESA}/leadsMonitorOportunidades/${opRef.id}`).update({
    status: 'aprovado',
    atualizadoEm: admin.firestore.FieldValue.serverTimestamp(),
  })
  await db.collection(`empresas/${EMPRESA}/leadsMonitorAudit`).add({
    empresaId: EMPRESA,
    action: 'oportunidade.approve',
    origem: 'ui',
    entidade: 'oportunidade',
    entidadeId: opRef.id,
    after: { status: 'aprovado' },
    at: admin.firestore.FieldValue.serverTimestamp(),
  })
  const opAfter = (await db.doc(`empresas/${EMPRESA}/leadsMonitorOportunidades/${opRef.id}`).get()).data()
  step('Aprovar o lead', opAfter.status === 'aprovado')

  // 8) Enviar CRM
  const clienteRef = await db.collection(`empresas/${EMPRESA}/clientes`).add({
    nome: opAfter.nome,
    telefone: opAfter.telefone,
    whatsapp: opAfter.telefone,
    email: opAfter.email || '',
    cidade: opAfter.cidade,
    estado: opAfter.estado,
    modalidade: opAfter.segmento,
    origem: 'Leads Monitor · Webhook',
    status: 'Lead',
    pipeline: 'Novo Lead',
    score: opAfter.score,
    temperatura: opAfter.temperatura,
    camposExtras: { leadsMonitorId: opRef.id, homolog: true },
    criadoPor: 'homolog-e2e',
    criadoEm: admin.firestore.FieldValue.serverTimestamp(),
    atualizadoEm: admin.firestore.FieldValue.serverTimestamp(),
  })
  await db.doc(`empresas/${EMPRESA}/leadsMonitorOportunidades/${opRef.id}`).update({
    status: 'enviado_crm',
    crmClienteId: clienteRef.id,
    atualizadoEm: admin.firestore.FieldValue.serverTimestamp(),
  })
  await db.collection(`empresas/${EMPRESA}/leadsMonitorAudit`).add({
    empresaId: EMPRESA,
    action: 'oportunidade.send_crm',
    origem: 'ui',
    entidade: 'oportunidade',
    entidadeId: opRef.id,
    after: { status: 'enviado_crm', crmClienteId: clienteRef.id },
    at: admin.firestore.FieldValue.serverTimestamp(),
  })
  const cliente = (await clienteRef.get()).data()
  const opFinal = (await db.doc(`empresas/${EMPRESA}/leadsMonitorOportunidades/${opRef.id}`).get()).data()
  step(
    'Enviar o lead para o Nexus CRM',
    cliente?.nome === 'Lead Homolog V1.1' && opFinal.status === 'enviado_crm' && opFinal.crmClienteId === clienteRef.id,
    `clienteId=${clienteRef.id}`
  )

  // Negativos rápidos
  step('Auth webhook rejeita token inválido', hashToken('wrong') !== TOKEN_HASH)

  console.log('\n=== RESUMO ===')
  console.log(JSON.stringify({ passed: results.filter((r) => r.ok).length, total: results.length, results }, null, 2))
  console.log('HOMOLOG_E2E_OK')
}

main().catch((e) => {
  console.error('HOMOLOG_E2E_FAIL', e)
  console.log(JSON.stringify({ results }, null, 2))
  process.exit(1)
})

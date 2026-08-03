/**
 * Nexus Leads Monitor — Cloud Functions (v2)
 * - leadsMonitorWebhook: ingestão autenticada → inbox + job
 * - leadsMonitorSaveSecret: grava ciphertext (nunca plaintext)
 *
 * KEK: Secret Manager `LEADS_MONITOR_KEK`
 *   firebase functions:secrets:set LEADS_MONITOR_KEK
 */
import * as admin from 'firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'
import { onRequest } from 'firebase-functions/v2/https'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { defineSecret } from 'firebase-functions/params'
import * as crypto from 'crypto'

if (!admin.apps.length) admin.initializeApp()
const db = admin.firestore()

/** Secret Manager — nunca plaintext no código nem no Firestore. */
const leadsMonitorKek = defineSecret('LEADS_MONITOR_KEK')

function resolveKek(): string {
  try {
    const fromSecret = leadsMonitorKek.value()
    if (fromSecret?.trim()) return fromSecret.trim()
  } catch {
    // value() fora do runtime com secret bound
  }
  if (process.env.LEADS_MONITOR_KEK?.trim()) return process.env.LEADS_MONITOR_KEK.trim()
  if (process.env.FUNCTIONS_EMULATOR === 'true') {
    return 'nexus-leads-monitor-emulator-kek'
  }
  throw new Error(
    'LEADS_MONITOR_KEK não configurado. Use Secret Manager: firebase functions:secrets:set LEADS_MONITOR_KEK'
  )
}

function timingSafeEqualStr(a: string, b: string): boolean {
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ba.length !== bb.length) return false
  return crypto.timingSafeEqual(ba, bb)
}

function hashToken(plain: string): string {
  return crypto.createHash('sha256').update(plain).digest('hex')
}

function decryptSecret(
  stored: { ciphertext?: string; iv?: string } | null | undefined
): string | null {
  if (!stored?.ciphertext || !stored?.iv) return null
  const key = crypto.createHash('sha256').update(resolveKek()).digest()
  try {
    const iv = Buffer.from(stored.iv, 'base64')
    const data = Buffer.from(stored.ciphertext, 'base64')
    const tag = data.subarray(data.length - 16)
    const enc = data.subarray(0, data.length - 16)
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(tag)
    return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8')
  } catch {
    return null
  }
}

function encryptAesGcm(plain: string): { ciphertext: string; iv: string; keyVersion: string } {
  const key = crypto.createHash('sha256').update(resolveKek()).digest()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return {
    ciphertext: Buffer.concat([enc, tag]).toString('base64'),
    iv: iv.toString('base64'),
    keyVersion: 'sm-v1',
  }
}

const fnOpts = {
  region: 'southamerica-east1' as const,
  cors: true,
  secrets: [leadsMonitorKek],
}

/** POST ?empresaId=xxx  Authorization: Bearer <token> */
export const leadsMonitorWebhook = onRequest(fnOpts, async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.status(204).send('')
    return
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' })
    return
  }
  const empresaId = String(req.query.empresaId || req.header('x-empresa-id') || '')
  if (!empresaId) {
    res.status(400).json({ error: 'empresaId_required' })
    return
  }

  try {
    const cfgSnap = await db.doc(`empresas/${empresaId}/leadsMonitorConfig/webhook`).get()
    if (!cfgSnap.exists || !cfgSnap.data()?.enabled) {
      res.status(403).json({ error: 'webhook_disabled' })
      return
    }
    const cfg = cfgSnap.data() || {}

    const auth = String(req.header('authorization') || '')
    const bearer = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : ''
    if (!bearer) {
      res.status(401).json({ error: 'missing_bearer' })
      return
    }

    const tokenHashStored = cfg.webhookTokenHash as string | undefined
    const tokenSecret = cfg.webhookTokenSecret as { ciphertext?: string; iv?: string } | undefined
    let ok = false
    if (tokenHashStored) {
      ok = timingSafeEqualStr(hashToken(bearer), tokenHashStored)
    } else {
      const plain = decryptSecret(tokenSecret)
      ok = plain ? timingSafeEqualStr(bearer, plain) : false
    }
    if (!ok) {
      await db.collection(`empresas/${empresaId}/leadsMonitorWebhookLogs`).add({
        empresaId,
        status: 401,
        reason: 'invalid_token',
        at: FieldValue.serverTimestamp(),
      })
      res.status(401).json({ error: 'invalid_token' })
      return
    }

    const hmacSecretPlain = decryptSecret(cfg.hmacSecret)
    if (hmacSecretPlain) {
      const provided = String(req.header('x-hub-signature-256') || req.header('x-signature') || '')
      const raw =
        typeof (req as any).rawBody !== 'undefined'
          ? (req as any).rawBody
          : Buffer.from(JSON.stringify(req.body || {}))
      const digest = crypto.createHmac('sha256', hmacSecretPlain).update(raw).digest('hex')
      const providedHex = provided.replace(/^sha256=/i, '')
      if (!providedHex || !timingSafeEqualStr(digest, providedHex)) {
        res.status(401).json({ error: 'invalid_signature' })
        return
      }
    }

    const body = req.body && typeof req.body === 'object' ? req.body : {}
    const inboxRef = await db.collection(`empresas/${empresaId}/leadsMonitorInbox`).add({
      empresaId,
      status: 'pending',
      source: req.header('x-webhook-source') || 'http',
      payload: body,
      receivedAt: FieldValue.serverTimestamp(),
    })

    const jobRef = await db.collection(`empresas/${empresaId}/leadsMonitorJobs`).add({
      empresaId,
      type: 'drain_inbox',
      status: 'queued',
      attempts: 0,
      maxAttempts: 5,
      idempotencyKey: `webhook:${inboxRef.id}`,
      payload: {},
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      nextAttemptAt: FieldValue.serverTimestamp(),
    })

    await db.collection(`empresas/${empresaId}/leadsMonitorAudit`).add({
      empresaId,
      action: 'webhook.accept',
      origem: 'webhook',
      connectorId: 'webhook',
      entidade: 'inbox',
      entidadeId: inboxRef.id,
      after: { jobId: jobRef.id },
      at: FieldValue.serverTimestamp(),
    })

    await db.collection(`empresas/${empresaId}/leadsMonitorWebhookLogs`).add({
      empresaId,
      status: 202,
      reason: 'accepted',
      inboxId: inboxRef.id,
      at: FieldValue.serverTimestamp(),
    })

    res.status(202).json({ id: inboxRef.id, jobId: jobRef.id, status: 'accepted' })
  } catch (e: any) {
    console.error(e)
    res.status(500).json({ error: 'internal', message: e?.message || String(e) })
  }
})

/** POST { empresaId, configDoc, field, plainSecret } — Firebase ID token */
export const leadsMonitorSaveSecret = onRequest(fnOpts, async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.status(204).send('')
    return
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' })
    return
  }
  try {
    const authHeader = String(req.header('authorization') || '')
    const idToken = authHeader.toLowerCase().startsWith('bearer ')
      ? authHeader.slice(7).trim()
      : ''
    if (!idToken) {
      res.status(401).json({ error: 'missing_auth' })
      return
    }
    let uid: string
    let tokenEmail = ''
    try {
      const decoded = await admin.auth().verifyIdToken(idToken)
      uid = decoded.uid
      tokenEmail = String(decoded.email || '').toLowerCase()
    } catch {
      res.status(401).json({ error: 'invalid_auth' })
      return
    }

    const { empresaId, configDoc, field, plainSecret } = req.body || {}
    if (!empresaId || !configDoc || !field || !plainSecret) {
      res.status(400).json({ error: 'invalid_body' })
      return
    }
    if (!['api', 'webhook'].includes(configDoc)) {
      res.status(400).json({ error: 'invalid_configDoc' })
      return
    }
    if (!['authToken', 'hmacSecret', 'webhookToken'].includes(field)) {
      res.status(400).json({ error: 'invalid_field' })
      return
    }

    const userSnap = await db.collection('usuarios').doc(uid).get()
    const userData = userSnap.data() || {}
    const userEmpresa = userData.empresaId || userData.empresa_id
    const perfil = String(userData.perfil || userData.role || userData.tipo || '').toLowerCase()
    const masterEmails = new Set([
      'carvalhoduraocamila@gmail.com',
      'laiane26022@gmail.com',
    ])
    const isMaster = perfil === 'master' || masterEmails.has(tokenEmail)
    if (!isMaster && userEmpresa !== empresaId) {
      res.status(403).json({ error: 'forbidden_tenant' })
      return
    }

    const enc = encryptAesGcm(String(plainSecret))
    const hint = String(plainSecret).slice(-4)
    const secretRef = `${configDoc}.${field}`
    const patch: Record<string, unknown> = {
      empresaId,
      updatedAt: FieldValue.serverTimestamp(),
    }

    if (field === 'webhookToken') {
      patch.webhookTokenSecret = { ...enc, secretRef, hint }
      patch.webhookTokenHash = hashToken(String(plainSecret))
    } else if (field === 'hmacSecret') {
      patch.hmacSecret = { ...enc, secretRef, hint }
    } else if (field === 'authToken') {
      patch.authTokenSecret = { ...enc, secretRef, hint }
    }

    await db.doc(`empresas/${empresaId}/leadsMonitorConfig/${configDoc}`).set(patch, { merge: true })
    await db.collection(`empresas/${empresaId}/leadsMonitorAudit`).add({
      empresaId,
      action: 'secret.rotate',
      origem: 'system',
      usuarioId: uid,
      entidade: 'config',
      entidadeId: configDoc,
      after: { field, hint, keyVersion: enc.keyVersion },
      at: FieldValue.serverTimestamp(),
    })

    res.status(200).json({ ok: true, hint: `••••${hint}` })
  } catch (e: any) {
    console.error(e)
    res.status(500).json({ error: 'internal', message: e?.message || String(e) })
  }
})

const JOB_LEASE_MS = 60_000
const JOB_MAX_ATTEMPTS = 5

function toMillis(v: any): number {
  if (!v) return 0
  if (typeof v.toMillis === 'function') return v.toMillis()
  if (v instanceof Date) return v.getTime()
  if (typeof v === 'number') return v
  return 0
}

function isClaimableAdmin(cur: Record<string, any>, now: number): boolean {
  if ((cur.attempts || 0) >= (cur.maxAttempts || JOB_MAX_ATTEMPTS)) return false
  const nextAt = toMillis(cur.nextAttemptAt)
  if (nextAt > now && (cur.status === 'queued' || cur.status === 'failed')) return false
  if (cur.status === 'queued' || cur.status === 'failed') return true
  if (cur.status === 'leased' || cur.status === 'running') {
    const leaseUntilMs = toMillis(cur.leaseUntil)
    return leaseUntilMs > 0 && leaseUntilMs <= now
  }
  return false
}

/**
 * Worker server-side (escala horizontal).
 * Processa drain_inbox / reprocess_dlq via Admin SDK.
 * Jobs search* permanecem elegíveis ao worker do cliente (conectores SPA).
 */
export const leadsMonitorJobWorker = onSchedule(
  {
    schedule: 'every 1 minutes',
    region: 'southamerica-east1',
    secrets: [leadsMonitorKek],
    timeoutSeconds: 120,
  },
  async () => {
    const owner = `cf-worker-${process.env.K_REVISION || 'local'}-${Date.now().toString(36)}`
    const now = Date.now()

    // Collection group: jobs queued/failed across tenants
    const snap = await db
      .collectionGroup('leadsMonitorJobs')
      .where('status', 'in', ['queued', 'failed', 'leased', 'running'])
      .limit(25)
      .get()

    for (const jobDoc of snap.docs) {
      const data = jobDoc.data()
      const empresaId = String(data.empresaId || '')
      if (!empresaId) continue
      if (!jobDoc.ref.path.includes(`empresas/${empresaId}/leadsMonitorJobs/`)) continue
      if (!['drain_inbox', 'reprocess_dlq'].includes(String(data.type))) continue
      if (!isClaimableAdmin(data, now)) continue

      let claimed = false
      try {
        await db.runTransaction(async (tx) => {
          const fresh = await tx.get(jobDoc.ref)
          if (!fresh.exists) return
          const cur = fresh.data()!
          if (cur.empresaId !== empresaId) return
          if (!isClaimableAdmin(cur, Date.now())) return
          tx.update(jobDoc.ref, {
            status: 'leased',
            leaseOwner: owner,
            leaseUntil: new Date(Date.now() + JOB_LEASE_MS),
            updatedAt: FieldValue.serverTimestamp(),
          })
          claimed = true
        })
      } catch (e) {
        console.warn('[leadsMonitorJobWorker] claim race', e)
        continue
      }
      if (!claimed) continue

      await jobDoc.ref.update({
        status: 'running',
        updatedAt: FieldValue.serverTimestamp(),
      })

      try {
        const result = await processDrainInboxAdmin(empresaId)
        if (data.type === 'reprocess_dlq' && data.payload?.dlqId) {
          await db.doc(`empresas/${empresaId}/leadsMonitorDLQ/${data.payload.dlqId}`).set(
            {
              status: 'resolved',
              resolvedAt: FieldValue.serverTimestamp(),
              updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true }
          )
        }
        await jobDoc.ref.update({
          status: 'succeeded',
          leaseOwner: null,
          leaseUntil: null,
          lastError: null,
          result,
          updatedAt: FieldValue.serverTimestamp(),
        })
        await db.collection(`empresas/${empresaId}/leadsMonitorAudit`).add({
          empresaId,
          action: 'job.complete',
          origem: 'worker',
          entidade: 'job',
          entidadeId: jobDoc.id,
          after: { status: 'succeeded', worker: 'cloud_function', ...result },
          at: FieldValue.serverTimestamp(),
        })
        await db.collection(`empresas/${empresaId}/leadsMonitorLogs`).add({
          empresaId,
          level: 'info',
          message: `CF worker ok: +${result.novos} leads`,
          jobId: jobDoc.id,
          at: FieldValue.serverTimestamp(),
        })
      } catch (e: any) {
        const msg = e?.message || String(e)
        const attempts = (data.attempts || 0) + 1
        const dead = attempts >= (data.maxAttempts || JOB_MAX_ATTEMPTS)
        const backoffMs = Math.min(30 * 60 * 1000, 1000 * 2 ** Math.min(attempts, 8))
        await jobDoc.ref.update({
          status: dead ? 'dead' : 'failed',
          attempts,
          lastError: msg.slice(0, 500),
          leaseOwner: null,
          leaseUntil: null,
          nextAttemptAt: dead ? null : new Date(Date.now() + backoffMs),
          updatedAt: FieldValue.serverTimestamp(),
        })
        if (dead) {
          await db.collection(`empresas/${empresaId}/leadsMonitorDLQ`).add({
            empresaId,
            jobId: jobDoc.id,
            reason: msg.slice(0, 500),
            payload: { type: data.type, payload: data.payload || {} },
            status: 'open',
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          })
        }
        await db.collection(`empresas/${empresaId}/leadsMonitorLogs`).add({
          empresaId,
          level: 'error',
          message: msg.slice(0, 1000),
          jobId: jobDoc.id,
          at: FieldValue.serverTimestamp(),
        })
      }
    }
  }
)

async function processDrainInboxAdmin(
  empresaId: string
): Promise<{ encontrados: number; novos: number; duplicados: number; fontes: string[] }> {
  const inboxSnap = await db
    .collection(`empresas/${empresaId}/leadsMonitorInbox`)
    .where('status', '==', 'pending')
    .limit(20)
    .get()

  let novos = 0
  let duplicados = 0
  const existing = await db.collection(`empresas/${empresaId}/leadsMonitorOportunidades`).get()
  const keys = new Set(
    existing.docs.map((d) => {
      const x = d.data()
      return String(x.dedupeKey || (x.telefone ? `tel:${x.telefone}` : `nome:${x.nome}`))
    })
  )

  for (const inbox of inboxSnap.docs) {
    const payload = (inbox.data().payload || {}) as Record<string, any>
    const nome = String(payload.nome || payload.name || '').trim()
    if (!nome) {
      await inbox.ref.update({ status: 'ignored', updatedAt: FieldValue.serverTimestamp() })
      continue
    }
    const telefone = String(payload.telefone || payload.phone || '').replace(/\D/g, '')
    const email = String(payload.email || '').trim().toLowerCase()
    const dedupeKey = telefone
      ? `tel:${telefone}`
      : email
        ? `email:${email}`
        : `nome:${nome.toLowerCase()}`

    await inbox.ref.update({ status: 'processing', updatedAt: FieldValue.serverTimestamp() })

    if (keys.has(dedupeKey)) {
      duplicados += 1
      await inbox.ref.update({ status: 'processed', updatedAt: FieldValue.serverTimestamp() })
      continue
    }

    const score = 60
    const ref = await db.collection(`empresas/${empresaId}/leadsMonitorOportunidades`).add({
      empresaId,
      connectorId: 'webhook',
      origemLabel: 'Webhook',
      origemFonte: 'webhook',
      dedupeKey,
      tipo: 'pessoa',
      nome,
      telefone: telefone || null,
      email: email || null,
      cidade: String(payload.cidade || ''),
      estado: String(payload.estado || '').toUpperCase(),
      segmento: String(payload.segmento || 'credito_clt'),
      consentimentoLgpd: payload.consentimentoLgpd !== false,
      baseLegal: 'Webhook autenticado',
      status: 'novo',
      score,
      temperatura: 'Morno',
      classificacao: 'Qualificar',
      motivosScore: ['Ingestão webhook (CF worker)'],
      origemScore: 'nexus_ai_heuristica',
      encontradoEm: FieldValue.serverTimestamp(),
      criadoEm: FieldValue.serverTimestamp(),
      atualizadoEm: FieldValue.serverTimestamp(),
    })
    keys.add(dedupeKey)
    novos += 1

    await db.collection(`empresas/${empresaId}/leadsMonitorAudit`).add({
      empresaId,
      action: 'oportunidade.create',
      origem: 'worker',
      connectorId: 'webhook',
      entidade: 'oportunidade',
      entidadeId: ref.id,
      after: { nome, status: 'novo', score, dedupeKey },
      at: FieldValue.serverTimestamp(),
    })

    await inbox.ref.update({
      status: 'processed',
      updatedAt: FieldValue.serverTimestamp(),
    })
  }

  await db.doc(`empresas/${empresaId}/leadsMonitorHealth/webhook`).set(
    {
      empresaId,
      connectorId: 'webhook',
      status: 'online',
      lastSyncAt: FieldValue.serverTimestamp(),
      lastAttemptAt: FieldValue.serverTimestamp(),
      consecutiveFailures: 0,
      lastError: null,
      connectorVersion: '1.1.0',
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  )

  return {
    encontrados: inboxSnap.size,
    novos,
    duplicados,
    fontes: novos || duplicados ? ['Webhook'] : [],
  }
}

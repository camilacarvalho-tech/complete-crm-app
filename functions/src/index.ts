/**
 * Nexus Leads Monitor — Cloud Functions
 * - leadsMonitorWebhook: ingestão autenticada → inbox + job
 * - leadsMonitorSaveSecret: grava ciphertext (nunca plaintext)
 */
import * as admin from 'firebase-admin'
import * as functions from 'firebase-functions'
import * as crypto from 'crypto'

if (!admin.apps.length) admin.initializeApp()
const db = admin.firestore()

function timingSafeEqualStr(a: string, b: string): boolean {
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ba.length !== bb.length) return false
  return crypto.timingSafeEqual(ba, bb)
}

function hashToken(plain: string): string {
  return crypto.createHash('sha256').update(plain).digest('hex')
}

async function decryptSecret(
  stored: { ciphertext?: string; iv?: string } | null | undefined
): Promise<string | null> {
  if (!stored?.ciphertext || !stored?.iv) return null
  const kekPass = process.env.LEADS_MONITOR_KEK || 'nexus-leads-monitor-homolog-kek'
  const key = crypto.createHash('sha256').update(kekPass).digest()
  try {
    const iv = Buffer.from(stored.iv, 'base64')
    const data = Buffer.from(stored.ciphertext, 'base64')
    // Node AES-GCM: last 16 bytes tag
    const tag = data.subarray(data.length - 16)
    const enc = data.subarray(0, data.length - 16)
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(tag)
    return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8')
  } catch {
    // Fallback: Web Crypto format may differ — compare hash if stored
    return null
  }
}

function encryptAesGcm(plain: string): { ciphertext: string; iv: string } {
  const kekPass = process.env.LEADS_MONITOR_KEK || 'nexus-leads-monitor-homolog-kek'
  const key = crypto.createHash('sha256').update(kekPass).digest()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return {
    ciphertext: Buffer.concat([enc, tag]).toString('base64'),
    iv: iv.toString('base64'),
  }
}

/** POST ?empresaId=xxx  Authorization: Bearer <token> */
export const leadsMonitorWebhook = functions.https.onRequest(async (req, res) => {
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
      const plain = await decryptSecret(tokenSecret)
      ok = plain ? timingSafeEqualStr(bearer, plain) : false
    }
    if (!ok) {
      await db.collection(`empresas/${empresaId}/leadsMonitorWebhookLogs`).add({
        empresaId,
        status: 401,
        reason: 'invalid_token',
        at: admin.firestore.FieldValue.serverTimestamp(),
      })
      res.status(401).json({ error: 'invalid_token' })
      return
    }

    const hmacSecretPlain = await decryptSecret(cfg.hmacSecret)
    if (hmacSecretPlain) {
      const provided = String(req.header('x-hub-signature-256') || req.header('x-signature') || '')
      const raw =
        typeof req.rawBody !== 'undefined' ? req.rawBody : Buffer.from(JSON.stringify(req.body || {}))
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
      receivedAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    const jobRef = await db.collection(`empresas/${empresaId}/leadsMonitorJobs`).add({
      empresaId,
      type: 'drain_inbox',
      status: 'queued',
      attempts: 0,
      maxAttempts: 5,
      idempotencyKey: `webhook:${inboxRef.id}`,
      payload: {},
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      nextAttemptAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    await db.collection(`empresas/${empresaId}/leadsMonitorAudit`).add({
      empresaId,
      action: 'webhook.accept',
      origem: 'webhook',
      connectorId: 'webhook',
      entidade: 'inbox',
      entidadeId: inboxRef.id,
      after: { jobId: jobRef.id },
      at: admin.firestore.FieldValue.serverTimestamp(),
    })

    await db.collection(`empresas/${empresaId}/leadsMonitorWebhookLogs`).add({
      empresaId,
      status: 202,
      reason: 'accepted',
      inboxId: inboxRef.id,
      at: admin.firestore.FieldValue.serverTimestamp(),
    })

    res.status(202).json({ id: inboxRef.id, jobId: jobRef.id, status: 'accepted' })
  } catch (e: any) {
    console.error(e)
    res.status(500).json({ error: 'internal', message: e?.message || String(e) })
  }
})

/** POST { empresaId, configDoc, field, plainSecret } — exige Firebase ID token */
export const leadsMonitorSaveSecret = functions.https.onRequest(async (req, res) => {
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

    // Isolamento multi-tenant: usuário deve pertencer à empresa (ou master)
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
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }

    if (field === 'webhookToken') {
      patch.webhookTokenSecret = { ...enc, keyVersion: 'v1', secretRef, hint }
      patch.webhookTokenHash = hashToken(String(plainSecret))
    } else if (field === 'hmacSecret') {
      patch.hmacSecret = { ...enc, keyVersion: 'v1', secretRef, hint }
    } else if (field === 'authToken') {
      patch.authTokenSecret = { ...enc, keyVersion: 'v1', secretRef, hint }
    }

    await db.doc(`empresas/${empresaId}/leadsMonitorConfig/${configDoc}`).set(patch, { merge: true })
    await db.collection(`empresas/${empresaId}/leadsMonitorAudit`).add({
      empresaId,
      action: 'secret.rotate',
      origem: 'system',
      usuarioId: uid,
      entidade: 'config',
      entidadeId: configDoc,
      after: { field, hint },
      at: admin.firestore.FieldValue.serverTimestamp(),
    })

    res.status(200).json({ ok: true, hint: `••••${hint}` })
  } catch (e: any) {
    console.error(e)
    res.status(500).json({ error: 'internal', message: e?.message || String(e) })
  }
})

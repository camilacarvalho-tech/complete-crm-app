/**
 * Homologação parcial LIVE (staging recomece-cred-oficial)
 * Sem Cloud Functions (billing): valida CRM bridge + coleções do Monitor via Auth cliente.
 *
 * Fluxo coberto: oportunidade → audit/log → aprovar → clientes (CRM)
 * Fluxo NÃO coberto aqui: webhook Function → inbox (requer Blaze + Java emulator)
 *
 * Uso: node scripts/homolog-live-crm-bridge.mjs
 * Credenciais: HOMOLOG_EMAIL / HOMOLOG_PASSWORD (defaults do guia de homologação)
 */
import assert from 'node:assert/strict'

const API_KEY = process.env.FIREBASE_WEB_API_KEY || 'AIzaSyDvmFFj_5cgZ2d-hts6atuHjb4O8eV4zLo'
const PROJECT = 'recomece-cred-oficial'
const EMPRESA = process.env.HOMOLOG_EMPRESA_ID || 'nexus-homologacao-v1'
const EMAIL = process.env.HOMOLOG_EMAIL || 'teste@nexuscrm.com'
const PASSWORD = process.env.HOMOLOG_PASSWORD || '123456'

const results = []
function step(name, ok, detail = '') {
  results.push({ name, ok, detail })
  console.log(`[${ok ? 'PASS' : 'FAIL'}] ${name}${detail ? ' — ' + detail : ''}`)
  if (!ok) throw new Error(name + ': ' + detail)
}

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
  if (!res.ok) throw new Error(data.error?.message || 'auth_failed')
  return data.idToken
}

async function fsRunQuery(idToken, structuredQuery) {
  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents:runQuery`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ structuredQuery }),
    }
  )
  return res.json()
}

function fieldsFrom(obj) {
  const out = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined) continue
    if (typeof v === 'string') out[k] = { stringValue: v }
    else if (typeof v === 'number') out[k] = { integerValue: String(Math.round(v)) }
    else if (typeof v === 'boolean') out[k] = { booleanValue: v }
    else if (typeof v === 'object') out[k] = { mapValue: { fields: fieldsFrom(v) } }
  }
  return out
}

async function fsCreate(idToken, collectionPath, data) {
  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/${collectionPath}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields: fieldsFrom(data) }),
    }
  )
  const body = await res.json()
  if (!res.ok) throw new Error(JSON.stringify(body))
  const id = body.name.split('/').pop()
  return { id, name: body.name }
}

async function fsPatch(idToken, docPath, data) {
  const fieldPaths = Object.keys(data)
    .map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`)
    .join('&')
  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/${docPath}?${fieldPaths}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields: fieldsFrom(data) }),
    }
  )
  const body = await res.json()
  if (!res.ok) throw new Error(JSON.stringify(body))
  return body
}

async function fsGet(idToken, docPath) {
  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/${docPath}`,
    { headers: { Authorization: `Bearer ${idToken}` } }
  )
  const body = await res.json()
  if (!res.ok) throw new Error(JSON.stringify(body))
  return body
}

async function main() {
  console.log('=== Homolog LIVE CRM bridge (staging) ===', { PROJECT, EMPRESA, EMAIL })

  let token
  let localId
  try {
    const authRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: EMAIL, password: PASSWORD, returnSecureToken: true }),
      }
    )
    const data = await authRes.json()
    if (!authRes.ok) throw new Error(data.error?.message || 'auth_failed')
    token = data.idToken
    localId = data.localId
    step('Auth homologação', true, `${EMAIL} uid=${localId}`)
  } catch (e) {
    step('Auth homologação', false, e.message)
  }

  // Garante perfil tenant (rules: usuário pode criar o próprio doc)
  try {
    await fsPatch(token, `usuarios/${localId}`, {
      empresaId: EMPRESA,
      email: EMAIL,
      nome: 'Usuario Teste Nexus',
      perfil: 'empresario',
      ativo: true,
    })
  } catch {
    await fsCreate(token, 'usuarios', {
      empresaId: EMPRESA,
      email: EMAIL,
      nome: 'Usuario Teste Nexus',
      perfil: 'empresario',
      ativo: true,
    }).catch(async () => {
      // create with explicit id via PATCH on non-existing may fail; use documents?documentId=
      const res = await fetch(
        `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/usuarios?documentId=${localId}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fields: fieldsFrom({
              empresaId: EMPRESA,
              email: EMAIL,
              nome: 'Usuario Teste Nexus',
              perfil: 'empresario',
              ativo: true,
            }),
          }),
        }
      )
      const body = await res.json()
      if (!res.ok) throw new Error('perfil: ' + JSON.stringify(body))
    })
  }
  step('Perfil Firestore tenant', true, `usuarios/${localId} → ${EMPRESA}`)

  // Negativo: inbox create deve falhar (rules)
  try {
    await fsCreate(token, `empresas/${EMPRESA}/leadsMonitorInbox`, {
      empresaId: EMPRESA,
      status: 'pending',
      payload: { nome: 'x' },
    })
    step('Inbox create bloqueado a clientes', false, 'create inesperadamente permitido')
  } catch {
    step('Inbox create bloqueado a clientes', true, 'rules negaram create')
  }

  const tel = '1197000' + String(Date.now()).slice(-4)
  const op = await fsCreate(token, `empresas/${EMPRESA}/leadsMonitorOportunidades`, {
    empresaId: EMPRESA,
    connectorId: 'webhook',
    origemLabel: 'Webhook',
    dedupeKey: `tel:${tel}`,
    tipo: 'pessoa',
    nome: 'Lead Homolog Live V1.1',
    telefone: tel,
    email: 'homolog.live@example.com',
    cidade: 'São Paulo',
    estado: 'SP',
    segmento: 'credito_clt',
    consentimentoLgpd: true,
    baseLegal: 'Homologação live V1.1',
    status: 'novo',
    score: 70,
    temperatura: 'Morno',
    classificacao: 'Qualificar',
    origemScore: 'nexus_ai_heuristica',
  })
  step('Normalizar/persistir oportunidade (client)', true, op.id)

  const log = await fsCreate(token, `empresas/${EMPRESA}/leadsMonitorLogs`, {
    empresaId: EMPRESA,
    level: 'info',
    message: 'Homolog live log',
    connectorId: 'webhook',
  })
  step('Registrar Logs', true, log.id)

  const audit = await fsCreate(token, `empresas/${EMPRESA}/leadsMonitorAudit`, {
    empresaId: EMPRESA,
    action: 'oportunidade.normalize',
    origem: 'system',
    entidade: 'oportunidade',
    entidadeId: op.id,
  })
  step('Registrar Audit Trail', true, audit.id)

  await fsPatch(token, `empresas/${EMPRESA}/leadsMonitorOportunidades/${op.id}`, {
    status: 'aprovado',
  })
  const afterApprove = await fsGet(token, `empresas/${EMPRESA}/leadsMonitorOportunidades/${op.id}`)
  step(
    'Aprovar o lead',
    afterApprove.fields?.status?.stringValue === 'aprovado',
    afterApprove.fields?.status?.stringValue
  )

  await fsCreate(token, `empresas/${EMPRESA}/leadsMonitorAudit`, {
    empresaId: EMPRESA,
    action: 'oportunidade.approve',
    origem: 'ui',
    entidade: 'oportunidade',
    entidadeId: op.id,
  })

  const cliente = await fsCreate(token, `empresas/${EMPRESA}/clientes`, {
    nome: 'Lead Homolog Live V1.1',
    telefone: tel,
    whatsapp: tel,
    email: 'homolog.live@example.com',
    cidade: 'São Paulo',
    estado: 'SP',
    modalidade: 'credito_clt',
    origem: 'Leads Monitor · Webhook',
    status: 'Lead',
    pipeline: 'Novo Lead',
    score: 70,
    criadoPor: 'homolog-live',
  })
  await fsPatch(token, `empresas/${EMPRESA}/leadsMonitorOportunidades/${op.id}`, {
    status: 'enviado_crm',
    crmClienteId: cliente.id,
  })
  await fsCreate(token, `empresas/${EMPRESA}/leadsMonitorAudit`, {
    empresaId: EMPRESA,
    action: 'oportunidade.send_crm',
    origem: 'ui',
    entidade: 'oportunidade',
    entidadeId: op.id,
  })

  const opFinal = await fsGet(token, `empresas/${EMPRESA}/leadsMonitorOportunidades/${op.id}`)
  const cli = await fsGet(token, `empresas/${EMPRESA}/clientes/${cliente.id}`)
  step(
    'Enviar o lead para o Nexus CRM',
    opFinal.fields?.status?.stringValue === 'enviado_crm' &&
      opFinal.fields?.crmClienteId?.stringValue === cliente.id &&
      cli.fields?.nome?.stringValue === 'Lead Homolog Live V1.1',
    `clienteId=${cliente.id}`
  )

  console.log('\n=== RESUMO LIVE ===')
  console.log(JSON.stringify({ passed: results.filter((r) => r.ok).length, total: results.length, results }, null, 2))
  console.log('HOMOLOG_LIVE_OK')
}

main().catch((e) => {
  console.error('HOMOLOG_LIVE_FAIL', e.message || e)
  console.log(JSON.stringify({ results }, null, 2))
  process.exit(1)
})

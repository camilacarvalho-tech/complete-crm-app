/**
 * Cliente da integração NX ERP ↔ Nexus CRM.
 * Health, leads, clientes e eventos usam só as rotas /api/crm/* já expostas pelo ERP.
 * O token não é gravado em texto puro.
 */
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { auth, db } from '../../firebase'
import { deriveKekFromPassphrase, decryptSecretAesGcm, encryptSecretAesGcm, maskSecret, secretHintFromPlain } from '../../modules/leads-monitor/services/secrets'
import { COL_CRM_ERP_SYNC, upsertCrmErpSync } from '../crm/crmSync'
import {
  interpretErpHealth,
  sanitizeErpLog,
  withCheckedAt,
  type ErpHealthResult,
} from './connectionStatus'
import {
  NX_ERP_AUTH_HEADER,
  NX_ERP_CRM_CLIENTES_PATH,
  NX_ERP_CRM_EVENTOS_PATH,
  NX_ERP_CRM_HEALTH_PATH,
  NX_ERP_CRM_LEADS_PATH,
} from './knownEndpoints'

export type NxErpAmbiente = 'producao' | 'homologacao'
export type NxErpModo = 'real' | 'mock'

export interface NxErpCrmConfig {
  apiUrl: string
  ambiente: NxErpAmbiente
  modo: NxErpModo
  ativo: boolean
  tokenHint: string
  hasToken: boolean
  inboundHint: string
  hasInboundKey: boolean
}

const EMPTY: NxErpCrmConfig = {
  apiUrl: '',
  ambiente: 'producao',
  modo: 'real',
  ativo: true,
  tokenHint: '',
  hasToken: false,
  inboundHint: '',
  hasInboundKey: false,
}

function configRef(empresaId: string) {
  return doc(db, 'empresas', empresaId, 'integracoesConfig', 'nx_erp')
}

function joinUrl(base: string, path: string) {
  const root = base.trim().replace(/\/+$/, '')
  if (typeof window !== 'undefined') {
    try {
      const parsed = new URL(root.includes('://') ? root : `http://${root}`)
      const port = parsed.port || (parsed.protocol === 'https:' ? '443' : '80')
      const loopback = parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost' || parsed.hostname === '[::1]'
      if (loopback && port === '5000') return `/__nx_erp_local${path}`
    } catch {
      /* URL fora do ERP local segue o endereço salvo */
    }
  }
  return `${root}${path}`
}

function redact(text: string, token: string) {
  if (!token) return text
  return text.split(token).join('[REDACTED]')
}

async function kekFor(empresaId: string): Promise<ArrayBuffer | null> {
  const uid = auth.currentUser?.uid
  if (!uid) return null
  return deriveKekFromPassphrase(`nx-erp:${empresaId}:${uid}`)
}

async function rememberCheck(empresaId: string, result: ErpHealthResult) {
  const safe = redact(result.description, '')
  await setDoc(
    configRef(empresaId),
    {
      lastConnection: result.connection,
      lastLabel: result.label,
      lastDescription: safe,
      lastCheckedAt: result.checkedAt,
      lastMode: result.mode,
      lastApiConfigured: result.apiConfigured,
      lastStatus: result.status,
    },
    { merge: true }
  )
}

export function lastCheckFromDoc(data: Record<string, unknown>): ErpHealthResult | null {
  const connection = String(data.lastConnection || '')
  if (!connection) return null
  return {
    connection: connection as ErpHealthResult['connection'],
    mode: data.lastMode === 'real' ? 'real' : 'mock',
    apiConfigured: Boolean(data.lastApiConfigured),
    message: String(data.lastDescription || ''),
    label: String(data.lastLabel || ''),
    description: String(data.lastDescription || ''),
    status: (data.lastStatus === 'online' || data.lastStatus === 'error' ? data.lastStatus : 'not_configured') as ErpHealthResult['status'],
    checkedAt: String(data.lastCheckedAt || ''),
  }
}

export async function loadNxErpCrmConfig(empresaId: string): Promise<NxErpCrmConfig & { last: ErpHealthResult | null }> {
  const snap = await getDoc(configRef(empresaId))
  if (!snap.exists()) return { ...EMPTY, last: null }
  const data = snap.data() as Record<string, unknown>
  const hint = String(data.tokenHint || '')
  return {
    apiUrl: String(data.apiUrl || ''),
    ambiente: data.ambiente === 'homologacao' ? 'homologacao' : 'producao',
    modo: data.modo === 'mock' ? 'mock' : 'real',
    ativo: data.ativo !== false,
    tokenHint: hint,
    hasToken: Boolean(data.tokenCipher && data.tokenIv) || Boolean(hint),
    inboundHint: String(data.inboundTokenHint || ''),
    hasInboundKey: Boolean(data.inboundTokenCipher && data.inboundTokenIv),
    last: lastCheckFromDoc(data),
  }
}

export async function readNxErpToken(empresaId: string): Promise<string> {
  const snap = await getDoc(configRef(empresaId))
  if (!snap.exists()) return ''
  const data = snap.data() as Record<string, unknown>
  const cipher = String(data.tokenCipher || '')
  const iv = String(data.tokenIv || '')
  if (!cipher || !iv) return ''
  const kek = await kekFor(empresaId)
  if (!kek) return ''
  try {
    return await decryptSecretAesGcm(cipher, iv, kek)
  } catch {
    return ''
  }
}

export async function saveNxErpCrmConfig(opts: {
  empresaId: string
  apiUrl: string
  ambiente: NxErpAmbiente
  modo: NxErpModo
  ativo: boolean
  token?: string
}): Promise<NxErpCrmConfig> {
  const apiUrl = opts.apiUrl.trim()
  const prev = await getDoc(configRef(opts.empresaId))
  const prevData = prev.exists() ? (prev.data() as Record<string, unknown>) : {}
  let tokenHint = String(prevData.tokenHint || '')
  let tokenCipher = String(prevData.tokenCipher || '')
  let tokenIv = String(prevData.tokenIv || '')
  const plain = String(opts.token || '').trim()
  if (plain) {
    tokenHint = secretHintFromPlain(plain)
    const kek = await kekFor(opts.empresaId)
    if (!kek) throw new Error('Faça login para gravar o token.')
    const sealed = await encryptSecretAesGcm(plain, kek)
    tokenCipher = sealed.ciphertext
    tokenIv = sealed.iv
  }
  await setDoc(
    configRef(opts.empresaId),
    {
      tipo: 'nx_erp',
      nome: 'NX ERP',
      apiUrl,
      ambiente: opts.ambiente,
      modo: opts.modo,
      ativo: opts.ativo,
      tokenHint,
      tokenCipher,
      tokenIv,
      status: opts.ativo ? 'ativo' : 'inativo',
      atualizadoEm: serverTimestamp(),
    },
    { merge: true }
  )
  return {
    apiUrl,
    ambiente: opts.ambiente,
    modo: opts.modo,
    ativo: opts.ativo,
    tokenHint,
    hasToken: Boolean(tokenCipher && tokenIv),
    inboundHint: String(prevData.inboundTokenHint || ''),
    hasInboundKey: Boolean(prevData.inboundTokenCipher && prevData.inboundTokenIv),
  }
}

/** Chave só para o NX ERP chamar o CRM. Não reutiliza o Token da API NX. */
export async function generateInboundCrmKey(empresaId: string): Promise<{ token: string; hint: string }> {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  let raw = ''
  for (let i = 0; i < bytes.length; i++) raw += String.fromCharCode(bytes[i])
  const token = btoa(raw).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
  const sha256 = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('')
  const seal = await fetch('/__nx_crm_inbound/seal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sha256 }),
  })
  if (!seal.ok) throw new Error('Não foi possível gravar a chave de entrada no CRM local.')
  const kek = await kekFor(empresaId)
  if (!kek) throw new Error('Faça login para gravar a chave de entrada.')
  const sealed = await encryptSecretAesGcm(token, kek)
  const hint = secretHintFromPlain(token)
  await setDoc(
    configRef(empresaId),
    {
      tipo: 'nx_erp',
      nome: 'NX ERP',
      inboundTokenHint: hint,
      inboundTokenCipher: sealed.ciphertext,
      inboundTokenIv: sealed.iv,
      atualizadoEm: serverTimestamp(),
    },
    { merge: true }
  )
  return { token, hint }
}

export function nxErpAuthHeaders(token: string): Record<string, string> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (token) headers[NX_ERP_AUTH_HEADER] = `Bearer ${token}`
  return headers
}

async function erpFetch(url: string, token: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 8000)
  try {
    return await fetch(url, {
      ...init,
      headers: { ...nxErpAuthHeaders(token), ...(init?.headers || {}) },
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timer)
  }
}

export async function testNxErpHealth(empresaId: string): Promise<ErpHealthResult> {
  const cfg = await loadNxErpCrmConfig(empresaId)
  if (!cfg.apiUrl) {
    return withCheckedAt(
      interpretErpHealth({
        urlConfigured: false,
        healthPathConfigured: false,
        enabled: false,
        detail: 'Salve a URL do NX ERP antes de testar.',
      })
    )
  }
  if (cfg.modo === 'mock') {
    return withCheckedAt(
      interpretErpHealth({
        urlConfigured: true,
        healthPathConfigured: true,
        enabled: false,
        detail: 'Modo Mock. Troque para Real para chamar o NX ERP.',
      })
    )
  }
  const token = await readNxErpToken(empresaId)
  const target = joinUrl(cfg.apiUrl, NX_ERP_CRM_HEALTH_PATH)
  try {
    const res = await erpFetch(target, token, { method: 'GET' })
    const detail = `HTTP ${res.status} GET ${NX_ERP_CRM_HEALTH_PATH}`
    const result = withCheckedAt(
      interpretErpHealth({
        enabled: true,
        urlConfigured: true,
        keyConfigured: Boolean(token),
        healthPathConfigured: true,
        httpStatus: res.status,
        detail,
      })
    )
    await rememberCheckSafe(empresaId, result)
    return result
  } catch (e) {
    const aborted = e instanceof Error && e.name === 'AbortError'
    const raw = e instanceof Error ? e.message : 'falha de rede'
    const detail = redact(aborted ? 'Tempo esgotado' : `Conexão recusada. ${raw}`, token)
    const result = withCheckedAt(
      interpretErpHealth({
        enabled: true,
        urlConfigured: true,
        keyConfigured: Boolean(token),
        healthPathConfigured: true,
        timeout: aborted,
        networkError: !aborted,
        detail,
      })
    )
    await rememberCheckSafe(empresaId, result)
    return result
  }
}

async function rememberCheckSafe(empresaId: string, result: ErpHealthResult) {
  try {
    await rememberCheck(empresaId, result)
  } catch {
    /* o resultado da conexão permanece na tela mesmo se o histórico não gravar */
  }
}

export function ambienteLabel(ambiente: NxErpAmbiente | ''): string {
  if (ambiente === 'producao') return 'Produção'
  if (ambiente === 'homologacao') return 'Homologação'
  return '—'
}

export function tokenMask(hint: string): string {
  return maskSecret(hint)
}

type ErpRow = Record<string, unknown>

async function readJson(res: Response, token: string): Promise<unknown> {
  const data = await res.json().catch(() => ({}))
  return sanitizeErpLog(data)
}

function asList(data: unknown): ErpRow[] {
  if (Array.isArray(data)) return data as ErpRow[]
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>
    for (const key of ['leads', 'clientes', 'eventos', 'items', 'data']) {
      if (Array.isArray(obj[key])) return obj[key] as ErpRow[]
    }
  }
  return []
}

function externalId(row: ErpRow): string {
  return String(row.id || row.erpId || row.externalId || row.uuid || '').trim()
}

export async function listNxErpLeads(empresaId: string): Promise<{ ok: boolean; status: number; leads: ErpRow[]; message: string }> {
  return listResource(empresaId, NX_ERP_CRM_LEADS_PATH, 'leads')
}

export async function listNxErpClientes(empresaId: string): Promise<{ ok: boolean; status: number; clientes: ErpRow[]; message: string }> {
  const result = await listResource(empresaId, NX_ERP_CRM_CLIENTES_PATH, 'clientes')
  return { ok: result.ok, status: result.status, clientes: result.leads, message: result.message }
}

export async function postNxErpCliente(empresaId: string, body: ErpRow): Promise<{ ok: boolean; status: number; message: string }> {
  return writeResource(empresaId, NX_ERP_CRM_CLIENTES_PATH, body)
}

export async function listNxErpEventos(empresaId: string): Promise<{ ok: boolean; status: number; eventos: ErpRow[]; message: string }> {
  const result = await listResource(empresaId, NX_ERP_CRM_EVENTOS_PATH, 'eventos')
  return { ok: result.ok, status: result.status, eventos: result.leads, message: result.message }
}

export async function postNxErpEvento(empresaId: string, body: ErpRow): Promise<{ ok: boolean; status: number; message: string; wamid?: string }> {
  return writeResource(empresaId, NX_ERP_CRM_EVENTOS_PATH, body)
}

async function requireReal(empresaId: string): Promise<{ cfg: NxErpCrmConfig; token: string } | { message: string }> {
  const cfg = await loadNxErpCrmConfig(empresaId)
  if (!cfg.apiUrl || cfg.modo !== 'real' || !cfg.ativo) {
    return { message: 'NX ERP real não está ativo.' }
  }
  const token = await readNxErpToken(empresaId)
  if (!token) return { message: 'Token da API NX não encontrado.' }
  return { cfg, token }
}

async function listResource(empresaId: string, path: string, _kind: string) {
  const ready = await requireReal(empresaId)
  if ('message' in ready) return { ok: false, status: 0, leads: [] as ErpRow[], message: ready.message }
  const target = joinUrl(ready.cfg.apiUrl, path)
  try {
    const res = await erpFetch(target, ready.token, { method: 'GET' })
    const data = await readJson(res, ready.token)
    if (!res.ok) return { ok: false, status: res.status, leads: [], message: `HTTP ${res.status} GET ${path}` }
    return { ok: true, status: res.status, leads: asList(data), message: '' }
  } catch (e) {
    const raw = e instanceof Error ? e.message : 'falha de rede'
    return { ok: false, status: 0, leads: [], message: redact(raw, ready.token) }
  }
}

function textoErroApi(value: unknown): string {
  if (value == null || value === '') return ''
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>
    const msg = obj.message || obj.mensagem || obj.error || obj.erro
    if (typeof msg === 'string' && msg.trim()) return msg.trim()
    try { return JSON.stringify(value) } catch { return 'erro sem detalhe' }
  }
  return String(value)
}

async function writeResource(empresaId: string, path: string, body: ErpRow): Promise<{ ok: boolean; status: number; message: string; wamid: string }> {
  const ready = await requireReal(empresaId)
  if ('message' in ready) return { ok: false, status: 0, message: ready.message, wamid: '' }
  const target = joinUrl(ready.cfg.apiUrl, path)
  try {
    const res = await erpFetch(target, ready.token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sanitizeErpLog(body)),
    })
    const data = await res.json().catch(() => ({} as Record<string, unknown>))
    const payload = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>
    const erro = textoErroApi(payload.erro || payload.error || payload.message)
    const wamid = String(payload.wamid || payload.erp_mensagem_id || '').trim()
    if (!res.ok) return { ok: false, status: res.status, message: erro || `HTTP ${res.status} POST ${path}`, wamid }
    return { ok: true, status: res.status, message: '', wamid }
  } catch (e) {
    const raw = e instanceof Error ? e.message : 'falha de rede'
    return { ok: false, status: 0, message: redact(raw, ready.token), wamid: '' }
  }
}

/** Lê o CRM ID já ligado a este ERP ID. Não cria cliente. */
export async function findCrmIdByErpId(empresaId: string, erpId: string): Promise<string | null> {
  const clean = erpId.trim()
  if (!clean) return null
  const id = `cliente:${clean}`.replace(/[/#]/g, '_').slice(0, 700)
  const snap = await getDoc(doc(db, 'empresas', empresaId, COL_CRM_ERP_SYNC, id))
  if (!snap.exists()) return null
  const crmId = String(snap.data().crmId || '').trim()
  return crmId || null
}

/** Liga o id do ERP ao cliente do CRM sem criar outro cadastro. */
export async function linkErpCliente(opts: { empresaId: string; erpId: string; crmId: string }): Promise<void> {
  if (!opts.erpId || !opts.crmId) return
  await upsertCrmErpSync({
    empresaId: opts.empresaId,
    leadId: opts.erpId,
    crmId: opts.crmId,
    erpId: opts.erpId,
    externalId: opts.erpId,
    kind: 'cliente',
    origin: 'manual',
    source: 'nx_erp',
    status: 'linked',
  })
}

export function erpRowId(row: ErpRow): string {
  return externalId(row)
}

/**
 * Config store — lê/grava leadsMonitorConfig (sem secrets em plaintext).
 */
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '../../../firebase'
import { COL_CONFIG } from '../constants'
import type { StoredSecretRef } from './secrets'
import type { TipoOportunidade } from '../types'
import { writeLeadsMonitorAudit } from './auditTrail'

export interface ApiConnectorConfig {
  enabled: boolean
  url: string
  method: 'GET' | 'POST'
  authType: 'none' | 'bearer' | 'header'
  /** Referência criptografada — nunca plaintext */
  authTokenSecret?: StoredSecretRef | null
  authHeaderName?: string
  headers?: Record<string, string>
  queryParams?: Record<string, string>
  bodyTemplate?: Record<string, unknown>
  itemsPath?: string
  mapping: {
    nome: string
    telefone?: string
    email?: string
    cidade?: string
    estado?: string
    segmento?: string
    cnpj?: string
    empresaNome?: string
    externalId?: string
    consentimentoLgpd?: string
    baseLegal?: string
  }
  tipoPadrao: TipoOportunidade
  baseLegalPadrao: string
  connectorApiVersion?: number
}

export interface WebhookConnectorConfig {
  enabled: boolean
  webhookTokenSecret?: StoredSecretRef | null
  /** SHA-256 hex do Bearer — usado pela Function sem descriptografar */
  webhookTokenHash?: string | null
  hmacSecret?: StoredSecretRef | null
  connectorApiVersion?: number
}

export const DEFAULT_API_CONFIG: ApiConnectorConfig = {
  enabled: false,
  url: '',
  method: 'GET',
  authType: 'none',
  authTokenSecret: null,
  headers: {},
  queryParams: {},
  itemsPath: '',
  mapping: { nome: 'nome', telefone: 'telefone', email: 'email', cidade: 'cidade', estado: 'estado', segmento: 'segmento' },
  tipoPadrao: 'pessoa',
  baseLegalPadrao: 'Consentimento / base legal declarada pela fonte autorizada.',
  connectorApiVersion: 1,
}

export const DEFAULT_WEBHOOK_CONFIG: WebhookConnectorConfig = {
  enabled: false,
  webhookTokenSecret: null,
  webhookTokenHash: null,
  hmacSecret: null,
  connectorApiVersion: 1,
}

export async function loadApiConfig(empresaId: string): Promise<ApiConnectorConfig> {
  const snap = await getDoc(doc(db, 'empresas', empresaId, COL_CONFIG, 'api'))
  if (!snap.exists()) return { ...DEFAULT_API_CONFIG }
  return { ...DEFAULT_API_CONFIG, ...(snap.data() as ApiConnectorConfig) }
}

export async function loadWebhookConfig(empresaId: string): Promise<WebhookConnectorConfig> {
  const snap = await getDoc(doc(db, 'empresas', empresaId, COL_CONFIG, 'webhook'))
  if (!snap.exists()) return { ...DEFAULT_WEBHOOK_CONFIG }
  return { ...DEFAULT_WEBHOOK_CONFIG, ...(snap.data() as WebhookConnectorConfig) }
}

export async function saveApiConfig(
  empresaId: string,
  config: ApiConnectorConfig,
  actor?: { usuarioId?: string; usuarioNome?: string }
): Promise<void> {
  const { authTokenSecret: _s, ...safe } = config
  // Preserva secret ref existente se não enviado
  const prev = await loadApiConfig(empresaId)
  await setDoc(
    doc(db, 'empresas', empresaId, COL_CONFIG, 'api'),
    {
      ...safe,
      authTokenSecret: config.authTokenSecret === undefined ? prev.authTokenSecret : config.authTokenSecret,
      empresaId,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  )
  await writeLeadsMonitorAudit({
    empresaId,
    action: 'config.update',
    origem: 'ui',
    connectorId: 'integracao_api',
    usuarioId: actor?.usuarioId,
    usuarioNome: actor?.usuarioNome,
    entidade: 'config',
    entidadeId: 'api',
    after: { enabled: config.enabled, url: config.url, method: config.method },
  })
}

export async function saveWebhookConfig(
  empresaId: string,
  config: WebhookConnectorConfig,
  actor?: { usuarioId?: string; usuarioNome?: string }
): Promise<void> {
  const prev = await loadWebhookConfig(empresaId)
  await setDoc(
    doc(db, 'empresas', empresaId, COL_CONFIG, 'webhook'),
    {
      enabled: config.enabled,
      connectorApiVersion: config.connectorApiVersion ?? 1,
      webhookTokenSecret:
        config.webhookTokenSecret === undefined ? prev.webhookTokenSecret : config.webhookTokenSecret,
      webhookTokenHash:
        config.webhookTokenHash === undefined ? prev.webhookTokenHash : config.webhookTokenHash,
      hmacSecret: config.hmacSecret === undefined ? prev.hmacSecret : config.hmacSecret,
      empresaId,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  )
  await writeLeadsMonitorAudit({
    empresaId,
    action: 'config.update',
    origem: 'ui',
    connectorId: 'webhook',
    usuarioId: actor?.usuarioId,
    usuarioNome: actor?.usuarioNome,
    entidade: 'config',
    entidadeId: 'webhook',
    after: { enabled: config.enabled },
  })
}

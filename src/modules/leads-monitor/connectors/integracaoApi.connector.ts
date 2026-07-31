/**
 * IConnector — API REST genérica configurável por empresa (apiVersion 1).
 * Credenciais só via StoredSecretRef (ciphertext); nunca plaintext no Firestore.
 */
import type {
  ConnectorFetchContext,
  ConnectorRawRecord,
  IConnector,
  NormalizedLead,
} from './types'
import { loadApiConfig } from '../services/configStore'
import { decryptSecretAesGcm, deriveKekFromPassphrase } from '../services/secrets'
import { applyTemplate, asBool, asString, extractItems, getByPath } from './jsonMapper'

async function resolveAuthToken(
  secret: { ciphertext: string; iv: string } | null | undefined
): Promise<string | null> {
  if (!secret?.ciphertext || !secret?.iv) return null
  const kekPass =
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_LEADS_MONITOR_KEK) ||
    'nexus-leads-monitor-homolog-kek'
  const kek = await deriveKekFromPassphrase(kekPass)
  try {
    return await decryptSecretAesGcm(secret.ciphertext, secret.iv, kek)
  } catch {
    return null
  }
}

export const integracaoApiConnector: IConnector = {
  meta: {
    id: 'integracao_api',
    label: 'Integração API',
    descricao: 'REST genérico por empresa (URL, auth, headers, mapeamento JSON).',
    autorizado: true,
    enabled: true,
    version: '1.1.0',
    versao: '1.1.0',
    apiVersion: 1,
    tiposSuportados: ['pessoa', 'empresa'],
  },

  async fetch(ctx: ConnectorFetchContext): Promise<ConnectorRawRecord[]> {
    const cfg = await loadApiConfig(ctx.empresaId)
    if (!cfg.enabled || !cfg.url?.trim()) return []

    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...(cfg.headers || {}),
    }

    const token = await resolveAuthToken(cfg.authTokenSecret || null)
    if (cfg.authType === 'bearer' && token) {
      headers.Authorization = `Bearer ${token}`
    } else if (cfg.authType === 'header' && token) {
      headers[cfg.authHeaderName || 'X-Api-Key'] = token
    }

    const url = new URL(cfg.url)
    const vars = {
      cidade: ctx.filtros.cidade || '',
      estado: ctx.filtros.estado || '',
      segmento: ctx.filtros.segmento || '',
      palavraChave: ctx.filtros.palavraChave || '',
      empresaId: ctx.empresaId,
    }
    Object.entries(cfg.queryParams || {}).forEach(([k, v]) => {
      url.searchParams.set(k, String(v).replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key as keyof typeof vars] || ''))
    })

    const init: RequestInit = { method: cfg.method || 'GET', headers }
    if (cfg.method === 'POST') {
      headers['Content-Type'] = 'application/json'
      init.body = JSON.stringify(applyTemplate(cfg.bodyTemplate, vars) || vars)
    }

    const res = await fetch(url.toString(), init)
    if (!res.ok) {
      throw new Error(`API ${res.status}: ${cfg.url}`)
    }
    const json = await res.json()
    const items = extractItems(json, cfg.itemsPath).slice(0, ctx.limite ?? 20)
    const now = new Date().toISOString()

    return items.map((item, i) => ({
      externalId: asString(getByPath(item, cfg.mapping.externalId)) || `api-${i}-${now}`,
      fetchedAt: now,
      payload: { ...item, __mapping: cfg.mapping, __tipoPadrao: cfg.tipoPadrao, __baseLegalPadrao: cfg.baseLegalPadrao },
    }))
  },

  normalize(raw): NormalizedLead | null {
    const p = raw.payload
    const mapping = (p.__mapping || {}) as Record<string, string>
    const nome = asString(getByPath(p, mapping.nome || 'nome'))
    if (!nome) return null

    const telefone = asString(getByPath(p, mapping.telefone || 'telefone'))
    const email = asString(getByPath(p, mapping.email || 'email'))
    const cnpj = asString(getByPath(p, mapping.cnpj || 'cnpj'))
    if (!telefone && !email && !cnpj) return null

    const consent = asBool(getByPath(p, mapping.consentimentoLgpd), true)
    const baseLegal =
      asString(getByPath(p, mapping.baseLegal)) ||
      asString(p.__baseLegalPadrao) ||
      'Fonte autorizada configurada na integração API.'
    if (!consent) return null

    const tipo = (asString(p.__tipoPadrao) as 'pessoa' | 'empresa') || (cnpj ? 'empresa' : 'pessoa')
    const dedupeKey = cnpj
      ? `cnpj:${cnpj.replace(/\D/g, '')}`
      : telefone
        ? `tel:${telefone.replace(/\D/g, '')}`
        : `email:${email.toLowerCase()}`

    return {
      connectorId: 'integracao_api',
      connectorVersion: '1.1.0',
      connectorApiVersion: 1,
      origemLabel: 'Integração API',
      dedupeKey,
      tipo,
      nome,
      telefone: telefone || undefined,
      email: email || undefined,
      cnpj: cnpj || undefined,
      empresaNome: asString(getByPath(p, mapping.empresaNome)) || undefined,
      cidade: asString(getByPath(p, mapping.cidade || 'cidade')),
      estado: asString(getByPath(p, mapping.estado || 'estado')).toUpperCase(),
      segmento: asString(getByPath(p, mapping.segmento || 'segmento')),
      consentimentoLgpd: true,
      baseLegal,
      externalId: raw.externalId,
      metadados: { fonte: 'integracao_api' },
    }
  },
}

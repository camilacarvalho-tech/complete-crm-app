/**
 * Adapter NX ERP real — mesma interface do mock.
 * Health usa rotas já documentadas no projeto NX ERP Disparo (/health).
 * Sincronização de leads / POST /jobs permanece desligada sem CLOUD_SYNC_TOKEN.
 */
import type { ErpCampaignAdapter } from './erpTypes'
import type { ErpLeadPayload } from '../crm/types'
import {
  interpretErpHealth,
  REAL_LEAD_SYNC_DISABLED,
  sanitizeErpLog,
  withCheckedAt,
  type ErpHealthProbe,
  type ErpHealthResult,
} from '../erp/connectionStatus.ts'
import {
  NX_ERP_CLOUD_DISPARO_BASE,
  NX_ERP_CLOUD_HEALTH_PATH,
  NX_ERP_LOCAL_HEALTH_PATH,
  NX_ERP_LOCAL_WEBHOOK_BASE,
} from '../erp/knownEndpoints.ts'

function healthFunctionUrl(): string {
  try {
    const env = (import.meta as { env?: Record<string, string> }).env || {}
    if (env.VITE_NX_ERP_HEALTH_URL) return String(env.VITE_NX_ERP_HEALTH_URL).trim()
    const places = env.VITE_LEADS_MONITOR_PLACES_URL || ''
    if (places) return String(places).replace(/leadsMonitorPlacesSearch\/?$/, 'nxErpHealth')
    const secret = env.VITE_LEADS_MONITOR_SAVE_SECRET_URL || ''
    if (secret) return String(secret).replace(/leadsMonitorSaveSecret\/?$/, 'nxErpHealth')
  } catch {
    /* node tests */
  }
  return 'http://127.0.0.1:5001/recomece-cred-oficial/southamerica-east1/nxErpHealth'
}

async function pingGet(url: string): Promise<{ status: number } | { timeout: true } | { network: true }> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 8000)
  try {
    const res = await fetch(url, { method: 'GET', headers: { Accept: 'application/json' }, signal: controller.signal })
    return { status: res.status }
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') return { timeout: true }
    return { network: true }
  } finally {
    clearTimeout(timer)
  }
}

async function pingDocumentedHealth(): Promise<ErpHealthProbe | null> {
  const cloud = `${NX_ERP_CLOUD_DISPARO_BASE}${NX_ERP_CLOUD_HEALTH_PATH}`
  const local = `${NX_ERP_LOCAL_WEBHOOK_BASE}${NX_ERP_LOCAL_HEALTH_PATH}`
  const viaProxy = '/__nx_erp_cloud/health'
  for (const target of [cloud, viaProxy, local]) {
    const hit = await pingGet(target)
    if ('timeout' in hit) return { timeout: true, urlConfigured: true, healthPathConfigured: true, enabled: true }
    if ('status' in hit && hit.status === 200) {
      return {
        enabled: true,
        urlConfigured: true,
        healthPathConfigured: true,
        httpStatus: 200,
      }
    }
    if ('status' in hit && (hit.status === 401 || hit.status === 403 || hit.status === 502 || hit.status === 503)) {
      return {
        enabled: true,
        urlConfigured: true,
        healthPathConfigured: true,
        httpStatus: hit.status,
      }
    }
  }
  return null
}

async function defaultProbe(): Promise<ErpHealthProbe> {
  const direct = await pingDocumentedHealth()
  if (direct && (direct.httpStatus === 200 || direct.timeout || direct.httpStatus)) return direct

  try {
    const { auth } = await import('../../firebase')
    const url = healthFunctionUrl()
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 8000)
    try {
      const user = auth.currentUser
      const token = user ? await user.getIdToken() : ''
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ action: 'health' }),
        signal: controller.signal,
      })
      if (res.status === 404) return { functionMissing: true, ...direct }
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
      void sanitizeErpLog(data)
      return {
        enabled: data.enabled !== false,
        urlConfigured: Boolean(data.urlConfigured),
        keyConfigured: Boolean(data.keyConfigured),
        healthPathConfigured: Boolean(data.healthPathConfigured),
        httpStatus: typeof data.erpHttpStatus === 'number' ? data.erpHttpStatus : res.status === 200 ? undefined : res.status,
        timeout: data.timeout === true,
        networkError: data.networkError === true,
      }
    } finally {
      clearTimeout(timer)
    }
  } catch (e) {
    const aborted = e instanceof Error && e.name === 'AbortError'
    if (aborted) return { timeout: true, urlConfigured: true, healthPathConfigured: true, enabled: true }
    return { functionMissing: true, networkError: true, urlConfigured: true, healthPathConfigured: true, enabled: true }
  }
}

export function createNxErpAdapter(opts?: { probe?: () => Promise<ErpHealthProbe> }): ErpCampaignAdapter {
  const probe = opts?.probe || defaultProbe
  return {
    async healthCheck(): Promise<ErpHealthResult> {
      const snapshot = await probe()
      return withCheckedAt(interpretErpHealth(snapshot))
    },
    async receiveLead(_payload: ErpLeadPayload) {
      return { ...REAL_LEAD_SYNC_DISABLED }
    },
    listReceived() {
      return []
    },
  }
}

export const nxErpAdapter: ErpCampaignAdapter = createNxErpAdapter()

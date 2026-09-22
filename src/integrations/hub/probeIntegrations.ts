import { collection, getDocs, limit, query } from 'firebase/firestore'
import { db } from '../../firebase'
import { getNxErpHealthAdapter } from '../adapters/erpProvider'
import { getWhatsAppProvider } from '../providers'
import { withCheckedAt, interpretErpHealth, type ErpHealthResult, type NxErpConnectionStatus } from '../erp/connectionStatus'
import { NX_ERP_LOCAL_WEBHOOK_BASE, NX_ERP_LOCAL_HEALTH_PATH } from '../erp/knownEndpoints'

export type HubId = 'crm' | 'leads_monitor' | 'nx_erp' | 'disparo' | 'meta' | 'whatsapp' | 'webhook'

export interface HubCardState {
  id: HubId
  title: string
  connection: NxErpConnectionStatus
  label: string
  description: string
  ambiente: string
  lastError: string
  checkedAt: string | null
}

function fromHealth(id: HubId, title: string, h: ErpHealthResult, ambiente: string): HubCardState {
  return {
    id,
    title,
    connection: h.connection,
    label: h.label,
    description: h.description,
    ambiente,
    lastError: h.connection === 'CONNECTED' || h.connection === 'NOT_CONFIGURED' ? '—' : h.message,
    checkedAt: h.checkedAt,
  }
}

export async function probeCrm(empresaId?: string | null): Promise<HubCardState> {
  if (!empresaId) {
    const h = withCheckedAt(interpretErpHealth({}))
    return { ...fromHealth('crm', 'CRM', h, 'Nexus'), description: 'Entre na empresa para validar o Firestore.', lastError: 'sem empresaId' }
  }
  try {
    await getDocs(query(collection(db, 'empresas', empresaId, 'clientes'), limit(1)))
    const h = withCheckedAt(
      interpretErpHealth({ enabled: true, urlConfigured: true, healthPathConfigured: true, httpStatus: 200 })
    )
    return { ...fromHealth('crm', 'CRM', h, 'Firestore'), description: 'Tenant Firestore respondeu.' }
  } catch (e) {
    const h = withCheckedAt(interpretErpHealth({ enabled: true, urlConfigured: true, healthPathConfigured: true, networkError: true }))
    return { ...fromHealth('crm', 'CRM', h, 'Firestore'), lastError: e instanceof Error ? e.message : 'erro' }
  }
}

export async function probeLeadsMonitor(empresaId?: string | null): Promise<HubCardState> {
  if (!empresaId) {
    const h = withCheckedAt(interpretErpHealth({}))
    return { ...fromHealth('leads_monitor', 'Leads Monitor', h, 'Nexus'), description: 'Entre na empresa para validar o Monitor.' }
  }
  try {
    await getDocs(query(collection(db, 'empresas', empresaId, 'leadsMonitorOportunidades'), limit(1)))
    const h = withCheckedAt(
      interpretErpHealth({ enabled: true, urlConfigured: true, healthPathConfigured: true, httpStatus: 200 })
    )
    return { ...fromHealth('leads_monitor', 'Leads Monitor', h, 'Firestore'), description: 'Coleções do Monitor acessíveis.' }
  } catch (e) {
    const h = withCheckedAt(interpretErpHealth({ enabled: true, urlConfigured: true, healthPathConfigured: true, networkError: true }))
    return { ...fromHealth('leads_monitor', 'Leads Monitor', h, 'Firestore'), lastError: e instanceof Error ? e.message : 'erro' }
  }
}

export async function probeNxErpAndDisparo(): Promise<{ erp: HubCardState; disparo: HubCardState }> {
  const h = await getNxErpHealthAdapter().healthCheck()
  return {
    erp: { ...fromHealth('nx_erp', 'NX ERP', h, h.mode === 'real' ? 'Produção (nuvem)' : 'Mock') },
    disparo: {
      ...fromHealth('disparo', 'API de Disparo', h, h.mode === 'real' ? 'Render /health' : 'Mock'),
      description:
        h.connection === 'CONNECTED'
          ? 'GET /health da API de disparo em nuvem retornou sucesso. POST /jobs exige CLOUD_SYNC_TOKEN no backend.'
          : h.description,
    },
  }
}

export async function probeWhatsApp(): Promise<HubCardState> {
  const wa = await getWhatsAppProvider().healthCheck()
  if (wa.status === 'online') {
    const h = withCheckedAt(interpretErpHealth({ enabled: true, urlConfigured: true, healthPathConfigured: true, httpStatus: 200 }))
    return fromHealth('whatsapp', 'WhatsApp', h, 'Cloud API')
  }
  const h = withCheckedAt(interpretErpHealth({}))
  return {
    ...fromHealth('whatsapp', 'WhatsApp', h, 'não configurado'),
    description: 'Credencial não encontrada no backend (WABA / Phone Number ID / token). Sem disparo.',
    lastError: wa.message,
  }
}

export async function probeMeta(): Promise<HubCardState> {
  const h = withCheckedAt(interpretErpHealth({}))
  return {
    ...fromHealth('meta', 'Meta', h, 'não configurado'),
    description: 'Credencial não encontrada nas Functions. Graph API não foi chamada com token.',
    lastError: 'META_ACCESS_TOKEN ausente no backend',
  }
}

export async function probeWebhook(): Promise<HubCardState> {
  try {
    const res = await fetch(`${NX_ERP_LOCAL_WEBHOOK_BASE}${NX_ERP_LOCAL_HEALTH_PATH}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    })
    if (res.status === 200) {
      const h = withCheckedAt(interpretErpHealth({ enabled: true, urlConfigured: true, healthPathConfigured: true, httpStatus: 200 }))
      return { ...fromHealth('webhook', 'Webhook', h, 'localhost:5000'), description: 'webhook_server.py /health local respondeu.' }
    }
  } catch {
    /* local ERP desligado */
  }
  const h = withCheckedAt(interpretErpHealth({}))
  return {
    ...fromHealth('webhook', 'Webhook', h, 'local desligado'),
    description: 'Servidor local do NX ERP (porta 5000) não está no ar. Cloudflare/Meta webhook não testado.',
    lastError: 'localhost:5000 indisponível',
  }
}

/**
 * UI admin — configuração de integrações (API REST + Webhook) sem editar código.
 */
import { useEffect, useState } from 'react'
import { Save, KeyRound, Link2, Activity } from 'lucide-react'
import {
  DEFAULT_API_CONFIG,
  DEFAULT_WEBHOOK_CONFIG,
  loadApiConfig,
  loadWebhookConfig,
  saveApiConfig,
  saveWebhookConfig,
  type ApiConnectorConfig,
  type WebhookConnectorConfig,
} from '../services/configStore'
import {
  deriveKekFromPassphrase,
  encryptSecretAesGcm,
  maskSecret,
  secretHintFromPlain,
  type StoredSecretRef,
} from '../services/secrets'
import { listConnectorMetas } from '../connectors'
import { useToast } from '../../../components/ui/Toast'

async function encryptLocal(plain: string): Promise<StoredSecretRef> {
  const kekPass =
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_LEADS_MONITOR_KEK) ||
    'nexus-leads-monitor-homolog-kek'
  const kek = await deriveKekFromPassphrase(kekPass)
  const enc = await encryptSecretAesGcm(plain, kek)
  return {
    ...enc,
    keyVersion: 'v1-homolog',
    secretRef: 'local',
    hint: secretHintFromPlain(plain),
  }
}

async function sha256Hex(plain: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(plain))
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export function IntegrationsAdminPanel({
  empresaId,
  healthItems,
  actor,
}: {
  empresaId: string | null
  healthItems: Array<{ id: string; status?: string; consecutiveFailures?: number; lastLatencyMs?: number; lastError?: string }>
  actor?: { usuarioId?: string; usuarioNome?: string }
}) {
  const toast = useToast()
  const [api, setApi] = useState<ApiConnectorConfig>({ ...DEFAULT_API_CONFIG })
  const [webhook, setWebhook] = useState<WebhookConnectorConfig>({ ...DEFAULT_WEBHOOK_CONFIG })
  const [apiTokenPlain, setApiTokenPlain] = useState('')
  const [webhookTokenPlain, setWebhookTokenPlain] = useState('')
  const [hmacPlain, setHmacPlain] = useState('')
  const [saving, setSaving] = useState(false)
  const metas = listConnectorMetas()

  useEffect(() => {
    if (!empresaId) return
    void (async () => {
      setApi(await loadApiConfig(empresaId))
      setWebhook(await loadWebhookConfig(empresaId))
    })()
  }, [empresaId])

  const saveApi = async () => {
    if (!empresaId) return
    setSaving(true)
    try {
      let next = { ...api }
      if (apiTokenPlain.trim()) {
        next.authTokenSecret = await encryptLocal(apiTokenPlain.trim())
        setApiTokenPlain('')
      }
      await saveApiConfig(empresaId, next, actor)
      setApi(next)
      toast.success('API salva', 'Configuração persistida (segredo criptografado).')
    } catch (e: any) {
      toast.error('Falha ao salvar API', e?.message)
    } finally {
      setSaving(false)
    }
  }

  const saveWh = async () => {
    if (!empresaId) return
    setSaving(true)
    try {
      let next = { ...webhook }
      if (webhookTokenPlain.trim()) {
        const plain = webhookTokenPlain.trim()
        next.webhookTokenSecret = await encryptLocal(plain)
        next.webhookTokenHash = await sha256Hex(plain)
        setWebhookTokenPlain('')
      }
      if (hmacPlain.trim()) {
        next.hmacSecret = await encryptLocal(hmacPlain.trim())
        setHmacPlain('')
      }
      await saveWebhookConfig(empresaId, next, actor)
      setWebhook(next)
      toast.success('Webhook salvo', 'Token/HMAC criptografados.')
    } catch (e: any) {
      toast.error('Falha ao salvar webhook', e?.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
        <div className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2 flex items-center gap-2">
          <Activity className="w-4 h-4" /> Saúde dos conectores
        </div>
        <ul className="space-y-2">
          {metas.map((m) => {
            const h = healthItems.find((x) => x.id === m.id)
            const st = h?.status || (m.runnable ? 'idle' : 'off')
            return (
              <li key={m.id} className="flex justify-between text-xs text-slate-600 dark:text-slate-300">
                <span>
                  {m.label}{' '}
                  <span className="text-slate-400">v{m.version} · api{m.apiVersion}</span>
                </span>
                <span>
                  {st}
                  {h?.lastLatencyMs != null ? ` · ${h.lastLatencyMs}ms` : ''}
                  {h?.consecutiveFailures ? ` · fails ${h.consecutiveFailures}` : ''}
                </span>
              </li>
            )
          })}
        </ul>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 space-y-3">
        <div className="text-sm font-semibold flex items-center gap-2">
          <Link2 className="w-4 h-4" /> API REST
        </div>
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={api.enabled}
            onChange={(e) => setApi({ ...api, enabled: e.target.checked })}
          />
          Ativa
        </label>
        <input
          className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-sm"
          placeholder="URL"
          value={api.url}
          onChange={(e) => setApi({ ...api, url: e.target.value })}
        />
        <div className="grid grid-cols-2 gap-2">
          <select
            className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-sm"
            value={api.method}
            onChange={(e) => setApi({ ...api, method: e.target.value as 'GET' | 'POST' })}
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
          </select>
          <select
            className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-sm"
            value={api.authType}
            onChange={(e) =>
              setApi({ ...api, authType: e.target.value as ApiConnectorConfig['authType'] })
            }
          >
            <option value="none">Sem auth</option>
            <option value="bearer">Bearer</option>
            <option value="header">Header</option>
          </select>
        </div>
        <input
          className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-sm"
          placeholder="itemsPath (ex: data.leads)"
          value={api.itemsPath || ''}
          onChange={(e) => setApi({ ...api, itemsPath: e.target.value })}
        />
        <div className="text-[11px] text-slate-500">
          Token atual: {maskSecret(api.authTokenSecret?.hint)}
        </div>
        <input
          type="password"
          className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-sm"
          placeholder="Novo token (criptografado ao salvar)"
          value={apiTokenPlain}
          onChange={(e) => setApiTokenPlain(e.target.value)}
        />
        <button
          type="button"
          disabled={saving || !empresaId}
          onClick={saveApi}
          className="px-3 py-2 rounded-lg bg-slate-800 text-white text-xs font-semibold flex items-center gap-1"
        >
          <Save className="w-3.5 h-3.5" /> Salvar API
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 space-y-3">
        <div className="text-sm font-semibold flex items-center gap-2">
          <KeyRound className="w-4 h-4" /> Webhook
        </div>
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={webhook.enabled}
            onChange={(e) => setWebhook({ ...webhook, enabled: e.target.checked })}
          />
          Ativo
        </label>
        <p className="text-[11px] text-slate-500 break-all">
          Endpoint: Cloud Function <code>leadsMonitorWebhook?empresaId=…</code>
        </p>
        <div className="text-[11px] text-slate-500">
          Token: {maskSecret(webhook.webhookTokenSecret?.hint)} · HMAC:{' '}
          {maskSecret(webhook.hmacSecret?.hint)}
        </div>
        <input
          type="password"
          className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-sm"
          placeholder="Novo Bearer token"
          value={webhookTokenPlain}
          onChange={(e) => setWebhookTokenPlain(e.target.value)}
        />
        <input
          type="password"
          className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-sm"
          placeholder="HMAC secret (opcional)"
          value={hmacPlain}
          onChange={(e) => setHmacPlain(e.target.value)}
        />
        <button
          type="button"
          disabled={saving || !empresaId}
          onClick={saveWh}
          className="px-3 py-2 rounded-lg bg-slate-800 text-white text-xs font-semibold flex items-center gap-1"
        >
          <Save className="w-3.5 h-3.5" /> Salvar Webhook
        </button>
      </div>
    </div>
  )
}

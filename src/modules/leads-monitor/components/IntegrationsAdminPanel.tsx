/**
 * UI admin — configuração de integrações (API REST + Webhook) sem editar código.
 * Secrets: apenas via Cloud Function (Secret Manager KEK) — sem plaintext no Firestore.
 * DLQ: reprocessamento na V1.1.
 */
import { useEffect, useState } from 'react'
import { Save, KeyRound, Link2, Activity, RotateCcw, AlertTriangle } from 'lucide-react'
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
import { maskSecret } from '../services/secrets'
import {
  isSaveSecretViaFunctionConfigured,
  saveSecretViaFunction,
} from '../services/saveSecretClient'
import { reprocessDlq } from '../services/opsLogs'
import { listConnectorMetas } from '../connectors'
import { useToast } from '../../../components/ui/Toast'

export function IntegrationsAdminPanel({
  empresaId,
  healthItems,
  dlqItems,
  jobItems,
  auditItems,
  actor,
}: {
  empresaId: string | null
  healthItems: Array<{
    id: string
    status?: string
    consecutiveFailures?: number
    lastLatencyMs?: number
    lastError?: string
  }>
  dlqItems?: Array<{
    id: string
    reason?: string
    status?: string
    jobId?: string
    connectorId?: string
  }>
  jobItems?: Array<{ id: string; type?: string; status?: string }>
  auditItems?: Array<{ id: string; action?: string; acao?: string }>
  actor?: { usuarioId?: string; usuarioNome?: string }
}) {
  const toast = useToast()
  const [api, setApi] = useState<ApiConnectorConfig>({ ...DEFAULT_API_CONFIG })
  const [webhook, setWebhook] = useState<WebhookConnectorConfig>({ ...DEFAULT_WEBHOOK_CONFIG })
  const [apiTokenPlain, setApiTokenPlain] = useState('')
  const [webhookTokenPlain, setWebhookTokenPlain] = useState('')
  const [hmacPlain, setHmacPlain] = useState('')
  const [saving, setSaving] = useState(false)
  const [reprocessingId, setReprocessingId] = useState<string | null>(null)
  const metas = listConnectorMetas()
  const secretsViaFn = isSaveSecretViaFunctionConfigured()
  const openDlq = (dlqItems || []).filter((d) => !d.status || d.status === 'open')

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
      if (apiTokenPlain.trim()) {
        if (!secretsViaFn) {
          throw new Error(
            'Defina VITE_LEADS_MONITOR_SAVE_SECRET_URL apontando para leadsMonitorSaveSecret.'
          )
        }
        await saveSecretViaFunction({
          empresaId,
          configDoc: 'api',
          field: 'authToken',
          plainSecret: apiTokenPlain.trim(),
        })
        setApiTokenPlain('')
      }
      const { authTokenSecret: _drop, ...safe } = api
      await saveApiConfig(empresaId, { ...safe, authTokenSecret: undefined } as ApiConnectorConfig, actor)
      setApi(await loadApiConfig(empresaId))
      toast.success('API salva', 'Configuração persistida (segredo via Function/Secret Manager).')
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
      if ((webhookTokenPlain.trim() || hmacPlain.trim()) && !secretsViaFn) {
        throw new Error(
          'Defina VITE_LEADS_MONITOR_SAVE_SECRET_URL apontando para leadsMonitorSaveSecret.'
        )
      }
      if (webhookTokenPlain.trim()) {
        await saveSecretViaFunction({
          empresaId,
          configDoc: 'webhook',
          field: 'webhookToken',
          plainSecret: webhookTokenPlain.trim(),
        })
        setWebhookTokenPlain('')
      }
      if (hmacPlain.trim()) {
        await saveSecretViaFunction({
          empresaId,
          configDoc: 'webhook',
          field: 'hmacSecret',
          plainSecret: hmacPlain.trim(),
        })
        setHmacPlain('')
      }
      await saveWebhookConfig(
        empresaId,
        {
          enabled: webhook.enabled,
          connectorApiVersion: webhook.connectorApiVersion,
          // não sobrescreve secrets — Function já gravou
          webhookTokenSecret: undefined,
          hmacSecret: undefined,
          webhookTokenHash: undefined,
        },
        actor
      )
      setWebhook(await loadWebhookConfig(empresaId))
      toast.success('Webhook salvo', 'Token/HMAC via Function (ciphertext + hash).')
    } catch (e: any) {
      toast.error('Falha ao salvar webhook', e?.message)
    } finally {
      setSaving(false)
    }
  }

  const onReprocess = async (dlqId: string) => {
    if (!empresaId) return
    setReprocessingId(dlqId)
    try {
      const jobId = await reprocessDlq({ empresaId, dlqId, actor })
      toast.success('DLQ reenfileirada', `Job ${jobId}`)
    } catch (e: any) {
      toast.error('Falha ao reprocessar DLQ', e?.message)
    } finally {
      setReprocessingId(null)
    }
  }

  return (
    <div className="space-y-4">
      {!secretsViaFn && (
        <div className="text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 rounded-lg p-2 flex gap-2">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>
            Secrets exigem <code>VITE_LEADS_MONITOR_SAVE_SECRET_URL</code> (Function com KEK no
            Secret Manager). Encrypt local foi desabilitado na V1.1.
          </span>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
        <div className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2 flex items-center gap-2">
          <Activity className="w-4 h-4" /> Saúde dos conectores
        </div>
        <ul className="space-y-2">
          {metas.map((m) => {
            const h = healthItems.find((x) => x.id === m.id)
            const st = h?.status || (m.runnable ? 'idle' : 'off')
            return (
              <li
                key={m.id}
                className="flex justify-between text-xs text-slate-600 dark:text-slate-300"
              >
                <span>
                  {m.label}{' '}
                  <span className="text-slate-400">
                    v{m.version} · api{m.apiVersion}
                  </span>
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
          <RotateCcw className="w-4 h-4" /> Dead Letter Queue
        </div>
        {openDlq.length === 0 ? (
          <p className="text-[11px] text-slate-500">Nenhum item aberto na DLQ.</p>
        ) : (
          <ul className="space-y-2">
            {openDlq.slice(0, 8).map((d) => (
              <li
                key={d.id}
                className="flex items-start justify-between gap-2 text-xs text-slate-600 dark:text-slate-300"
              >
                <div className="min-w-0">
                  <div className="font-medium truncate">{d.reason || 'erro'}</div>
                  <div className="text-slate-400 truncate">
                    {d.connectorId || '—'} · {d.id}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={reprocessingId === d.id || !empresaId}
                  onClick={() => onReprocess(d.id)}
                  className="shrink-0 px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-700 text-[11px] font-semibold disabled:opacity-50"
                >
                  {reprocessingId === d.id ? '…' : 'Reprocessar'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 space-y-2">
        <div className="text-sm font-semibold">Jobs recentes</div>
        <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-300 max-h-28 overflow-y-auto">
          {(jobItems || []).slice(0, 6).map((j) => (
            <li key={j.id} className="flex justify-between gap-2">
              <span className="truncate">{j.type || 'job'} · {j.id.slice(0, 8)}</span>
              <span className="text-slate-400 shrink-0">{j.status}</span>
            </li>
          ))}
          {!(jobItems || []).length && <li className="text-slate-400">Nenhum</li>}
        </ul>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 space-y-2">
        <div className="text-sm font-semibold">Audit (últimos)</div>
        <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-300 max-h-28 overflow-y-auto">
          {(auditItems || []).slice(0, 6).map((a) => (
            <li key={a.id} className="truncate">
              {a.action || a.acao || a.id}
            </li>
          ))}
          {!(auditItems || []).length && <li className="text-slate-400">Sem eventos</li>}
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
          placeholder="Novo token (enviado à Function — não fica plaintext)"
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

import { useState } from 'react'
import { GhostButton } from '../../components/nexus/kit'
import { NxErpStatusPanel } from './NxErpStatusPanel'
import {
  probeCrm,
  probeLeadsMonitor,
  probeMeta,
  probeNxErpAndDisparo,
  probeWebhook,
  probeWhatsApp,
  type HubCardState,
} from '../hub/probeIntegrations'
import { statusLabel, type NxErpConnectionStatus } from '../erp/connectionStatus'

function formatAt(iso: string | null) {
  if (!iso) return '--'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '--' : d.toLocaleString('pt-BR')
}

function Card({
  state,
  testing,
  onTest,
}: {
  state: HubCardState
  testing: boolean
  onTest: () => void
}) {
  return (
    <div className="nexus-card p-4 text-sm space-y-1">
      <p className="font-semibold">{state.title}</p>
      <p>
        Status:
        <br />
        <b>{testing ? '● Conectando' : state.label || statusLabel(state.connection)}</b>
      </p>
      <p className="text-xs" style={{ color: 'var(--code-muted)' }}>
        {state.description}
      </p>
      <p className="text-xs">
        Ambiente: <b>{state.ambiente}</b>
      </p>
      <p className="text-xs">
        Última verificação: <b>{formatAt(state.checkedAt)}</b>
      </p>
      <p className="text-xs">
        Último erro: <b>{state.lastError}</b>
      </p>
      <GhostButton type="button" disabled={testing} onClick={onTest}>
        {testing ? 'Testando…' : 'Testar conexão'}
      </GhostButton>
    </div>
  )
}

const empty = (id: HubCardState['id'], title: string): HubCardState => ({
  id,
  title,
  connection: 'NOT_CONFIGURED' as NxErpConnectionStatus,
  label: '● Não configurado',
  description: 'Ainda não testado nesta sessão.',
  ambiente: '—',
  lastError: '—',
  checkedAt: null,
})

export function IntegrationsHub({ empresaId }: { empresaId?: string | null }) {
  const [crm, setCrm] = useState(empty('crm', 'CRM'))
  const [monitor, setMonitor] = useState(empty('leads_monitor', 'Leads Monitor'))
  const [meta, setMeta] = useState(empty('meta', 'Meta'))
  const [wa, setWa] = useState(empty('whatsapp', 'WhatsApp'))
  const [hook, setHook] = useState(empty('webhook', 'Webhook'))
  const [disparo, setDisparo] = useState(empty('disparo', 'API de Disparo'))
  const [busy, setBusy] = useState<string | null>(null)

  async function run(id: string, fn: () => Promise<void>) {
    setBusy(id)
    try {
      await fn()
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <p className="text-sm font-semibold">Central de Integrações</p>
      <div className="grid md:grid-cols-2 gap-3">
        <Card state={crm} testing={busy === 'crm'} onTest={() => void run('crm', async () => setCrm(await probeCrm(empresaId)))} />
        <Card
          state={monitor}
          testing={busy === 'monitor'}
          onTest={() => void run('monitor', async () => setMonitor(await probeLeadsMonitor(empresaId)))}
        />
      </div>
      <NxErpStatusPanel empresaId={empresaId} />
      <div className="grid md:grid-cols-2 gap-3">
        <Card
          state={disparo}
          testing={busy === 'disparo'}
          onTest={() =>
            void run('disparo', async () => {
              const r = await probeNxErpAndDisparo()
              setDisparo(r.disparo)
            })
          }
        />
        <Card state={meta} testing={busy === 'meta'} onTest={() => void run('meta', async () => setMeta(await probeMeta()))} />
        <Card state={wa} testing={busy === 'wa'} onTest={() => void run('wa', async () => setWa(await probeWhatsApp()))} />
        <Card state={hook} testing={busy === 'hook'} onTest={() => void run('hook', async () => setHook(await probeWebhook()))} />
      </div>
    </div>
  )
}

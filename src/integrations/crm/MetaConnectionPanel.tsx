import { useState } from 'react'
import { GhostButton } from '../../components/nexus/kit'

type Line = { status: 'OK' | 'ERRO'; detail: string }

type Report = {
  graphVersion?: string
  app: Line
  token: Line
  business: Line
  waba: Line
  phone: Line
  webhook: Line
  permissions: Line
  leadAds: Line
}

const ROWS: Array<{ key: keyof Report; label: string }> = [
  { key: 'app', label: 'App' },
  { key: 'token', label: 'Token' },
  { key: 'business', label: 'Business' },
  { key: 'waba', label: 'WABA' },
  { key: 'phone', label: 'Phone Number' },
  { key: 'webhook', label: 'Webhook' },
  { key: 'permissions', label: 'Permissões' },
  { key: 'leadAds', label: 'Lead Ads' },
]

export function MetaConnectionPanel() {
  const [report, setReport] = useState<Report | null>(null)
  const [testing, setTesting] = useState(false)
  const [error, setError] = useState('')

  async function testar() {
    setTesting(true)
    setError('')
    try {
      const res = await fetch('/__meta_whatsapp/diagnose')
      const data = await res.json()
      if (!res.ok) throw new Error('A consulta real à Meta falhou.')
      setReport(data as Report)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao testar a Meta.')
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="nexus-card p-4 text-sm space-y-2 max-w-xl">
      <p className="font-semibold">META CONNECTION</p>
      <p className="text-xs" style={{ color: 'var(--code-muted)' }}>
        Leitura real na Graph API {report?.graphVersion || 'v21.0'}. Nenhum envio é feito.
      </p>
      {ROWS.map((row) => {
        const line = report?.[row.key] as Line | undefined
        return (
          <p key={row.key}>
            {row.label}: <b>{line ? line.status : '—'}</b>
            {line?.detail ? <span className="text-xs" style={{ color: 'var(--code-muted)' }}> — {line.detail}</span> : null}
          </p>
        )
      })}
      {error ? <p className="text-xs">{error}</p> : null}
      <GhostButton type="button" disabled={testing} onClick={() => void testar()}>
        {testing ? 'Testando…' : 'TESTAR CONEXÃO REAL'}
      </GhostButton>
    </div>
  )
}

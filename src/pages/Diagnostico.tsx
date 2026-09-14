import { useEffect, useState } from 'react'
import { collectProviderHealth } from '../integrations/providers'
import { PageHeader, PrimaryButton } from '../components/nexus/kit'
import { runLeticiaCheck, runPlatformChecks } from '../lib/platformChecks'
import { labelPt } from '../lib/uiPt'

const LABELS: Record<string, { nome: string; descricao: string }> = {
  bank: { nome: 'Bancos', descricao: 'O provedor bancário ainda não foi configurado.' },
  fiscal: { nome: 'Fiscal', descricao: 'O provedor fiscal ainda não foi configurado.' },
  whatsapp: { nome: 'WhatsApp', descricao: 'A integração oficial do WhatsApp ainda não foi configurada.' },
  voip: { nome: 'VoIP', descricao: 'A integração de telefonia ainda não foi configurada.' },
  instagram: { nome: 'Instagram', descricao: 'A integração do Instagram ainda não foi configurada.' },
  messenger: { nome: 'Messenger', descricao: 'A integração do Messenger ainda não foi configurada.' },
  sms: { nome: 'SMS', descricao: 'A integração de SMS ainda não foi configurada.' },
  email: { nome: 'E-mail', descricao: 'A integração de e-mail ainda não foi configurada.' },
}

export default function Diagnostico() {
  const [health, setHealth] = useState<Record<string, { status: string; message: string }>>({})
  const [checks, setChecks] = useState<string[] | null>(null)
  useEffect(() => {
    collectProviderHealth().then(setHealth)
  }, [])
  async function testar() {
    const a = runPlatformChecks()
    const b = await runLeticiaCheck()
    setChecks([...a, ...b])
  }
  return (
    <div className="space-y-3">
      <PageHeader title="Diagnóstico" subtitle="Status das integrações em português. Credenciais nunca aparecem aqui." />
      <div className="grid md:grid-cols-2 gap-3">
        {Object.entries(health).map(([k, v]) => {
          const meta = LABELS[k] || { nome: k, descricao: v.message }
          const status = labelPt(v.status)
          return (
            <div key={k} className="nexus-card p-4">
              <p className="text-xs uppercase" style={{ color: 'var(--code-muted)' }}>{meta.nome}</p>
              <p className="font-bold">{status === 'Não configurado' ? 'NÃO CONFIGURADO' : status.toUpperCase()}</p>
              <p className="text-sm" style={{ color: 'var(--code-muted)' }}>{v.status === 'not_configured' ? meta.descricao : v.message}</p>
            </div>
          )
        })}
      </div>
      <PrimaryButton type="button" onClick={testar}>Rodar checagens internas</PrimaryButton>
      {checks && (
        <p className="text-sm">{checks.length ? `Falhas: ${checks.join(', ')}` : 'Checagens internas OK (Letícia, DRE, duplicidade, formatação).'}</p>
      )}
    </div>
  )
}

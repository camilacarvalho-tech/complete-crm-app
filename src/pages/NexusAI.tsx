import { useState } from 'react'
import { useNexusStore } from '../contexts/NexusStore'
import { runNexusQuery } from '../lib/aiQuery'
import { nexusAiHttp } from '../ai/httpClient'
import { EmptyState, PageHeader, PrimaryButton, TextArea } from '../components/nexus/kit'
import { useNavigate } from 'react-router-dom'

const EXAMPLES = [
  'Mostre os leads de hoje.',
  'Quais clientes estão aguardando retorno?',
  'Mostre propostas em análise.',
  'Quais propostas foram aprovadas este mês?',
  'Liste clientes sem follow-up.',
  'Analise minhas vendas.',
  'Mostre os clientes de INSS.',
  'Quais leads vieram do Instagram?',
  'Mostre os atendimentos parados.',
]

export default function NexusAI() {
  const nav = useNavigate()
  const store = useNexusStore()
  const [q, setQ] = useState('')
  const [answer, setAnswer] = useState<{ title: string; lines: string[]; action?: string } | null>(null)
  const [remote, setRemote] = useState('')
  const [loading, setLoading] = useState(false)

  const payload = {
    clientes: store.clientes.items,
    propostas: store.propostas.items,
    digitacoes: store.digitacoes.items,
    campanhas: store.campanhas.items,
    transacoes: store.transacoes.items,
    bancos: store.bancos.items,
  }

  function askInternal() {
    setAnswer(runNexusQuery(q, payload))
  }

  async function askBackend() {
    setLoading(true)
    setRemote('')
    try {
      const data = await nexusAiHttp.post('/ask', { question: q })
      setRemote(typeof data === 'string' ? data : JSON.stringify(data))
    } catch {
      setRemote('Backend da IA indisponível. A consulta interna do CRM continua funcionando.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4 max-w-4xl">
      <PageHeader title="Nexus AI" subtitle="Consulta somente dados reais deste tenant. Não inventa números nem clientes." />
      <div className="nexus-card p-6 space-y-4">
        <p className="text-lg font-semibold">Como posso ajudar?</p>
        <TextArea rows={4} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Digite um comando..." />
        <div className="flex flex-wrap gap-2">
          <PrimaryButton onClick={askInternal}>Consultar dados</PrimaryButton>
          <PrimaryButton onClick={askBackend} disabled={loading}>{loading ? 'Consultando...' : 'Perguntar ao backend'}</PrimaryButton>
        </div>
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((s) => (
            <button key={s} type="button" className="px-2 py-1 rounded text-xs nexus-btn-secondary" onClick={() => { setQ(s); setAnswer(runNexusQuery(s, payload)) }}>{s}</button>
          ))}
        </div>
      </div>
      <div className="nexus-card p-4">
        {!answer ? (
          <EmptyState title="Sem consulta ainda" description="A IA usa os registros reais deste tenant." />
        ) : (
          <div>
            <h2 className="font-bold mb-2">{answer.title}</h2>
            <ul className="text-sm space-y-1">{answer.lines.map((l) => <li key={l}>{l}</li>)}</ul>
            {answer.action === 'campanha' && <PrimaryButton className="mt-3" onClick={() => nav('/campanhas')}>Preparar campanha</PrimaryButton>}
            {answer.action === 'remarketing' && <PrimaryButton className="mt-3" onClick={() => nav('/remarketing')}>Abrir remarketing</PrimaryButton>}
          </div>
        )}
        {remote && <p className="text-xs mt-4" style={{ color: 'var(--code-muted)' }}>{remote}</p>}
      </div>
    </div>
  )
}

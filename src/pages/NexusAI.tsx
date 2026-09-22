import { useState } from 'react'
import { useNexusStore } from '../contexts/NexusStore'
import { useAuth } from '../contexts/AuthContext'
import { runNexusQuery } from '../lib/aiQuery'
import { nexusAiHttp } from '../ai/httpClient'
import { EmptyState, GhostButton, PageHeader, PrimaryButton, TextArea } from '../components/nexus/kit'
import { useNavigate } from 'react-router-dom'
import {
  loadRobotControl,
  ROBOT_LABEL,
  setRobotIntent,
  type RobotControlKey,
} from '../modules/leads-monitor/services/robotControl'

const EXAMPLES = [
  'Mostre os leads de hoje.',
  'Quais clientes estão aguardando retorno?',
  'Qual robô está trabalhando?',
  'Pause o robô de enriquecimento.',
  'Mostre propostas em análise.',
  'Analise minhas vendas.',
]

function detectRobotCommand(question: string): { action: 'status' | 'pause' | 'resume'; key?: RobotControlKey } | null {
  const q = question.toLowerCase()
  const key: RobotControlKey | undefined = /enriquec/.test(q)
    ? 'enrichment'
    : /classif/.test(q)
      ? 'classification'
      : /follow/.test(q)
        ? 'followup'
        : /\bcrm\b/.test(q)
          ? 'crm'
          : /busca/.test(q)
            ? 'search'
            : undefined
  if (/qual rob[oô]|rob[oô]s? (est[aá]|trabalh)|status dos rob/.test(q)) return { action: 'status' }
  if ((/paus/.test(q) || /pause/.test(q)) && key) return { action: 'pause', key }
  if ((/retom|resume|despaus/.test(q)) && key) return { action: 'resume', key }
  return null
}

export default function NexusAI() {
  const nav = useNavigate()
  const store = useNexusStore()
  const { usuario } = useAuth()
  const [q, setQ] = useState('')
  const [answer, setAnswer] = useState<{ title: string; lines: string[]; action?: string } | null>(null)
  const [remote, setRemote] = useState('')
  const [loading, setLoading] = useState(false)
  const [pendingRobot, setPendingRobot] = useState<{ action: 'pause' | 'resume'; key: RobotControlKey } | null>(null)

  const payload = {
    clientes: store.clientes.items,
    propostas: store.propostas.items,
    digitacoes: store.digitacoes.items,
    campanhas: store.campanhas.items,
    transacoes: store.transacoes.items,
    bancos: store.bancos.items,
  }

  async function askInternal() {
    const cmd = detectRobotCommand(q)
    if (cmd?.action === 'status') {
      if (!usuario?.empresaId) {
        setAnswer({ title: 'Robôs', lines: ['Empresa não identificada.'] })
        return
      }
      const control = await loadRobotControl(usuario.empresaId)
      const lines = (['search', 'enrichment', 'classification', 'crm', 'followup'] as const).map((key) => {
        const st = control[key]
        const mark = st === 'paused' ? '⏸ Pausado' : st === 'idle' ? '○ Preparado' : '● Autorizado a trabalhar'
        return `${ROBOT_LABEL[key]} — ${mark}`
      })
      setAnswer({ title: 'Central de robôs', lines, action: 'robos' })
      return
    }
    if (cmd?.action === 'pause' || cmd?.action === 'resume') {
      setPendingRobot({ action: cmd.action, key: cmd.key! })
      setAnswer({
        title: cmd.action === 'pause' ? `Pausar o ${ROBOT_LABEL[cmd.key!]}?` : `Retomar o ${ROBOT_LABEL[cmd.key!]}?`,
        lines: ['A alteração só ocorre depois da confirmação.'],
      })
      return
    }
    setAnswer(runNexusQuery(q, payload))
  }

  async function confirmRobot() {
    if (!pendingRobot || !usuario?.empresaId) return
    await setRobotIntent({
      empresaId: usuario.empresaId,
      key: pendingRobot.key,
      intent: pendingRobot.action === 'pause' ? 'paused' : 'running',
      actor: { usuarioId: usuario.id, usuarioNome: usuario.nome },
    })
    setAnswer({
      title: 'Confirmado',
      lines: [
        pendingRobot.action === 'pause'
          ? `${ROBOT_LABEL[pendingRobot.key]} pausado.`
          : `${ROBOT_LABEL[pendingRobot.key]} retomado.`,
      ],
      action: 'robos',
    })
    setPendingRobot(null)
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
          <PrimaryButton onClick={() => void askInternal()}>Consultar dados</PrimaryButton>
          <PrimaryButton onClick={() => void askBackend()} disabled={loading}>{loading ? 'Consultando...' : 'Perguntar ao backend'}</PrimaryButton>
        </div>
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((s) => (
            <button key={s} type="button" className="px-2 py-1 rounded text-xs nexus-btn-secondary" onClick={() => { setQ(s) }}>{s}</button>
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
            {pendingRobot ? (
              <div className="flex gap-2 mt-3">
                <PrimaryButton onClick={() => void confirmRobot()}>Confirmar</PrimaryButton>
                <GhostButton onClick={() => { setPendingRobot(null); setAnswer(null) }}>Cancelar</GhostButton>
              </div>
            ) : null}
            {answer.action === 'campanha' && <PrimaryButton className="mt-3" onClick={() => nav('/campanhas')}>Preparar campanha</PrimaryButton>}
            {answer.action === 'remarketing' && <PrimaryButton className="mt-3" onClick={() => nav('/remarketing')}>Abrir remarketing</PrimaryButton>}
            {answer.action === 'robos' && <PrimaryButton className="mt-3" onClick={() => nav('/leads-monitor?aba=robos')}>Abrir Central de Robôs</PrimaryButton>}
          </div>
        )}
        {remote && <p className="text-xs mt-4" style={{ color: 'var(--code-muted)' }}>{remote}</p>}
      </div>
    </div>
  )
}

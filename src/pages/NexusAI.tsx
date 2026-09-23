import { useState } from 'react'
import { useNexusStore } from '../contexts/NexusStore'
import { useAuth } from '../contexts/AuthContext'
import { runNexusQuery } from '../lib/aiQuery'
import { GhostButton, TextArea } from '../components/nexus/kit'
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

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4">
      <p className="text-2xl font-semibold mb-6" style={{ color: 'var(--code-text)' }}>Como posso lhe ajudar hoje?</p>
      <form
        className="w-full max-w-2xl"
        onSubmit={(e) => { e.preventDefault(); void askInternal() }}
      >
        <TextArea
          rows={3}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              void askInternal()
            }
          }}
          placeholder="Pergunte sobre leads, propostas ou robôs"
        />
        <button type="submit" className="mt-2 px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: 'var(--code-orange)' }}>Enviar</button>
      </form>
      <div className="flex flex-wrap gap-2 justify-center max-w-2xl mt-4">
        {EXAMPLES.map((s) => (
          <button key={s} type="button" className="text-xs underline" style={{ color: 'var(--code-muted)' }} onClick={() => setQ(s)}>{s}</button>
        ))}
      </div>
      {answer && (
        <div className="w-full max-w-2xl mt-6 text-sm">
          <h2 className="font-semibold mb-2">{answer.title}</h2>
          <ul className="space-y-1">{answer.lines.map((l) => <li key={l}>{l}</li>)}</ul>
          {pendingRobot ? (
            <div className="flex gap-3 mt-3">
              <button type="button" className="text-sm font-semibold" style={{ color: 'var(--code-text)' }} onClick={() => void confirmRobot()}>Confirmar</button>
              <GhostButton onClick={() => { setPendingRobot(null); setAnswer(null) }}>Cancelar</GhostButton>
            </div>
          ) : null}
          {answer.action === 'campanha' && <button type="button" className="mt-3 text-sm underline" onClick={() => nav('/remarketing')}>Abrir remarketing</button>}
          {answer.action === 'remarketing' && <button type="button" className="mt-3 text-sm underline" onClick={() => nav('/remarketing')}>Abrir remarketing</button>}
          {answer.action === 'robos' && <button type="button" className="mt-3 text-sm underline" onClick={() => nav('/leads-monitor?aba=robos')}>Abrir Central de Robôs</button>}
        </div>
      )}
    </div>
  )
}

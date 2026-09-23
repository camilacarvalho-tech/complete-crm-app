import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNexusStore } from '../contexts/NexusStore'
import { LETICIA_ACTION_LABELS, LETICIA_ACTIONS, LETICIA_FIELDS, LETICIA_TRIGGERS, type LeticiaStep } from '../lib/leticiaEngine'
import { EmptyState, GhostButton, PageHeader, PrimaryButton, SelectInput, TextInput } from '../components/nexus/kit'
import { useToast } from '../components/ui/Toast'
import { labelPt } from '../lib/uiPt'

const emptyStep = (): LeticiaStep => ({ tipo: 'trigger', gatilho: 'novo_lead' })

export default function Automacoes() {
  const nav = useNavigate()
  const { automacoes, leticiaRuns } = useNexusStore()
  const toast = useToast()
  const [nome, setNome] = useState('Follow-up lead CLT')
  const [passos, setPassos] = useState<LeticiaStep[]>([
    { tipo: 'trigger', gatilho: 'novo_lead' },
    { tipo: 'condition', campo: 'modalidade', operador: 'eq', valor: 'Crédito CLT' },
    { tipo: 'action', acao: 'criar_tarefa', payload: 'Atender lead CLT' },
    { tipo: 'delay', delayMinutos: 120 },
    { tipo: 'action', acao: 'enviar_whatsapp', payload: 'Olá, podemos seguir com sua simulação?' },
  ])

  function patch(i: number, step: Partial<LeticiaStep>) {
    setPassos((p) => p.map((s, idx) => (idx === i ? { ...s, ...step } : s)))
  }

  async function salvar(status: 'ativa' | 'teste' | 'pausada') {
    if (!nome.trim()) return toast.error('Informe o nome do fluxo')
    await automacoes.create({ nome, status, passos, motor: 'leticia' } as any)
    toast.success(status === 'teste' ? 'Fluxo em modo teste' : 'Fluxo salvo')
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Automações" subtitle="O robô classifica, coloca na fila e faz o follow-up. Quando o cliente responde ou o funcionário assume, o follow-up para. A conversa continua no Chat Clientes. No modo teste nenhuma mensagem sai." />
      <div className="nexus-card p-4 text-sm flex flex-wrap gap-2 items-center">
        <span>Atendimento e distribuição:</span>
        <GhostButton onClick={() => nav('/whatsapp?fila=novos')}>Abrir Chat Clientes / Fila</GhostButton>
      </div>

      <div className="nexus-card p-4 space-y-3">
        <label className="text-xs font-semibold">Nome do fluxo
          <TextInput value={nome} onChange={(e) => setNome(e.target.value)} />
        </label>
        {passos.map((step, i) => (
          <div key={i} className="grid md:grid-cols-5 gap-2 items-center border rounded-lg p-2" style={{ borderColor: 'var(--code-border)' }}>
            <SelectInput value={step.tipo} onChange={(e) => patch(i, { tipo: e.target.value as LeticiaStep['tipo'] })}>
              <option value="trigger">Gatilho</option>
              <option value="condition">SE</option>
              <option value="else">SENÃO</option>
              <option value="action">ENTÃO ação</option>
              <option value="delay">Espera</option>
            </SelectInput>
            {step.tipo === 'trigger' && (
              <SelectInput className="md:col-span-3" value={step.gatilho} onChange={(e) => patch(i, { gatilho: e.target.value })}>
                {LETICIA_TRIGGERS.map((t) => <option key={t} value={t}>{labelPt(t)}</option>)}
              </SelectInput>
            )}
            {step.tipo === 'condition' && (
              <>
                <SelectInput value={step.campo || 'origem'} onChange={(e) => patch(i, { campo: e.target.value })}>
                  {LETICIA_FIELDS.map((f) => (
                    <option key={f.id} value={f.id}>{f.label}</option>
                  ))}
                </SelectInput>
                <SelectInput value={step.operador} onChange={(e) => patch(i, { operador: e.target.value as LeticiaStep['operador'] })}>
                  <option value="eq">igual</option>
                  <option value="neq">diferente</option>
                  <option value="contains">contém</option>
                  <option value="exists">existe</option>
                </SelectInput>
                <TextInput placeholder="valor" value={step.valor || ''} onChange={(e) => patch(i, { valor: e.target.value })} />
              </>
            )}
            {step.tipo === 'action' && (
              <>
                <SelectInput className="md:col-span-2" value={step.acao} onChange={(e) => patch(i, { acao: e.target.value })}>
                  {LETICIA_ACTIONS.map((a) => (
                    <option key={a} value={a}>{LETICIA_ACTION_LABELS[a] || a}</option>
                  ))}
                </SelectInput>
                <TextInput className="md:col-span-2" placeholder="detalhe (mensagem, status, minutos)" value={step.payload || ''} onChange={(e) => patch(i, { payload: e.target.value })} />
              </>
            )}
            {step.tipo === 'delay' && (
              <>
                <TextInput type="number" placeholder="tempo" value={String(step.delayMinutos || 0)} onChange={(e) => patch(i, { delayMinutos: Number(e.target.value) })} />
                <SelectInput value={step.payload || 'minutos'} onChange={(e) => patch(i, { payload: e.target.value })}>
                  <option value="minutos">Minutos</option>
                  <option value="horas">Horas</option>
                  <option value="dias">Dias</option>
                </SelectInput>
              </>
            )}
            <GhostButton type="button" onClick={() => setPassos((p) => p.filter((_, idx) => idx !== i))}>Remover</GhostButton>
          </div>
        ))}
        <div className="flex flex-wrap gap-2">
          <GhostButton type="button" onClick={() => setPassos((p) => [...p, emptyStep()])}>Passo</GhostButton>
          <PrimaryButton type="button" onClick={() => salvar('teste')}>Salvar modo teste</PrimaryButton>
          <PrimaryButton type="button" onClick={() => salvar('ativa')}>Ativar fluxo</PrimaryButton>
        </div>
      </div>
      {automacoes.items.length === 0 ? (
        <EmptyState title="Nenhum fluxo ativo" description="Crie um fluxo. Eventos reais entram na fila automaticamente." />
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {automacoes.items.map((a) => {
            const passos = Array.isArray(a.passos) ? a.passos as { tipo?: string; gatilho?: string; valor?: string; acao?: string; delayMinutos?: number }[] : []
            const fluxo = passos.map((p) => {
              if (p.delayMinutos) return `${p.delayMinutos} min`
              if (p.gatilho) return labelPt(p.gatilho)
              if (p.acao) return labelPt(p.acao)
              return p.valor || ''
            }).filter(Boolean).join(' → ')
            return (
              <article key={a.id} className="nexus-card p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-sm">{String(a.nome)}</h3>
                  <span className="text-[11px]">{labelPt(String(a.status))}</span>
                </div>
                <p className="text-xs" style={{ color: 'var(--code-muted)' }}>{fluxo || 'Gatilho → Condição → Ação'}</p>
                <div className="flex flex-wrap gap-1">
                  <GhostButton onClick={() => automacoes.update(a.id, { status: 'ativa' })}>Ativar</GhostButton>
                  <GhostButton onClick={() => automacoes.update(a.id, { status: 'pausada' })}>Pausar</GhostButton>
                  <GhostButton onClick={() => automacoes.create({ ...a, id: undefined, nome: `${a.nome} cópia`, status: 'pausada' } as any)}>Duplicar</GhostButton>
                  <GhostButton onClick={() => automacoes.update(a.id, { status: 'teste' })}>Testar</GhostButton>
                </div>
              </article>
            )
          })}
        </div>
      )}
      <div className="nexus-card p-4">
        <h2 className="font-semibold mb-2">Histórico de execução</h2>
        {leticiaRuns.items.length === 0 && <p className="text-sm" style={{ color: 'var(--code-muted)' }}>Nenhuma execução ainda.</p>}
        {leticiaRuns.items.slice(0, 20).map((r) => (
          <p key={r.id} className="text-xs border-b py-1">{String(r.flowNome)} · {labelPt(String(r.gatilho || ''))}</p>
        ))}
      </div>
    </div>
  )
}

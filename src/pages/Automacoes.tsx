import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useNexusStore } from '../contexts/NexusStore'
import { LETICIA_ACTIONS, LETICIA_TRIGGERS, type LeticiaStep } from '../lib/leticiaEngine'
import { EmptyState, GhostButton, PageHeader, PrimaryButton, SelectInput, TextInput } from '../components/nexus/kit'
import { useToast } from '../components/ui/Toast'
import { ClienteLink } from '../components/nexus/ClienteLink'
import { originLabel, originCode } from '../catalog/crmCatalog'
import { stageLabel } from '../lib/nexusCore'
import { labelPt } from '../lib/uiPt'

const emptyStep = (): LeticiaStep => ({ tipo: 'trigger', gatilho: 'novo_lead' })

export default function Automacoes() {
  const nav = useNavigate()
  const { usuario } = useAuth()
  const { automacoes, leticiaRuns, conversas, clientes, agenda } = useNexusStore()
  const toast = useToast()
  const [nome, setNome] = useState('Follow-up lead CLT')
  const [passos, setPassos] = useState<LeticiaStep[]>([
    { tipo: 'trigger', gatilho: 'novo_lead' },
    { tipo: 'condition', campo: 'modalidade', operador: 'eq', valor: 'Crédito CLT' },
    { tipo: 'action', acao: 'criar_tarefa', payload: 'Atender lead CLT' },
    { tipo: 'delay', delayMinutos: 120 },
    { tipo: 'action', acao: 'enviar_whatsapp', payload: 'Olá, podemos seguir com sua simulação?' },
  ])

  const fila = conversas.items.filter((c) => c.canal !== 'interno' && c.status !== 'finalizado')

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
      <PageHeader title="Fila de atendimento" subtitle="Receber, identificar, atribuir e acompanhar. A automação Letícia permanece disponível abaixo." />

      <div className="nexus-card overflow-auto">
        {fila.length === 0 ? (
          <div className="p-4"><EmptyState title="Fila vazia" description="Quando um cliente entrar no atendimento, ele aparece aqui." /></div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left" style={{ color: 'var(--code-muted)' }}>
                <th className="p-3">Cliente</th>
                <th className="p-3">Status</th>
                <th className="p-3">Responsável</th>
                <th className="p-3">Produto</th>
                <th className="p-3">Origem</th>
                <th className="p-3">Última mensagem</th>
                <th className="p-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {fila.map((c) => {
                const cli = clientes.items.find((x) => x.id === c.clienteId)
                return (
                  <tr key={c.id} className="border-b" style={{ borderColor: 'var(--code-border)' }}>
                    <td className="p-3">{cli ? <ClienteLink id={cli.id} nome={cli.nome} /> : String(c.titulo || '—')}</td>
                    <td className="p-3">{labelPt(String(c.status || 'em_atendimento'))}</td>
                    <td className="p-3">{String(c.assignedTo || '—')}</td>
                    <td className="p-3">{cli?.modalidade || String(c.modalidade || '—')}{cli?.subproduto ? ` · ${cli.subproduto}` : ''}</td>
                    <td className="p-3">{cli ? originLabel(originCode(String(cli.source || cli.origem))) : '—'}</td>
                    <td className="p-3">{String(c.lastMessage || '—')}</td>
                    <td className="p-3 flex flex-wrap gap-1">
                      <GhostButton onClick={() => conversas.update(c.id, { assignedTo: usuario?.nome, assignedToId: usuario?.id, status: 'em_atendimento' })}>Assumir</GhostButton>
                      <GhostButton onClick={() => nav(`/whatsapp?conversa=${c.id}&cliente=${c.clienteId || ''}`)}>Abrir</GhostButton>
                      <GhostButton onClick={() => conversas.update(c.id, { status: 'finalizado' })}>Finalizar</GhostButton>
                      <GhostButton onClick={() => agenda.create({ titulo: `Retorno ${cli?.nome || ''}`, tipo: 'follow-up', clienteId: c.clienteId, responsavel: usuario?.nome, status: 'aberto' } as any)}>Agendar retorno</GhostButton>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <PageHeader title="Automações (Letícia)" subtitle="Motor IF / THEN / ELSE. WhatsApp só dispara com provedor configurado no backend." />
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
                {LETICIA_TRIGGERS.map((t) => <option key={t}>{t}</option>)}
              </SelectInput>
            )}
            {step.tipo === 'condition' && (
              <>
                <TextInput placeholder="campo" value={step.campo || ''} onChange={(e) => patch(i, { campo: e.target.value })} />
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
                  {LETICIA_ACTIONS.map((a) => <option key={a}>{a}</option>)}
                </SelectInput>
                <TextInput className="md:col-span-2" placeholder="mensagem / etapa / tag" value={step.payload || ''} onChange={(e) => patch(i, { payload: e.target.value })} />
              </>
            )}
            {step.tipo === 'delay' && (
              <TextInput type="number" placeholder="minutos" value={String(step.delayMinutos || 0)} onChange={(e) => patch(i, { delayMinutos: Number(e.target.value) })} />
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
        <ul className="text-sm nexus-card p-4 space-y-2">
          {automacoes.items.map((a) => (
            <li key={a.id} className="flex justify-between gap-2">
              <span>{String(a.nome)} · {labelPt(String(a.status))}</span>
              <GhostButton onClick={() => automacoes.update(a.id, { status: 'pausada' })}>Pausar</GhostButton>
            </li>
          ))}
        </ul>
      )}
      <div className="nexus-card p-4">
        <h2 className="font-semibold mb-2">Histórico de execução</h2>
        {leticiaRuns.items.length === 0 && <p className="text-sm" style={{ color: 'var(--code-muted)' }}>Nenhuma execução ainda.</p>}
        {leticiaRuns.items.slice(0, 20).map((r) => (
          <p key={r.id} className="text-xs border-b py-1">{String(r.flowNome)} · {String(r.gatilho)}</p>
        ))}
      </div>
    </div>
  )
}

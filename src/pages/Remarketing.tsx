import { useEffect, useMemo, useRef, useState } from 'react'
import { useNexusStore } from '../contexts/NexusStore'
import { useAuth } from '../contexts/AuthContext'
import { productCatalogLabel, REMARKETING_STATUSES } from '../catalog/productCatalog'
import { originLabel } from '../catalog/crmCatalog'
import { GhostButton, PageHeader, PrimaryButton, SelectInput } from '../components/nexus/kit'
import { useToast } from '../components/ui/Toast'
import { createdOf, toDate } from '../lib/nexusCore'
import { labelPt, textoMisto } from '../lib/uiPt'
import { maskCpf } from '../lib/format'
import { UnconfiguredWhatsAppProvider } from '../integrations/providers'
import { loadRobotControl, setRobotIntent, type RobotIntent } from '../modules/leads-monitor/services/robotControl'
import { useEscLayer } from '../hooks/useEscLayer'
import type { NexusCliente } from '../types/nexus'

const CONVERTIDOS = new Set(['finalizado', 'contrato', 'aprovado', 'concluido'])

function rotuloCampanha(c: { nome?: unknown; titulo?: unknown; id?: string }) {
  return String(c.nome || c.titulo || c.id || '')
}

function campanhaDeTeste(nome: string) {
  const n = nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '')
  return n.includes('pesquisacredito') || n.includes('planilhateste') || n.includes('creditoclt')
}

function motivoDe(c: NexusCliente): string {
  const texto = `${c.observacoes || ''} ${(c.tags || []).join(' ')}`.trim()
  if (texto) return texto
  const stage = String(c.pipelineStage || c.status || '')
  if (stage === 'documentacao') return 'Não enviou documentação'
  if (stage === 'aguardando_cliente') return 'Não respondeu'
  if (stage === 'proposta' || stage === 'simulacao') return 'Não concluiu proposta'
  if (stage === 'perdido') return 'Parou atendimento'
  return stage ? `Etapa ${labelPt(stage)}` : 'Sem conclusão registrada'
}

function statusDe(c: NexusCliente): string {
  const saved = String((c as NexusCliente & { remarketingStatus?: string }).remarketingStatus || '')
  if (REMARKETING_STATUSES.some((s) => s.id === saved)) return saved
  const stage = String(c.pipelineStage || '')
  if (CONVERTIDOS.has(stage)) return 'convertido'
  if (stage === 'aguardando_cliente') return 'aguardando'
  if (stage === 'perdido' || stage === 'cancelado') return 'pronto_para_disparo'
  return 'novo'
}

export default function Remarketing() {
  const { clientes, remarketing, campanhas, conversas, mensagens } = useNexusStore()
  const { usuario } = useAuth()
  const toast = useToast()
  const [selected, setSelected] = useState<string[]>([])
  const [campanhaId, setCampanhaId] = useState('')
  const [agenda, setAgenda] = useState('')
  const [agendadoEm, setAgendadoEm] = useState('')
  const [busy, setBusy] = useState(false)
  const [enviando, setEnviando] = useState<string[]>([])
  const [lote, setLote] = useState<string[] | null>(null)
  const [robo, setRobo] = useState<RobotIntent | null>(null)
  const roboRef = useRef<RobotIntent | null>(null)
  roboRef.current = robo
  const [caixas, setCaixas] = useState<{ id: string; nome: string; ids: string[]; mensagem: string; retomar5m: boolean; retomarEm: string }[]>([])
  const [aberta, setAberta] = useState<string | null>(null)
  const pararRef = useRef(false)
  useEscLayer(Boolean(aberta), () => setAberta(null))
  const [fase, setFase] = useState<'play' | 'enviando' | 'pausado' | 'sucesso'>('play')
  const [editando, setEditando] = useState<string | null>(null)
  const [nomeCampanha, setNomeCampanha] = useState('')
  const [modelo, setModelo] = useState('')
  const [nomesAbertos, setNomesAbertos] = useState(false)
  const limpouTeste = useRef(false)

  useEffect(() => {
    if (!usuario?.empresaId) return
    void loadRobotControl(usuario.empresaId).then((s) => {
      setRobo(s.followup)
      if (s.followup === 'paused') pararRef.current = true
    })
  }, [usuario?.empresaId])

  useEffect(() => {
    for (const c of campanhas.items) {
      if (!campanhaDeTeste(rotuloCampanha(c)) || limpouTeste.current) continue
      limpouTeste.current = true
      void campanhas.remove(c.id).finally(() => { limpouTeste.current = false })
    }
  }, [campanhas.items, campanhas])

  const campanhasSalvas = campanhas.items.filter((c) => {
    const nome = rotuloCampanha(c).trim()
    return Boolean(nome) && !campanhaDeTeste(nome)
  })

  const regraAtiva = remarketing.items.some((r) => String(r.status || 'ativa') === 'ativa')
  const linhas = useMemo(() => {
    return clientes.items
      .filter((c) => {
        const marcado = String((c as NexusCliente & { remarketingStatus?: string }).remarketingStatus || '')
        const stage = String(c.pipelineStage || c.status || '')
        return Boolean(marcado) || stage === 'remarketing'
      })
      .filter((c) => !CONVERTIDOS.has(String(c.pipelineStage || '')))
      .map((c) => ({
        cliente: c,
        produto: productCatalogLabel(String(c.produto || c.modalidade || c.subproduto || '')) || textoMisto(String(c.produto || c.modalidade || '')) || '—',
        motivo: motivoDe(c),
        ultimo: toDate(c.atualizadoEm || createdOf(c)),
        proxima: String((c as NexusCliente & { proximaAcao?: string }).proximaAcao || (agenda ? `Agendado ${agenda}` : 'Aguardar regra')),
        status: statusDe(c),
      }))
  }, [clientes.items, agenda])

  const naCampanha = new Set(caixas.flatMap((c) => c.ids))
  const visiveis = (lote ? linhas.filter((l) => lote.includes(l.cliente.id)) : linhas).filter((l) => !naCampanha.has(l.cliente.id))
  const todosMarcados = visiveis.length > 0 && visiveis.every((l) => selected.includes(l.cliente.id))

  function toggle(id: string) {
    setSelected((cur) => cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id])
  }

  function toggleTodos() {
    setSelected(todosMarcados ? [] : visiveis.map((l) => l.cliente.id))
  }

  function salvarPlanilha() {
    const escolhidos = linhas.filter((l) => selected.includes(l.cliente.id))
    if (!escolhidos.length) return toast.error('Selecione os contatos.')
    const header = ['Cliente', 'CPF', 'Telefone', 'Produto', 'Motivo', 'Status']
    const corpo = escolhidos.map((l) => [
      textoMisto(l.cliente.nome) || l.cliente.nome || '',
      l.cliente.cpf || '',
      l.cliente.whatsapp || l.cliente.telefone || '',
      l.produto,
      l.motivo,
      REMARKETING_STATUSES.find((s) => s.id === l.status)?.label || labelPt(l.status),
    ])
    const csv = [header, ...corpo]
      .map((row) => row.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';'))
      .join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }))
    a.download = 'remarketing.csv'
    a.click()
    URL.revokeObjectURL(a.href)
    setLote(escolhidos.map((l) => l.cliente.id))
    toast.success('Planilha salva. Estes contatos ficam juntos para o disparo.')
  }

  async function publicarNome(nome: string) {
    const limpo = nome.trim()
    if (!limpo || campanhaDeTeste(limpo)) return ''
    const ja = campanhas.items.find((c) => rotuloCampanha(c).trim().toLowerCase() === limpo.toLowerCase())
    if (ja) {
      setCampanhaId(ja.id)
      return ja.id
    }
    const id = await campanhas.create({ nome: limpo, status: 'ativa' } as never)
    setCampanhaId(id)
    return id
  }

  function salvarSelecionados(enviar: boolean) {
    if (!selected.length) return toast.error('Selecione os contatos.')
    const nome = nomeCampanha.trim() || String(campanhas.items.find((c) => c.id === campanhaId)?.nome || `Campanha ${caixas.length + 1}`)
    const id = `cx-${Date.now()}`
    const msg = modelo.trim()
    setCaixas((cur) => [...cur, { id, nome, ids: [...selected], mensagem: msg, retomar5m: false, retomarEm: '' }])
    void publicarNome(nome)
    toast.success('Campanha salva.')
    if (enviar) void executar(selected, msg)
  }

  function salvarEEnviar(ids: string[]) {
    const nome = nomeCampanha.trim()
    if (!nome) return toast.error('Escreva o nome da campanha.')
    if (!ids.length) return toast.error('Escolha os contatos.')
    const id = `cx-${Date.now()}`
    setCaixas((cur) => [...cur, { id, nome, ids, mensagem: '', retomar5m: false, retomarEm: '' }])
    setEditando(null)
    setNomeCampanha('')
    void publicarNome(nome)
    void executar(ids)
  }

  function guardarCampanha() {
    if (!selected.length) return toast.error('Selecione os contatos da campanha.')
    const nome = nomeCampanha.trim() || String(campanhas.items.find((c) => c.id === campanhaId)?.nome || `Campanha ${caixas.length + 1}`)
    setCaixas((cur) => [...cur, { id: `cx-${Date.now()}`, nome, ids: selected, mensagem: '', retomar5m: false, retomarEm: '' }])
    void publicarNome(nome)
    setSelected([])
    toast.success('Campanha guardada. Clique no quadrado para escrever a mensagem.')
  }

  function agendarSozinho() {
    if (!agenda) return toast.error('Escolha data e hora no calendário.')
    const ids = selected.length ? [...selected] : caixas.flatMap((c) => c.ids)
    if (!ids.length) return toast.error('Selecione os contatos da campanha.')
    const quando = new Date(agenda)
    if (Number.isNaN(quando.getTime()) || quando.getTime() <= Date.now()) return toast.error('A data precisa ser daqui para frente.')
    localStorage.setItem('nexus-rmkt-agenda', JSON.stringify({ em: quando.toISOString(), ids, mensagem: modelo.trim() }))
    setAgendadoEm(quando.toLocaleString('pt-BR'))
    toast.success(`Agendado para ${quando.toLocaleString('pt-BR')}. O robô dispara sozinho.`)
  }

  async function pararDeVerdade() {
    pararRef.current = true
    setFase('pausado')
    setBusy(false)
    setEnviando([])
    localStorage.removeItem('nexus-rmkt-agenda')
    setAgendadoEm('')
    if (usuario?.empresaId) {
      await setRobotIntent({ empresaId: usuario.empresaId, key: 'followup', intent: 'paused' })
    }
    setRobo('paused')
    toast.success('Pausado. O disparo parou.')
  }

  async function retomar() {
    pararRef.current = false
    setFase('play')
    if (usuario?.empresaId) {
      await setRobotIntent({ empresaId: usuario.empresaId, key: 'followup', intent: 'idle' })
    }
    setRobo('idle')
  }

  async function executar(ids: string[], mensagemPronta?: string) {
    if (!ids.length) return toast.error('Selecione ao menos um contato.')
    if (!window.confirm(`Você está prestes a iniciar um disparo para ${ids.length} contatos.`)) return
    if (pararRef.current || fase === 'pausado') return toast.error('Robô pausado. Dê play para disparar.')
    if (!regraAtiva) {
      toast.error('Nenhuma regra de remarketing está ativa. Nenhuma mensagem foi enviada.')
      return
    }
    const caixa = caixas.find((c) => ids.every((id) => c.ids.includes(id))) || caixas.find((c) => c.ids.some((id) => ids.includes(id)))
    const texto = String(mensagemPronta ?? caixa?.mensagem ?? modelo).trim()
    const health = await UnconfiguredWhatsAppProvider.healthCheck()
    pararRef.current = false
    setEnviando(ids)
    setFase('enviando')
    setBusy(true)
    try {
      const alvo = health.status === 'not_configured' ? 'pronto_para_disparo' : 'em_execucao'
      for (const id of ids) {
        if (pararRef.current) {
          setFase('pausado')
          return
        }
        const cli = clientes.items.find((c) => c.id === id)
        await clientes.update(id, {
          remarketingStatus: alvo,
          remarketingCampanhaId: campanhaId || caixa?.id || null,
          remarketingAgendadoPara: agenda || null,
          proximaAcao: 'Campanha enviada',
          origemRemarketing: 'regra',
        } as never)
        const ja = conversas.items.find((c) => c.canal !== 'interno' && c.clienteId === id)
        const cid = ja?.id || await conversas.create({
          clienteId: id,
          canal: 'whatsapp',
          channel: 'WHATSAPP',
          titulo: cli?.nome || 'Cliente',
          status: 'novos',
          origemLead: 'remarketing',
          campanhaNome: caixa?.nome || 'Remarketing',
          lastMessage: texto || 'Campanha de remarketing',
        } as never)
        if (texto) {
          await mensagens.create({
            conversaId: cid,
            clienteId: id,
            texto,
            tipo: 'texto',
            autorNome: 'Robô RMKT',
            origem: 'remarketing',
            status: 'enviado',
          } as never)
          if (ja?.id) await conversas.update(cid, { lastMessage: texto, campanhaNome: caixa?.nome || 'Remarketing' } as never)
        }
      }
      if (pararRef.current) {
        setFase('pausado')
        return
      }
      setFase('sucesso')
      toast.success(health.status === 'not_configured'
        ? 'Campanha enviada com sucesso no Chat Clientes. O WhatsApp do celular ainda não está configurado.'
        : 'Campanha enviada com sucesso. As respostas caem no Chat Clientes.')
    } catch (e) {
      setFase('play')
      toast.error('Não foi possível atualizar a fila', e instanceof Error ? e.message : '')
    } finally {
      setEnviando([])
      setBusy(false)
    }
  }

  const executarRef = useRef(executar)
  executarRef.current = executar
  useEffect(() => {
    const t = window.setInterval(() => {
      if (pararRef.current || roboRef.current === 'paused') return
      const raw = localStorage.getItem('nexus-rmkt-agenda')
      if (!raw) return
      let job: { em?: string; ids?: string[]; mensagem?: string }
      try { job = JSON.parse(raw) } catch { return }
      if (!job.em || !job.ids?.length || new Date(job.em).getTime() > Date.now()) return
      localStorage.removeItem('nexus-rmkt-agenda')
      setAgendadoEm('')
      void executarRef.current(job.ids, job.mensagem || '')
    }, 15000)
    return () => window.clearInterval(t)
  }, [])

  async function marcar(status: string) {
    if (!selected.length) return toast.error('Selecione os contatos.')
    for (const id of selected) await clientes.update(id, { remarketingStatus: status } as never)
    toast.success('Status atualizado')
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Remarketing"
        subtitle="Contatos que não concluíram a operação. O robô fica ativo, mas só dispara com regra habilitada."
        actions={<PrimaryButton onClick={() => void (busy ? pararDeVerdade() : executar(linhas.filter((l) => l.status === 'pronto_para_disparo' || selected.includes(l.cliente.id)).map((l) => l.cliente.id)))}>{busy ? 'Em andamento' : '▶ Executar Remarketing'}</PrimaryButton>}
      />
      <div className="nexus-card p-3 flex flex-wrap gap-2 items-end text-sm">
        <span className="font-semibold">Robô de follow-up: {robo === 'paused' ? 'Pausado' : robo === 'running' ? 'Ativo' : 'Preparado'}</span>
        <SelectInput value={campanhaId} onChange={(e) => setCampanhaId(e.target.value)}>
          <option value="">Campanha</option>
          {campanhasSalvas.map((c) => <option key={c.id} value={c.id}>{rotuloCampanha(c)}</option>)}
        </SelectInput>
        <label className="text-xs">Calendário
          <input type="datetime-local" className="nexus-input block" value={agenda} onChange={(e) => setAgenda(e.target.value)} />
        </label>
        <GhostButton type="button" onClick={agendarSozinho}>Agendar sozinho</GhostButton>
        {agendadoEm && <span className="text-xs">Robô sozinho em {agendadoEm}. Pausar cancela.</span>}
        <GhostButton type="button" onClick={() => void pararDeVerdade()}>Pausar</GhostButton>
        <GhostButton type="button" onClick={() => void marcar('novo')}>Cancelar fila</GhostButton>
        <GhostButton type="button" onClick={salvarPlanilha}>Salvar planilha</GhostButton>
        <GhostButton type="button" onClick={guardarCampanha}>Montar campanha</GhostButton>
        <GhostButton type="button" disabled={busy} onClick={() => salvarSelecionados(false)}>Salvar campanha</GhostButton>
        <GhostButton type="button" disabled={busy} onClick={() => salvarSelecionados(true)}>Enviar mensagem modelo</GhostButton>
      </div>
      <label className="block text-xs font-semibold">Mensagem modelo
        <textarea className="nexus-input w-full text-sm mt-1" rows={3} placeholder="Texto que sai para os nomes marcados" value={modelo} onChange={(e) => setModelo(e.target.value)} />
      </label>
      <div className="nexus-card p-3 flex flex-wrap items-center gap-3 text-sm">
        <b>{busy || fase === 'enviando' ? 'Em andamento' : fase === 'pausado' ? 'Pausado' : fase === 'sucesso' ? 'Campanha enviada com sucesso' : 'Pronto'}</b>
        <span style={{ color: 'var(--code-muted)' }}>{caixas.reduce((n, c) => n + c.ids.length, 0) || selected.length} contatos</span>
        <GhostButton type="button" onClick={() => void (busy ? pararDeVerdade() : retomar())}>{busy ? 'Em andamento' : 'Play'}</GhostButton>
        <GhostButton type="button" onClick={() => void pararDeVerdade()}>Pausar</GhostButton>
      </div>
      {lote && (
        <p className="text-xs">
          Lote salvo. Só estes contatos aparecem para disparar.{' '}
          <button type="button" className="font-semibold" style={{ color: 'var(--code-orange)' }} onClick={() => setLote(null)}>Mostrar todos</button>
        </p>
      )}
      <p className="text-xs" style={{ color: 'var(--code-muted)' }}>
        {robo === 'paused'
          ? 'Follow-up pausado na Central de Robôs. Nenhum disparo automático sai enquanto estiver pausado.'
          : regraAtiva
            ? 'Robô ativo. O disparo só sai com a regra habilitada e o WhatsApp configurado.'
            : 'Robô preparado. Sem regra de envio, nenhuma mensagem sai.'}
      </p>
      {caixas.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {caixas.map((cx) => (
            <button key={cx.id} type="button" className="nexus-card px-3 py-2 text-left text-sm min-w-[140px]" onClick={() => setAberta(cx.id)}>
              <b className="block">{cx.nome}</b>
              <span className="text-[11px]" style={{ color: 'var(--code-muted)' }}>{cx.ids.length} contatos</span>
            </button>
          ))}
        </div>
      )}
      {aberta && (() => {
        const cx = caixas.find((c) => c.id === aberta)
        if (!cx) return null
        return (
          <div className="nexus-card p-3 space-y-2">
            <div className="flex justify-between items-center gap-2">
              <input
                className="nexus-input text-sm font-semibold flex-1"
                value={cx.nome}
                onChange={(e) => setCaixas((cur) => cur.map((c) => c.id === cx.id ? { ...c, nome: e.target.value } : c))}
              />
              <button type="button" className="text-xs" data-nexus-esc onClick={() => setAberta(null)}>Fechar</button>
            </div>
            <p className="text-xs" style={{ color: 'var(--code-muted)' }}>{cx.ids.length} contatos</p>
            <textarea
              className="nexus-input w-full text-sm"
              rows={3}
              placeholder="Mensagem para disparar"
              value={cx.mensagem}
              onChange={(e) => setCaixas((cur) => cur.map((c) => c.id === cx.id ? { ...c, mensagem: e.target.value } : c))}
            />
            {(fase === 'enviando' || fase === 'sucesso') && (
              <p className="text-sm font-semibold">{fase === 'enviando' ? 'Robô enviando' : 'Campanha enviada com sucesso'}</p>
            )}
            <GhostButton type="button" onClick={() => void (busy ? pararDeVerdade() : executar(cx.ids))}>{busy ? 'Em andamento' : 'Disparar'}</GhostButton>
          </div>
        )
      })()}
      <div className="flex items-center justify-between gap-2 text-xs">
        <span style={{ color: 'var(--code-muted)' }}>{visiveis.length} nomes na fila</span>
        <GhostButton type="button" onClick={() => setNomesAbertos((v) => !v)}>{nomesAbertos ? 'Recolher clientes' : `Clientes fechados (${visiveis.length})`}</GhostButton>
      </div>
      <div className="nexus-card overflow-x-auto propostas-hscroll">
        <table className="w-full text-xs min-w-[720px]">
          <thead>
            <tr>
              <th className="p-2"><input type="checkbox" checked={todosMarcados} onChange={toggleTodos} aria-label="Selecionar todos" /></th>
              <th className="p-2 text-left">Campanha</th>
              <th className="p-2 text-left">Contatos</th>
              <th className="p-2 text-left">Robô</th>
              <th className="p-2 text-left">Resultado</th>
              <th className="p-2 text-left">Editar</th>
            </tr>
          </thead>
          <tbody>
            {caixas.length === 0 && visiveis.length === 0 && <tr><td className="p-3" colSpan={6}>Nenhuma campanha montada.</td></tr>}
            {caixas.map((cx) => (
              <tr key={cx.id} className="border-t" style={{ borderColor: 'var(--code-border)' }}>
                <td className="p-2"><input type="checkbox" checked={cx.ids.every((id) => selected.includes(id))} onChange={() => setSelected((cur) => cx.ids.every((id) => cur.includes(id)) ? cur.filter((id) => !cx.ids.includes(id)) : [...new Set([...cur, ...cx.ids])])} aria-label="Selecionar campanha" /></td>
                <td className="p-2">
                  {editando === cx.id ? (
                    <input className="nexus-input text-xs" value={nomeCampanha} onChange={(e) => setNomeCampanha(e.target.value)} placeholder="Nome da campanha" />
                  ) : cx.nome}
                </td>
                <td className="p-2">{cx.ids.length}</td>
                <td className="p-2">{fase === 'enviando' ? 'Robô enviando' : fase === 'pausado' ? 'Pausando' : 'Play'}</td>
                <td className="p-2">{fase === 'sucesso' ? 'Campanha enviada com sucesso' : fase === 'enviando' ? 'Enviando' : 'Aguardando disparo'}</td>
                <td className="p-2">
                  {editando === cx.id ? (
                    <button type="button" className="font-semibold" style={{ color: 'var(--code-orange)' }} onClick={() => { setCaixas((cur) => cur.map((c) => c.id === cx.id ? { ...c, nome: nomeCampanha.trim() || c.nome } : c)); setEditando(null); void executar(cx.ids) }}>Salvar e enviar</button>
                  ) : (
                    <button type="button" className="font-semibold" style={{ color: 'var(--code-orange)' }} onClick={() => { setEditando(cx.id); setNomeCampanha(cx.nome) }}>Editar</button>
                  )}
                </td>
              </tr>
            ))}
            {nomesAbertos && visiveis.map((l) => (
              <tr key={l.cliente.id} className="border-t" style={{ borderColor: 'var(--code-border)' }}>
                <td className="p-2"><input type="checkbox" checked={selected.includes(l.cliente.id)} onChange={() => toggle(l.cliente.id)} aria-label="Selecionar nome" /></td>
                <td className="p-2">
                  {editando === l.cliente.id ? (
                    <input className="nexus-input text-xs" value={nomeCampanha} onChange={(e) => setNomeCampanha(e.target.value)} placeholder="Nome da campanha" />
                  ) : (textoMisto(l.cliente.nome) || '—')}
                </td>
                <td className="p-2">1</td>
                <td className="p-2">{robo === 'paused' ? 'Pausando' : 'Play'}</td>
                <td className="p-2">{l.motivo}</td>
                <td className="p-2">
                  {editando === l.cliente.id ? (
                    <button type="button" className="font-semibold" style={{ color: 'var(--code-orange)' }} onClick={() => salvarEEnviar([l.cliente.id])}>Salvar e enviar</button>
                  ) : (
                    <button type="button" className="font-semibold" style={{ color: 'var(--code-orange)' }} onClick={() => { setEditando(l.cliente.id); setNomeCampanha('') }}>Editar</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px]" style={{ color: 'var(--code-muted)' }}>Origem registrada: {originLabel('leads_monitor')} quando o lead veio do Monitor.</p>
    </div>
  )
}

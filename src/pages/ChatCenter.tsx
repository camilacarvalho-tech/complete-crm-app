import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useNexusStore } from '../contexts/NexusStore'
import { DOCUMENT_CATEGORIES } from '../types/nexus'
import { EmptyState, ErrorBanner, GhostButton, LoadingBlock, PageHeader, PrimaryButton, SelectInput, TextArea, TextInput } from '../components/nexus/kit'
import { useToast } from '../components/ui/Toast'
import { writeAudit } from '../lib/audit'
import { getWhatsAppProvider } from '../integrations/providers'
import { labelPt } from '../lib/uiPt'
import { originLabel, originCode } from '../catalog/crmCatalog'
import { stageLabel } from '../lib/nexusCore'
import { ClienteLink } from '../components/nexus/ClienteLink'

const INBOX = [
  { id: 'todas', label: 'Todas' },
  { id: 'nao_lidas', label: 'Não lidas' },
  { id: 'minhas', label: 'Minhas' },
  { id: 'equipe', label: 'Equipe' },
  { id: 'sem_responsavel', label: 'Sem responsável' },
  { id: 'favoritas', label: 'Favoritas' },
  { id: 'prioridade', label: 'Prioridade' },
  { id: 'aguardando_cliente', label: 'Aguardando cliente' },
  { id: 'finalizadas', label: 'Finalizadas' },
]

export default function ChatCenter() {
  const { usuario } = useAuth()
  const toast = useToast()
  const { conversas, mensagens, clientes, documentos, usuariosEmpresa, equipes } = useNexusStore()
  const [params, setParams] = useSearchParams()
  const clientePref = params.get('cliente')
  const modalidade = params.get('modalidade')
  const [filtro, setFiltro] = useState('todas')
  const [texto, setTexto] = useState('')
  const [interno, setInterno] = useState(false)
  const [busca, setBusca] = useState('')
  const [waReady, setWaReady] = useState<boolean | null>(null)
  const selectedId = params.get('conversa')

  const lista = useMemo(() => {
    const q = busca.toLowerCase()
    return conversas.items.filter((c) => {
      if (c.canal === 'interno') return false
      if (filtro === 'nao_lidas' && !c.naoLidas) return false
      if (filtro === 'minhas' && String(c.assignedToId || '') !== String(usuario?.id || '')) return false
      if (filtro === 'equipe' && !c.equipeId) return false
      if (filtro === 'sem_responsavel' && c.assignedTo) return false
      if (filtro === 'favoritas' && !c.favorito) return false
      if (filtro === 'prioridade' && !c.urgente && String(c.prioridade || '') !== 'alta') return false
      if (filtro === 'aguardando_cliente' && c.status !== 'aguardando_cliente') return false
      if (filtro === 'finalizadas' && c.status !== 'finalizado') return false
      if (clientePref && c.clienteId !== clientePref) return false
      if (q) {
        const blob = `${c.titulo} ${c.lastMessage} ${c.canal} ${c.assignedTo} ${c.status}`.toLowerCase()
        const cli = clientes.items.find((x) => x.id === c.clienteId)
        const extra = `${cli?.nome} ${cli?.telefone} ${cli?.whatsapp}`.toLowerCase()
        if (!blob.includes(q) && !extra.includes(q)) return false
      }
      return true
    })
  }, [conversas.items, filtro, clientePref, busca, usuario?.id, clientes.items])

  const selected = conversas.items.find((c) => c.id === selectedId) || lista[0]
  const cliente = clientes.items.find((c) => c.id === selected?.clienteId || c.id === clientePref)
  const msgs = mensagens.items
    .filter((m) => m.conversaId === selected?.id)
    .sort((a, b) => String(a.criadoEm || '').localeCompare(String(b.criadoEm || '')))

  async function ensureConversa() {
    if (selected?.id) return selected.id
    if (!clientePref && !cliente) {
      toast.error('Selecione um cliente para iniciar o atendimento')
      return null
    }
    const id = await conversas.create({
      clienteId: cliente?.id || clientePref,
      canal: 'whatsapp',
      channel: 'WHATSAPP',
      status: 'em_atendimento',
      assignedTo: usuario?.nome,
      assignedToId: usuario?.id,
      lastAssignedTo: usuario?.nome,
      titulo: cliente?.nome || 'Conversa',
      modalidade: modalidade || cliente?.modalidade || '',
      naoLidas: 0,
      slaPrimeiraRespostaMin: null,
    } as any)
    setParams({ conversa: id, cliente: String(cliente?.id || clientePref || '') })
    return id
  }

  async function send() {
    const cid = await ensureConversa()
    if (!cid || !texto.trim()) return
    if (!interno) {
      const health = await getWhatsAppProvider().healthCheck()
      setWaReady(health.status === 'online')
      if (health.status !== 'online') {
        toast.error('WhatsApp ainda não configurado.')
        return
      }
      const sent = await getWhatsAppProvider().sendMessage(String(cliente?.whatsapp || cliente?.telefone || ''), texto.trim())
      if (!sent.ok) {
        toast.error(sent.message || 'WhatsApp ainda não configurado.')
        return
      }
    }
    await mensagens.create({
      conversaId: cid,
      texto: texto.trim(),
      tipo: interno ? 'nota_interna' : 'texto',
      interno,
      autorId: usuario?.id,
      autorNome: usuario?.nome,
      status: interno ? 'enviada' : 'enviando',
      channel: selected?.canal || 'whatsapp',
    } as any)
    await conversas.update(cid, { lastMessage: texto.trim(), status: interno ? selected?.status : 'aguardando_cliente', lastAssignedTo: selected?.assignedTo })
    setTexto('')
  }

  async function attach(file: File) {
    const cid = await ensureConversa()
    if (!cid || !cliente) return
    const health = await getWhatsAppProvider().healthCheck()
    if (health.status !== 'online') {
      toast.error('WhatsApp ainda não configurado.')
      return
    }
    await documentos.create({
      clienteId: cliente.id,
      conversaId: cid,
      nome: file.name,
      categoria: DOCUMENT_CATEGORIES[11],
      origem: 'whatsapp',
      funcionario: usuario?.nome,
      tamanho: file.size,
      tipoArquivo: file.type,
    } as any)
    const tipo = file.type.startsWith('image/') ? 'imagem' : file.type.startsWith('audio/') ? 'audio' : file.type.startsWith('video/') ? 'video' : 'documento'
    await mensagens.create({ conversaId: cid, texto: file.name, tipo, autorNome: usuario?.nome, status: 'enviando' } as any)
    await writeAudit({ empresaId: documentos.empresaId, usuarioNome: usuario?.nome, modulo: 'documentos', acao: 'anexar_chat', entidadeId: cliente.id })
  }

  if (conversas.loading) return <LoadingBlock />

  return (
    <div className="space-y-3">
      <PageHeader title="WhatsApp" subtitle="Central oficial. Enter envia. Shift+Enter quebra linha. Mensagens só saem com provedor configurado." />
      {waReady === false && <p className="text-sm" style={{ color: 'var(--code-warning)' }}>WhatsApp ainda não configurado.</p>}
      <ErrorBanner message={conversas.error} />
      <TextInput placeholder="Buscar cliente, telefone, mensagem, responsável" value={busca} onChange={(e) => setBusca(e.target.value)} />
      <div className="grid lg:grid-cols-[180px_260px_1fr_280px] gap-3 min-h-[70vh]">
        <div className="nexus-card p-2 overflow-y-auto">
          {INBOX.map((f) => (
            <button key={f.id} onClick={() => setFiltro(f.id)} className={`w-full text-left px-2 py-2 rounded-lg text-xs font-semibold mb-1 ${filtro === f.id ? 'nexus-cta text-white' : ''}`}>{f.label}</button>
          ))}
        </div>
        <div className="nexus-card p-2 overflow-y-auto">
          {lista.length === 0 && <EmptyState title="Sem conversas" description="Abra um cliente e inicie o atendimento." />}
          {lista.map((c) => {
            const cli = clientes.items.find((x) => x.id === c.clienteId)
            return (
              <button key={c.id} onClick={() => setParams({ conversa: c.id, cliente: String(c.clienteId || '') })} className={`w-full text-left px-2 py-2 rounded-lg mb-1 ${selected?.id === c.id ? 'bg-[color:var(--code-surface-muted)]' : ''}`}>
                <div className="flex justify-between gap-2">
                  <p className="text-sm font-semibold truncate">{String(c.titulo || cli?.nome || 'Conversa')}</p>
                  {Number(c.naoLidas || 0) > 0 && <span className="text-[10px] px-1.5 rounded-full text-white" style={{ background: 'var(--code-orange)' }}>{String(c.naoLidas)}</span>}
                </div>
                <p className="text-[11px] truncate" style={{ color: 'var(--code-muted)' }}>{String(c.lastMessage || '—')}</p>
                <p className="text-[10px]" style={{ color: 'var(--code-muted)' }}>{String(c.assignedTo || 'sem responsável')}</p>
              </button>
            )
          })}
        </div>
        <div className="nexus-card flex flex-col min-h-[60vh]">
          {selected || cliente ? (
            <>
              <div className="p-3 border-b flex flex-wrap gap-2 items-center text-xs" style={{ borderColor: 'var(--code-border)' }}>
                <strong>{cliente?.nome || selected?.titulo}</strong>
                <SelectInput value={String(selected?.status || 'em_atendimento')} onChange={(e) => selected && conversas.update(selected.id, { status: e.target.value })}>
                  <option value="em_atendimento">EM ATENDIMENTO</option>
                  <option value="aguardando_cliente">AGUARDANDO CLIENTE</option>
                  <option value="aguardando_funcionario">AGUARDANDO FUNCIONÁRIO</option>
                  <option value="finalizado">FINALIZADO</option>
                </SelectInput>
                <SelectInput value={String(selected?.assignedToId || '')} onChange={(e) => {
                  const u = usuariosEmpresa.items.find((x) => x.id === e.target.value)
                  if (selected) conversas.update(selected.id, { lastAssignedTo: selected.assignedTo, assignedTo: u?.nome || usuario?.nome, assignedToId: e.target.value || usuario?.id })
                }}>
                  <option value="">Atribuir funcionário</option>
                  {usuariosEmpresa.items.map((u) => <option key={u.id} value={u.id}>{String(u.nome)}</option>)}
                </SelectInput>
                <SelectInput value={String(selected?.equipeId || '')} onChange={(e) => selected && conversas.update(selected.id, { equipeId: e.target.value })}>
                  <option value="">Equipe</option>
                  {equipes.items.map((u) => <option key={u.id} value={u.id}>{String(u.nome)}</option>)}
                </SelectInput>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {msgs.map((m) => (
                  <div key={m.id} className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${m.interno ? 'chat-msg-note ml-auto' : m.autorId === usuario?.id ? 'chat-msg-out ml-auto' : 'chat-msg-in'}`}>
                    <p className="text-[10px]" style={{ color: 'var(--code-muted)' }}>{String(m.autorNome || '')} · {labelPt(String(m.status || 'enviando'))}{m.interno ? ' · NOTA INTERNA' : ''}</p>
                    {String(m.tipo) === 'imagem' && <p>Imagem: {String(m.texto)}</p>}
                    {String(m.tipo) === 'documento' && <p>Documento: {String(m.texto)}</p>}
                    {String(m.tipo) === 'audio' && <p>Áudio: {String(m.texto)}</p>}
                    {String(m.tipo) === 'video' && <p>Vídeo: {String(m.texto)}</p>}
                    {!['imagem', 'documento', 'audio', 'video'].includes(String(m.tipo)) && <p>{String(m.texto || '')}</p>}
                  </div>
                ))}
                {msgs.length === 0 && <p className="text-sm" style={{ color: 'var(--code-muted)' }}>Nenhuma mensagem nesta conversa.</p>}
              </div>
              <div className="p-3 border-t space-y-2" style={{ borderColor: 'var(--code-border)' }}>
                <div className="flex gap-2">
                  <TextArea
                    rows={2}
                    value={texto}
                    onChange={(e) => setTexto(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        void send()
                      }
                    }}
                    placeholder={interno ? 'Nota interna (não enviada ao cliente)' : 'Mensagem'}
                  />
                  <PrimaryButton onClick={() => void send()}>Enviar</PrimaryButton>
                </div>
                <div className="flex flex-wrap gap-2 items-center text-xs">
                  <label className="flex items-center gap-1"><input type="checkbox" checked={interno} onChange={(e) => setInterno(e.target.checked)} /> Nota interna</label>
                  <label className="cursor-pointer font-semibold" style={{ color: 'var(--code-orange)' }}>
                    Anexar
                    <input type="file" accept="image/*,application/pdf,audio/*,video/*,.doc,.docx" className="hidden" onChange={(e) => e.target.files?.[0] && attach(e.target.files[0])} />
                  </label>
                  <GhostButton type="button" onClick={() => toast.error('WhatsApp ainda não configurado.')}>Gravar áudio</GhostButton>
                  {selected && (
                    <>
                      <GhostButton onClick={() => conversas.update(selected.id, { favorito: !selected.favorito })}>Favoritar</GhostButton>
                      <GhostButton onClick={() => conversas.update(selected.id, { urgente: !selected.urgente, prioridade: selected.urgente ? 'normal' : 'alta' })}>Prioridade</GhostButton>
                      <GhostButton onClick={() => conversas.update(selected.id, { status: 'finalizado' })}>Finalizar</GhostButton>
                      <GhostButton onClick={() => conversas.update(selected.id, { assignedTo: usuario?.nome, assignedToId: usuario?.id, lastAssignedTo: selected.assignedTo, status: 'em_atendimento' })}>Assumir</GhostButton>
                      <a className="font-semibold" href="/tarefas">Nova tarefa</a>
                      <a className="font-semibold" href="/propostas">Nova proposta</a>
                    </>
                  )}
                </div>
              </div>
            </>
          ) : (
            <EmptyState title="Selecione uma conversa" description="O histórico real é preservado por cliente." />
          )}
        </div>
        <div className="nexus-card p-4 text-sm space-y-2">
          {cliente ? (
            <>
              <p className="font-bold"><ClienteLink id={cliente.id} nome={cliente.nome} /></p>
              <p>Telefone: {cliente.telefone || '—'}</p>
              <p>WhatsApp: {cliente.whatsapp || '—'}</p>
              <p>Produto: {cliente.modalidade || cliente.produto || '—'}</p>
              {cliente.subproduto && <p>Operação: {cliente.subproduto}</p>}
              <p>Etapa: {stageLabel(String(cliente.pipelineStage))}</p>
              <p>Origem: {originLabel(originCode(String(cliente.source || cliente.origem)))}</p>
              <p>Responsável: {cliente.responsavel || selected?.assignedTo || '—'}</p>
            </>
          ) : (
            <p style={{ color: 'var(--code-muted)' }}>Dados do cliente aparecem ao selecionar a conversa.</p>
          )}
        </div>
      </div>
    </div>
  )
}

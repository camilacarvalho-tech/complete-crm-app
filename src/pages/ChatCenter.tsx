import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { useAuth } from '../contexts/AuthContext'
import { useNexusStore } from '../contexts/NexusStore'
import { storage } from '../firebase'
import { EmptyState, ErrorBanner, GhostButton, LoadingBlock, PrimaryButton, SelectInput, TextArea, TextInput } from '../components/nexus/kit'
import { NexusModal } from '../components/nexus/Modal'
import { useToast } from '../components/ui/Toast'
import { writeAudit } from '../lib/audit'
import { inferCategoriaDocumento } from '../lib/documentCategoria'
import { origemPrincipalDe, origemTexto } from '../lib/origemLead'
import { produtoLabel } from '../modules/leads-monitor/catalog/produtosMonitor'
import { drainErpInbound } from '../lib/inboundErpMessage'
import { drainErpToCrmEvents } from '../integrations/events/eventHandlers'
import { drainNxErpHttpInbox, sendReplyViaNxErp } from '../integrations/erp/drainNxErpInbox'
import { deliveryGlyph, deliveryLabel, deliveryMark, motivoEnvioWhatsapp, newClientMessageId, phoneError } from '../integrations/erp/chatOutbound'
import { loadNxErpCrmConfig } from '../integrations/erp/nxErpCrmClient'
import { conversaFinalizada, instanteChat, naoLidasDe, ordenarConversas, teclaEnviaMensagem } from '../lib/chatLista'
import { camposConversa, leticiaReply, leticiaTravada, LETICIA_MENU_BOTAO, LETICIA_MENU_TITULO, stepDoBot } from '../modules/chat-robot/leticiaReception'
import { formatMessageClock, horaMensagem, rotuloDiaMensagem } from '../lib/messageClock'
import { gravacaoParaOgg } from '../lib/oggOpus'
import { textoMisto } from '../lib/uiPt'
import { EmojiPicker } from '../components/chat/EmojiPicker'
import { ClienteLink } from '../components/nexus/ClienteLink'
import { chaveTelefoneBr, digits, maskCpf, maskPhone } from '../lib/format'
import { mascaraCpf, mascaraTelefone } from '../modules/digitacao/producaoEsteira'
import './chatInterno.css'

const VISTA = [
  { id: 'conversas', label: 'Conversas' },
  { id: 'finalizados', label: 'Finalizados' },
]

function asDate(v: unknown): Date | null {
  if (!v) return null
  if (v instanceof Date) return v
  if (typeof v === 'object' && v && 'toDate' in v && typeof (v as { toDate: () => Date }).toDate === 'function') {
    try { return (v as { toDate: () => Date }).toDate() } catch { return null }
  }
  if (typeof v === 'object' && v && 'seconds' in v) return new Date(Number((v as { seconds: number }).seconds) * 1000)
  const d = new Date(String(v))
  return Number.isNaN(d.getTime()) ? null : d
}

function dataHora(v: unknown) {
  const d = asDate(v)
  if (!d) return '—'
  return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
}

function displayPhone(value?: string) {
  const d = digits(value)
  if (d.length === 11) return `${d.slice(0, 2)} ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `${d.slice(0, 2)} ${d.slice(2, 6)}-${d.slice(6)}`
  const masked = maskPhone(value)
  return masked || ''
}

function displayCpfSidebar(value?: string) {
  const d = digits(value)
  if (!d) return ''
  return maskCpf(d)
}

function lerNascimento(obj?: object | null) {
  if (!obj) return ''
  const rec = obj as Record<string, unknown>
  for (const key of ['dataNascimento', 'nascimento', 'dtNascimento', 'data_nascimento', 'birthDate', 'dataNasc']) {
    const v = String(rec[key] ?? '').trim()
    if (v) return v
  }
  return ''
}

function nascimentoParaInput(value?: string): string {
  const raw = String(value || '').trim()
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`
  const br = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})/)
  if (br) return `${br[3]}-${br[2]}-${br[1]}`
  const compacto = digits(raw)
  if (compacto.length === 8) return `${compacto.slice(4)}-${compacto.slice(2, 4)}-${compacto.slice(0, 2)}`
  const d = asDate(value)
  if (!d) return ''
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mes}-${dia}`
}

function moneyOrEmpty(v: unknown) {
  const n = Number(v)
  if (!Number.isFinite(n) || n <= 0) return ''
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function statusAtendimentoLabel(status?: string) {
  const mapa: Record<string, string> = {
    aguardando_triagem: 'Nova conversa',
    novos: 'Nova conversa',
    aguardando_funcionario: 'Aguardando atendimento',
    aguardando_atendimento: 'Aguardando atendimento',
    aguardando: 'Aguardando atendimento',
    em_atendimento: 'Em atendimento',
    transferido: 'Transferido',
    remarketing: 'Remarketing',
    aguardando_cliente: 'Aguardando cliente',
    documentacao: 'Documentação',
    proposta: 'Proposta',
    contrato: 'Contrato',
    finalizado: 'Finalizado',
    finalizados: 'Finalizado',
  }
  return { label: mapa[String(status || '')] || 'Novos', color: 'var(--code-orange)' }
}

export default function ChatCenter() {
  const { usuario } = useAuth()
  const toast = useToast()
  const { conversas, mensagens, clientes, documentos, propostas, digitacoes, contratos, usuariosEmpresa } = useNexusStore()
  const [params, setParams] = useSearchParams()
  const clientePref = params.get('cliente')
  const modalidade = params.get('modalidade')
  const vistaInicial = params.get('fila')
  const [filtro, setFiltro] = useState(VISTA.some((v) => v.id === vistaInicial) ? String(vistaInicial) : 'conversas')
  const [marcadas, setMarcadas] = useState<string[]>([])
  const [excluindo, setExcluindo] = useState(false)
  useEffect(() => {
    if (!VISTA.some((v) => v.id === filtro)) setFiltro('conversas')
  }, [filtro])
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [emojis, setEmojis] = useState(false)
  const [midia, setMidia] = useState<{ file: File; url: string; legenda: string } | null>(null)
  const [audioPreview, setAudioPreview] = useState<{ url: string; file: File } | null>(null)
  const [gravandoSeg, setGravandoSeg] = useState(0)
  const [limiteMsgs, setLimiteMsgs] = useState(50)
  const [longeDoFim, setLongeDoFim] = useState(false)
  const [midiaFalhou, setMidiaFalhou] = useState<Record<string, boolean>>({})
  const [gravando, setGravando] = useState(false)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const enviarAoPararRef = useRef(false)
  const envioEmCursoRef = useRef(false)
  const cancelarGravacaoRef = useRef(false)
  const pausadoRef = useRef(false)
  const imagemRef = useRef<HTMLInputElement>(null)
  const documentoRef = useRef<HTMLInputElement>(null)
  const planilhaRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLInputElement>(null)
  const [menuAnexo, setMenuAnexo] = useState(false)
  const [audioPausado, setAudioPausado] = useState(false)
  const [respondendo, setRespondendo] = useState<{ id: string; texto: string; wamid: string } | null>(null)
  const [menuMsg, setMenuMsg] = useState<string | null>(null)
  const [editando, setEditando] = useState<{ id: string; texto: string; clientMessageId: string; reenviar: boolean } | null>(null)
  const envioTickRef = useRef(false)
  const listaChatRef = useRef<HTMLDivElement>(null)
  const noFundoRef = useRef(true)
  const [busca, setBusca] = useState('')
  const [novoCli, setNovoCli] = useState(false)
  const [obsAberta, setObsAberta] = useState(false)
  const [obsTexto, setObsTexto] = useState('')
  const [pastaLocal, setPastaLocal] = useState<{ id: string; clienteId: string; nome: string; url: string; tipo: string }[]>([])
  const [manual, setManual] = useState({ nome: '', cpf: '', telefone: '' })
  const [painel, setPainel] = useState<'lista' | 'chat' | 'ficha'>(params.get('conversa') ? 'chat' : 'lista')
  const selectedId = params.get('conversa')

  const inboxRef = useRef({ clientes: clientes.items, conversas: conversas.items, mensagens: mensagens.items, conversaAbertaId: '' })
  inboxRef.current = { ...inboxRef.current, clientes: clientes.items, conversas: conversas.items, mensagens: mensagens.items }

  useEffect(() => {
    const eid = usuario?.empresaId
    if (!eid) return
    void drainErpInbound(eid).catch(() => {})
    void drainErpToCrmEvents(eid).catch(() => {})
    let ativo = true
    let ocupado = false
    const puxar = async () => {
      if (!ativo || ocupado) return
      ocupado = true
      try {
        const agora = inboxRef.current
        await drainNxErpHttpInbox(eid, {
          clientes: agora.clientes,
          conversas: agora.conversas,
          mensagens: agora.mensagens,
          conversaAbertaId: agora.conversaAbertaId,
        })
      } finally {
        ocupado = false
      }
    }
    void puxar()
    const timer = window.setInterval(() => { void puxar() }, 1200)
    return () => {
      ativo = false
      window.clearInterval(timer)
    }
  }, [usuario?.empresaId])

  const externas = useMemo(() => conversas.items.filter((c) => c.canal !== 'interno'), [conversas.items])

  const contagem = useMemo(() => {
    const map = { conversas: 0, finalizados: 0 }
    for (const c of externas) {
      if (conversaFinalizada(c)) map.finalizados += 1
      else map.conversas += 1
    }
    return map
  }, [externas])

  const ultimaMensagem = useMemo(() => {
    const map = new Map<string, { texto: string; em: number }>()
    for (const m of mensagens.items) {
      const id = String(m.conversaId || '')
      if (!id) continue
      const em = instanteChat(m.criadoEm)
      const prev = map.get(id)
      if (!prev || em >= prev.em) map.set(id, { texto: String(m.texto || m.tipo || ''), em })
    }
    return map
  }, [mensagens.items])

  const lista = useMemo(() => {
    const q = busca.toLowerCase()
    const filtradas = externas
      .filter((c) => {
        const cli = clientes.items.find((x) => x.id === c.clienteId)
        const aberta = c.id === (params.get('conversa') || '')
        const finalizada = conversaFinalizada(c)
        if (!aberta && filtro === 'conversas' && finalizada) return false
        if (!aberta && filtro === 'finalizados' && !finalizada) return false
        if (q) {
          const blob = `${c.titulo} ${c.lastMessage} ${c.assignedTo}`.toLowerCase()
          const extra = `${cli?.nome} ${cli?.telefone} ${cli?.whatsapp}`.toLowerCase()
          if (!blob.includes(q) && !extra.includes(q)) return false
        }
        return true
      })
    return ordenarConversas(filtradas, (id) => ultimaMensagem.get(id)?.em || 0)
  }, [externas, filtro, busca, clientes.items, ultimaMensagem, params])

  const selected = conversas.items.find((c) => c.id === selectedId)
  inboxRef.current.conversaAbertaId = selectedId || ''
  const cliente = clientes.items.find((c) => c.id === selected?.clienteId || c.id === clientePref)
  const nascimentoCliente = (() => {
    const direto = lerNascimento(cliente)
    if (direto || !cliente) return direto
    const cpf = String(cliente.cpf || '').replace(/\D/g, '')
    const hit = [...digitacoes.items, ...propostas.items, ...contratos.items].find((r) => {
      const mesmoId = String(r.clienteId || '') === cliente.id
      const mesmoCpf = cpf.length === 11 && String(r.cpf || '').replace(/\D/g, '') === cpf
      return (mesmoId || mesmoCpf) && lerNascimento(r)
    })
    return hit ? lerNascimento(hit) : ''
  })()
  const fonesCliente = [cliente?.whatsapp, cliente?.telefone, cliente?.telefoneNormalizado, selected?.telefone]
    .map((v) => chaveTelefoneBr(String(v || '')))
    .filter((k) => k.length >= 10)
  const conversasVisiveis = new Set<string>(selected?.id ? [selected.id] : [])
  if (fonesCliente.length) {
    for (const c of externas) {
      const cli = clientes.items.find((x) => x.id === c.clienteId)
      const chaves = [cli?.whatsapp, cli?.telefone, cli?.telefoneNormalizado, c.telefone].map((v) => chaveTelefoneBr(String(v || '')))
      if (chaves.some((k) => fonesCliente.includes(k))) conversasVisiveis.add(c.id)
    }
  }
  const msgs = mensagens.items
    .filter((m) => conversasVisiveis.has(String(m.conversaId || '')))
    .sort((a, b) => instanteChat(a.criadoEm) - instanteChat(b.criadoEm))
  const leticiaToken = useRef(new Set<string>())
  const menuEnviado = useRef(new Set<string>())

  useEffect(() => {
    if (!selected?.id || leticiaTravada(selected)) return
    const last = msgs[msgs.length - 1]
    if (!last?.id || last.wamid || last.autorId === 'leticia' || last.autorId === 'sistema' || last.clientMessageId || last.autorId === usuario?.id) return
    const idade = Date.now() - instanteChat(last.criadoEm)
    if (idade <= 0 || idade > 2 * 60 * 60 * 1000) return
    const chave = String(last.id)
    if (leticiaToken.current.has(chave)) return
    const stepSalvo = stepDoBot(selected.botState, String(selected.leticiaStep || ''), String(selected.etapa || ''))
    const step = stepSalvo === 'human' ? 'menu' : stepSalvo
    const welcomed = selected.botWelcomeSent === true || Boolean(selected.welcomeSentAt)
    const turn = leticiaReply({
      paused: false,
      welcomed: step === 'menu' ? welcomed : true,
      step,
      flow: String(selected.botState?.flow || ''),
      text: String(last.texto || ''),
      opcaoId: String(last.opcaoId || ''),
    })
    if (!turn.reply) return
    leticiaToken.current.add(chave)
    const campos = camposConversa(turn, turn.step, turn.pause)
    void mensagens.create({
      conversaId: selected.id,
      clienteId: selected.clienteId,
      autorNome: 'Letícia',
      autorId: 'leticia',
      texto: turn.reply,
      ...(turn.opcoes?.length ? { opcoes: turn.opcoes, listaBotao: LETICIA_MENU_TITULO } : {}),
      tipo: turn.opcoes?.length ? 'interativa' : 'texto',
      status: 'sent',
      direction: 'OUTBOUND',
      source: 'LETICIA_LOCAL',
      processedInboundId: chave,
    } as any).then(() => conversas.update(selected.id, {
      lastMessage: String(turn.reply).slice(0, 240),
      roboPausado: turn.pause,
      robotPaused: turn.pause,
      robotState: turn.pause ? 'HUMAN_ACTIVE' : 'BOT_ACTIVE',
      botAtivo: !turn.pause,
      atendimentoHumano: turn.pause,
      leticiaStep: campos.leticiaStep,
      etapa: campos.etapa,
      botWelcomeSent: true,
      welcomeSentAt: new Date().toISOString(),
      botState: campos.botState,
      ...(campos.modalidadeSelecionada ? { modalidadeSelecionada: campos.modalidadeSelecionada } : {}),
    } as any))
  }, [selected, msgs, mensagens, conversas])

  useEffect(() => {
    if (!selected?.id || !usuario?.empresaId || leticiaTravada(selected)) return
    const menu = [...msgs].reverse().find((m) => m.autorId === 'leticia' && Array.isArray(m.opcoes) && m.opcoes.length > 0 && !m.wamid)
    if (!menu?.id || menuEnviado.current.has(String(menu.id))) return
    const tel = String(cliente?.whatsapp || cliente?.telefone || '')
    if (phoneError(tel)) return
    menuEnviado.current.add(String(menu.id))
    const empresaId = usuario.empresaId
    void sendReplyViaNxErp({
      empresaId,
      telefone: tel,
      mensagem: String(menu.texto || ''),
      conversaId: selected.id,
      clienteId: String(cliente?.id || selected.clienteId || ''),
      crmMensagemId: String(menu.id),
      operador: 'Letícia',
      lista: menu.opcoes,
      listaBotao: LETICIA_MENU_BOTAO,
      listaTitulo: LETICIA_MENU_TITULO,
    }).then((sent) => {
      if (sent.ok && sent.wamid) {
        void mensagens.update(menu.id, { wamid: sent.wamid, messageId: sent.wamid, status: 'sent', erpStatus: 'sent' })
      }
    })
  }, [selected, msgs, cliente, usuario?.empresaId, mensagens])

  useEffect(() => {
    noFundoRef.current = true
    setLongeDoFim(false)
    setLimiteMsgs(50)
    const id = window.requestAnimationFrame(() => {
      const el = listaChatRef.current
      if (el) el.scrollTop = el.scrollHeight
    })
    return () => window.cancelAnimationFrame(id)
  }, [selectedId])

  useEffect(() => {
    const el = listaChatRef.current
    if (!el || !noFundoRef.current) return
    el.scrollTop = el.scrollHeight
  }, [msgs.length, selectedId])
  const docsCli = documentos.items.filter((d) => d.clienteId === cliente?.id || (selected && d.conversaId === selected.id))
  const pastaCliente = [
    ...pastaLocal.filter((d) => d.clienteId === cliente?.id),
    ...docsCli.map((d) => ({ id: d.id, clienteId: String(d.clienteId || ''), nome: String(d.nome || d.categoria || 'Arquivo'), url: String(d.arquivoUrl || ''), tipo: String(d.tipoArquivo || '') })),
  ].filter((d, i, arr) => arr.findIndex((x) => x.id === d.id || (x.nome === d.nome && x.url && x.url === d.url)) === i)
  const propsCli = propostas.items.filter((p) => p.clienteId === cliente?.id)
  const contrCli = contratos.items.filter((p) => p.clienteId === cliente?.id)

  async function salvarNascimento(valor: string) {
    if (!cliente?.id) return
    const atual = nascimentoParaInput(nascimentoCliente)
    if (valor === atual) return
    await clientes.update(cliente.id, { dataNascimento: valor })
    toast.success('Data de nascimento salva.')
  }

  function fecharConversa() {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop()
    const next = new URLSearchParams(params)
    next.delete('conversa')
    setParams(next, { replace: true })
    setPainel('lista')
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      if (menuMsg) {
        setMenuMsg(null)
        return
      }
      if (editando) {
        setEditando(null)
        return
      }
      if (respondendo) {
        setRespondendo(null)
        return
      }
      if (emojis) {
        setEmojis(false)
        return
      }
      if (menuAnexo) {
        setMenuAnexo(false)
        return
      }
      if (gravando && recorderRef.current && recorderRef.current.state !== 'inactive') {
        enviarAoPararRef.current = false
        cancelarGravacaoRef.current = true
        recorderRef.current.stop()
        return
      }
      if (audioPreview) {
        URL.revokeObjectURL(audioPreview.url)
        setAudioPreview(null)
        return
      }
      if (midia) {
        URL.revokeObjectURL(midia.url)
        setMidia(null)
        return
      }
      if (selectedId) fecharConversa()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedId, params, emojis, menuAnexo, gravando, audioPreview, midia, menuMsg, editando, respondendo])

  async function adicionarCliente() {
    const nome = manual.nome.trim()
    const cpf = digits(manual.cpf)
    const telefone = digits(manual.telefone)
    if (!nome) {
      toast.error('Informe o nome completo')
      return
    }
    if (cpf && cpf.length !== 11) {
      toast.error('CPF incompleto')
      return
    }
    const invalido = phoneError(telefone)
    if (invalido) {
      toast.error(invalido === 'Telefone ausente' ? 'Informe o telefone do WhatsApp' : invalido)
      return
    }
    const id = await clientes.create({
      nome,
      cpf,
      telefone,
      whatsapp: telefone,
      status: 'novo',
      origem: 'manual',
      origemLead: 'manual',
    } as any)
    const cid = await conversas.create({
      clienteId: id,
      canal: 'whatsapp',
      channel: 'WHATSAPP',
      titulo: nome,
      status: 'em_atendimento',
      origemLead: 'manual',
      assignedTo: usuario?.nome,
      assignedToId: usuario?.id,
    } as any)
    setManual({ nome: '', cpf: '', telefone: '' })
    setNovoCli(false)
    abrirConversa(cid, id)
    toast.success('Cliente na fila')
  }

  function abrirConversa(id: string, clienteId: string) {
    setPainel('chat')
    const next = new URLSearchParams(params)
    next.set('conversa', id)
    if (clienteId) next.set('cliente', clienteId)
    setParams(next, { replace: true })
    if (id) void conversas.update(id, { naoLidas: 0, unreadCount: 0 })
  }

  function marcarNaoLida(id: string, naoLida: boolean) {
    void conversas.update(id, naoLida
      ? { naoLidas: 1, unreadCount: 1 }
      : { naoLidas: 0, unreadCount: 0 })
  }

  function alternarConversa(id: string, ligada: boolean) {
    setMarcadas((atual) => ligada ? [...new Set([...atual, id])] : atual.filter((item) => item !== id))
  }

  function alternarTodas(ligadas: boolean) {
    const ids = externas.filter((c) => conversaFinalizada(c)).map((c) => c.id)
    setMarcadas(ligadas ? ids : [])
  }

  async function excluirMarcadas() {
    const ids = marcadas.filter((id) => externas.some((c) => c.id === id && conversaFinalizada(c)))
    if (!ids.length || excluindo) return
    const n = ids.length
    if (!window.confirm(`Excluir ${n} conversa${n > 1 ? 's' : ''}? O histórico some daqui. O cliente continua cadastrado.`)) return
    setExcluindo(true)
    try {
      const escolhidas = new Set(ids)
      const msgs = mensagens.items.filter((m) => escolhidas.has(String(m.conversaId || '')))
      for (const m of msgs) await mensagens.remove(m.id)
      for (const id of ids) await conversas.remove(id)
      if (selectedId && escolhidas.has(selectedId)) {
        const next = new URLSearchParams(params)
        next.delete('conversa')
        setParams(next, { replace: true })
      }
      setMarcadas([])
      await writeAudit({
        empresaId: conversas.empresaId,
        usuarioId: usuario?.id,
        usuarioNome: usuario?.nome,
        modulo: 'Chat Clientes',
        submodulo: 'Atendimento',
        acao: 'excluir',
        descricao: `Excluiu ${n} conversa${n > 1 ? 's' : ''}`,
        origem: 'FUNCIONÁRIO',
        entidade: 'conversa',
        entidadeId: ids[0],
      })
      toast.success(n > 1 ? `${n} conversas excluídas` : 'Conversa excluída')
    } catch (e) {
      toast.error('Não foi possível excluir', e instanceof Error ? e.message : '')
    } finally {
      setExcluindo(false)
    }
  }

  async function ensureConversa() {
    if (selected?.id) return selected.id
    if (!clientePref && !cliente) {
      toast.error('Selecione um cliente para iniciar o atendimento')
      return null
    }
    const existente = conversas.items.find((c) => c.clienteId === (cliente?.id || clientePref) && c.canal !== 'interno')
    if (existente) {
      abrirConversa(existente.id, String(existente.clienteId || ''))
      return existente.id
    }
    const id = await conversas.create({
      clienteId: cliente?.id || clientePref,
      canal: 'whatsapp',
      channel: 'WHATSAPP',
      canalEntrada: 'whatsapp',
      status: 'em_atendimento',
      assignedTo: usuario?.nome,
      assignedToId: usuario?.id,
      lastAssignedTo: usuario?.nome,
      titulo: cliente?.nome || 'Conversa',
      origemLead: origemPrincipalDe(cliente),
      campanhaNome: cliente?.campanhaNome || cliente?.campanha,
      modalidade: modalidade || cliente?.modalidade || '',
      naoLidas: 0,
    } as any)
    if (cliente?.id && !cliente.origemLead && !cliente.origem) {
      await clientes.update(cliente.id, { canalEntrada: 'whatsapp', origemLead: 'whatsapp', origem: 'whatsapp', source: 'whatsapp' } as any)
    } else if (cliente?.id) {
      await clientes.update(cliente.id, { canalEntrada: 'whatsapp' } as any)
    }
    abrirConversa(id, String(cliente?.id || clientePref || ''))
    return id
  }

  async function entregarTexto(cid: string, textoEnvio: string, clientMessageId: string, mensagemId?: string, replyToWamid?: string) {
    const tel = String(cliente?.whatsapp || cliente?.telefone || '')
    const invalido = phoneError(tel)
    if (invalido) {
      const aviso = motivoEnvioWhatsapp(invalido)
      if (mensagemId) await mensagens.update(mensagemId, { status: 'failed', erroEnvio: aviso })
      toast.error(aviso)
      return
    }
    const erp = usuario?.empresaId ? await loadNxErpCrmConfig(usuario.empresaId) : null
    if (!(erp?.modo === 'real' && erp.ativo && erp.apiUrl && usuario?.empresaId)) {
      const aviso = motivoEnvioWhatsapp('NX ERP real não está ativo')
      if (mensagemId) await mensagens.update(mensagemId, { status: 'failed', erroEnvio: aviso })
      toast.error(aviso)
      return
    }
    if (mensagemId) await mensagens.update(mensagemId, { status: 'sending' })
    console.info(`[CRM OUTBOUND] crm_mensagem_id=${clientMessageId}`)
    const sent = await sendReplyViaNxErp({
      empresaId: usuario.empresaId,
      telefone: tel,
      mensagem: textoEnvio,
      conversaId: cid,
      clienteId: String(cliente?.id || ''),
      crmMensagemId: clientMessageId,
      operador: usuario?.nome || 'Atendente CRM',
      replyToWamid,
    })
    const confirmado = Boolean(sent.ok && sent.wamid)
    const aviso = motivoEnvioWhatsapp(sent.message || 'A Meta não confirmou o envio.')
    if (mensagemId) {
      await mensagens.update(mensagemId, confirmado
        ? { status: 'sent', erpStatus: 'sent', wamid: sent.wamid, messageId: sent.wamid, erroEnvio: '' }
        : { status: 'failed', erpStatus: 'failed', erroEnvio: aviso })
    }
    if (!confirmado) toast.error(aviso)
  }

  function lerBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const raw = String(reader.result || '')
        const corte = raw.indexOf(',')
        resolve(corte >= 0 ? raw.slice(corte + 1) : raw)
      }
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(file)
    })
  }

  async function enviarAudio(file: File) {
    if (envioEmCursoRef.current) return
    envioEmCursoRef.current = true
    let arquivo = file
    if (!file.type.includes('ogg')) {
      const ogg = await gravacaoParaOgg(file).catch(() => null)
      if (ogg && ogg !== file) arquivo = new File([ogg], `audio-${Date.now()}.ogg`, { type: 'audio/ogg' })
    }
    if (!arquivo || arquivo.size < 1) {
      envioEmCursoRef.current = false
      setEnviando(false)
      toast.error('Áudio vazio. Grave de novo e clique em Enviar.')
      return
    }
    if (arquivo.size > 8 * 1024 * 1024) {
      setEnviando(false)
      envioEmCursoRef.current = false
      toast.error('Áudio acima de 8 MB.')
      return
    }
    const cid = await ensureConversa()
    if (!cid) {
      setEnviando(false)
      envioEmCursoRef.current = false
      return
    }
    const tel = String(cliente?.whatsapp || cliente?.telefone || '')
    const invalido = phoneError(tel)
    if (invalido) {
      setEnviando(false)
      envioEmCursoRef.current = false
      toast.error(invalido)
      return
    }
    const clientMessageId = newClientMessageId()
    setEnviando(true)
    const localUrl = URL.createObjectURL(arquivo)
    const mensagemId = await mensagens.create({
      conversaId: cid,
      texto: 'Áudio',
      tipo: 'audio',
      interno: false,
      autorId: usuario?.id,
      autorNome: usuario?.nome,
      status: 'pending',
      clientMessageId,
      messageId: clientMessageId,
      channel: selected?.canal || 'whatsapp',
      arquivoUrl: localUrl,
    } as any)
    await conversas.update(cid, { lastMessage: 'Áudio', status: 'aguardando_cliente', lastAssignedTo: selected?.assignedTo })
    try {
      const audioBase64 = await lerBase64(arquivo)
      const erp = usuario?.empresaId ? await loadNxErpCrmConfig(usuario.empresaId) : null
      if (!(erp?.modo === 'real' && erp.ativo && erp.apiUrl && usuario?.empresaId)) {
        await mensagens.update(mensagemId, { status: 'failed', erroEnvio: 'NX ERP real não está ativo' })
        toast.error('Áudio ficou no Nexus. NX ERP real não está ativo — nada foi enviado ao WhatsApp.')
        return
      }
      await mensagens.update(mensagemId, { status: 'sending' })
      const sent = await sendReplyViaNxErp({
        empresaId: usuario.empresaId,
        telefone: tel,
        mensagem: 'Áudio',
        conversaId: cid,
        clienteId: String(cliente?.id || ''),
        crmMensagemId: clientMessageId,
        operador: usuario?.nome || 'Atendente CRM',
        audioBase64,
        audioMime: arquivo.type || 'audio/ogg',
      })
      await mensagens.update(mensagemId, sent.ok && sent.wamid
        ? { status: 'sent', erpStatus: 'sent', wamid: sent.wamid, messageId: sent.wamid, erroEnvio: '' }
        : { status: 'failed', erpStatus: 'failed', erroEnvio: sent.message || 'A Meta não confirmou o envio do áudio.' })
      if (!sent.ok) toast.error(sent.message || 'O NX ERP não enviou o áudio.')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Falha no envio do áudio'
      await mensagens.update(mensagemId, { status: 'failed', erroEnvio: msg })
      toast.error(msg)
    } finally {
      envioEmCursoRef.current = false
      setEnviando(false)
    }
  }

  async function enviarMidia(file: File, legenda = '') {
    if (envioEmCursoRef.current) return
    envioEmCursoRef.current = true
    if (!file || file.size < 1) {
      envioEmCursoRef.current = false
      toast.error('Arquivo vazio.')
      return
    }
    if (file.size > 8 * 1024 * 1024) {
      envioEmCursoRef.current = false
      toast.error('Arquivo acima de 8 MB.')
      return
    }
    const cid = await ensureConversa()
    if (!cid) {
      envioEmCursoRef.current = false
      return
    }
    const tel = String(cliente?.whatsapp || cliente?.telefone || '')
    const invalido = phoneError(tel)
    if (invalido) {
      envioEmCursoRef.current = false
      toast.error(invalido)
      return
    }
    const tipo = file.type.startsWith('image/')
      ? 'imagem'
      : file.type.startsWith('video/')
        ? 'video'
        : 'documento'
    const clientMessageId = newClientMessageId()
    setEnviando(true)
    const localUrl = URL.createObjectURL(file)
    const mensagemId = await mensagens.create({
      conversaId: cid,
      texto: legenda || file.name,
      tipo,
      interno: false,
      autorId: usuario?.id,
      autorNome: usuario?.nome,
      status: 'pending',
      clientMessageId,
      messageId: clientMessageId,
      channel: selected?.canal || 'whatsapp',
      arquivoUrl: localUrl,
    } as any)
    await conversas.update(cid, { lastMessage: legenda || file.name, status: 'aguardando_cliente', lastAssignedTo: selected?.assignedTo })
    try {
      const midiaBase64 = await lerBase64(file)
      const erp = usuario?.empresaId ? await loadNxErpCrmConfig(usuario.empresaId) : null
      if (!(erp?.modo === 'real' && erp.ativo && erp.apiUrl && usuario?.empresaId)) {
        await mensagens.update(mensagemId, { status: 'failed', erroEnvio: 'NX ERP real não está ativo' })
        toast.error('Arquivo ficou no Nexus. NX ERP real não está ativo — nada foi enviado ao WhatsApp.')
        return
      }
      await mensagens.update(mensagemId, { status: 'sending' })
      const sent = await sendReplyViaNxErp({
        empresaId: usuario.empresaId,
        telefone: tel,
        mensagem: legenda || file.name,
        conversaId: cid,
        clienteId: String(cliente?.id || ''),
        crmMensagemId: clientMessageId,
        operador: usuario?.nome || 'Atendente CRM',
        midiaBase64,
        midiaMime: file.type || 'application/octet-stream',
        midiaNome: file.name,
        midiaLegenda: legenda,
      })
      await mensagens.update(mensagemId, sent.ok && sent.wamid
        ? { status: 'sent', erpStatus: 'sent', wamid: sent.wamid, messageId: sent.wamid, erroEnvio: '' }
        : { status: 'failed', erpStatus: 'failed', erroEnvio: sent.message || 'A Meta não confirmou o envio do arquivo.' })
      if (!sent.ok) toast.error(sent.message || 'O NX ERP não enviou o arquivo.')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Falha no envio do arquivo'
      await mensagens.update(mensagemId, { status: 'failed', erroEnvio: msg })
      toast.error(msg)
    } finally {
      envioEmCursoRef.current = false
      setEnviando(false)
    }
  }

  async function send() {
    if (enviando) return
    if (gravando && recorderRef.current && recorderRef.current.state !== 'inactive') {
      if (enviarAoPararRef.current) return
      setEnviando(true)
      enviarAoPararRef.current = true
      recorderRef.current.stop()
      return
    }
    if (audioPreview) {
      const file = audioPreview.file
      URL.revokeObjectURL(audioPreview.url)
      setAudioPreview(null)
      void enviarAudio(file)
      return
    }
    if (midia) {
      const atual = midia
      URL.revokeObjectURL(atual.url)
      setMidia(null)
      void enviarMidia(atual.file, atual.legenda)
      return
    }
    const textoEnvio = texto.trim()
    if (!textoEnvio || envioTickRef.current) return
    envioTickRef.current = true
    const cid = await ensureConversa()
    if (!cid) {
      envioTickRef.current = false
      return
    }
    const invalido = phoneError(String(cliente?.whatsapp || cliente?.telefone || ''))
    if (invalido) {
      envioTickRef.current = false
      toast.error(motivoEnvioWhatsapp(invalido))
      return
    }
    const clientMessageId = newClientMessageId()
    const resposta = respondendo
    setTexto('')
    setRespondendo(null)
    setEnviando(true)
    try {
      const mensagemId = await mensagens.create({
        conversaId: cid,
        texto: textoEnvio,
        tipo: 'texto',
        interno: false,
        autorId: usuario?.id,
        autorNome: usuario?.nome,
        status: 'sending',
        clientMessageId,
        messageId: clientMessageId,
        channel: selected?.canal || 'whatsapp',
        replyToMessageId: resposta?.id || null,
        replyToTexto: resposta?.texto || null,
      } as any)
      await conversas.update(cid, { lastMessage: textoEnvio, status: 'aguardando_cliente', lastAssignedTo: selected?.assignedTo })
      await entregarTexto(cid, textoEnvio, clientMessageId, mensagemId, resposta?.wamid)
    } catch (e) {
      setTexto(textoEnvio)
      toast.error(motivoEnvioWhatsapp(e instanceof Error ? e.message : ''))
    } finally {
      envioTickRef.current = false
      setEnviando(false)
    }
  }

  async function reenviar(m: { id: string; texto?: string; clientMessageId?: string; conversaId?: string }) {
    const cid = String(m.conversaId || selected?.id || '')
    const clientMessageId = String(m.clientMessageId || '')
    const textoEnvio = String(m.texto || '').trim()
    if (!cid || !clientMessageId || !textoEnvio) return
    void entregarTexto(cid, textoEnvio, clientMessageId, m.id)
  }

  async function attach(file: File) {
    const cid = await ensureConversa()
    if (!cid || !cliente) return
    const allowed = /^(image\/(jpeg|jpg|png|webp)|application\/pdf|audio\/(webm|ogg|mpeg|mp4|wav)|video\/(mp4|webm|quicktime))$/i.test(file.type) || /\.(pdf|jpe?g|png|webp|webm|ogg|mp3|m4a|wav|mp4|mov|docx?|xlsx?|csv|txt)$/i.test(file.name)
    if (!allowed) {
      toast.error('Use imagem JPG, PNG, WEBP, PDF, DOC, XLS, CSV ou áudio.')
      return
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error('Arquivo acima de 8 MB.')
      return
    }
    const empresaId = documentos.empresaId
    if (!empresaId) {
      toast.error('Empresa não identificada para salvar o arquivo.')
      return
    }
    const safe = file.name.replace(/[^\w.\-]+/g, '_')
    const path = `empresas/${empresaId}/clientes/${cliente.id}/documentos/${Date.now()}_${safe}`
    let arquivoUrl = ''
    try {
      const stored = ref(storage, path)
      await uploadBytes(stored, file)
      arquivoUrl = await getDownloadURL(stored)
    } catch (e) {
      toast.error('Storage recusou o upload. O metadado ainda pode ser registrado.', e instanceof Error ? e.message : '')
    }
    const categoria = inferCategoriaDocumento(file.name, file.type)
    const docId = await documentos.create({
      clienteId: cliente.id,
      clienteNome: cliente.nome,
      conversaId: cid,
      nome: file.name,
      categoria,
      origem: 'chat_clientes',
      status: 'recebido',
      funcionario: usuario?.nome,
      tamanho: file.size,
      tipoArquivo: file.type,
      arquivoUrl,
      storagePath: path,
    } as any)
    setPastaLocal((cur) => [
      { id: docId || `local-${Date.now()}`, clienteId: cliente.id, nome: file.name, url: arquivoUrl || URL.createObjectURL(file), tipo: file.type },
      ...cur,
    ])
    const tipo = file.type.startsWith('image/')
      ? 'imagem'
      : file.type.startsWith('audio/') || /^audio-/i.test(file.name) || /\.(ogg|mp3|m4a|wav)$/i.test(file.name)
        ? 'audio'
        : file.type.startsWith('video/') || /\.(mp4|mov)$/i.test(file.name)
          ? 'video'
          : 'documento'
    await mensagens.create({
      conversaId: cid,
      texto: file.name,
      tipo,
      autorNome: usuario?.nome || 'Atendente',
      origem: 'chat_clientes',
      status: 'recebida',
      arquivoUrl,
    } as any)
    await conversas.update(cid, { lastMessage: tipo === 'audio' ? 'Áudio' : `📎 ${file.name}`, status: 'aguardando_cliente' })
    await writeAudit({
      empresaId,
      usuarioNome: usuario?.nome,
      modulo: 'documentos',
      acao: 'document.received',
      entidadeId: cliente.id,
      depois: { conversaId: cid, categoria, nome: file.name },
    })
    toast.success(tipo === 'audio' ? 'Áudio gravado na conversa para o cliente.' : 'Arquivo salvo na conversa.')
  }

  async function gravarAudio() {
    if (gravando && recorderRef.current) {
      recorderRef.current.stop()
      return
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error('Este navegador não libera o microfone.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const preferido = ['audio/ogg;codecs=opus', 'audio/webm;codecs=opus', 'audio/webm'].find((t) => MediaRecorder.isTypeSupported(t)) || ''
      const rec = preferido ? new MediaRecorder(stream, { mimeType: preferido }) : new MediaRecorder(stream)
      const mime = (rec.mimeType || preferido || 'audio/webm').split(';')[0]
      const chunks: Blob[] = []
      rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data) }
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        setGravando(false)
        setGravandoSeg(0)
        const blob = new Blob(chunks, { type: mime })
        const ext = mime.includes('ogg') ? 'ogg' : 'webm'
        const file = new File([blob], `audio-${Date.now()}.${ext}`, { type: mime })
        const deveEnviar = enviarAoPararRef.current
        const cancelar = cancelarGravacaoRef.current
        enviarAoPararRef.current = false
        cancelarGravacaoRef.current = false
        pausadoRef.current = false
        setAudioPausado(false)
        if (cancelar) return
        if (deveEnviar) {
          void enviarAudio(file)
          return
        }
        setAudioPreview({ url: URL.createObjectURL(blob), file })
      }
      recorderRef.current = rec
      rec.start()
      setGravando(true)
      setGravandoSeg(0)
      const timer = window.setInterval(() => {
        if (!pausadoRef.current) setGravandoSeg((n) => n + 1)
      }, 1000)
      rec.addEventListener('stop', () => window.clearInterval(timer), { once: true })
    } catch {
      toast.error('Permita o microfone para enviar áudio ao cliente.')
    }
  }

  async function transferir(paraId: string) {
    if (!selected || !paraId) return
    const u = usuariosEmpresa.items.find((x) => x.id === paraId)
    if (!u) return
    await conversas.update(selected.id, {
      lastAssignedTo: selected.assignedTo,
      assignedTo: u.nome,
      assignedToId: u.id,
      status: 'transferido',
      statusAtendimento: 'TRANSFERIDO',
      roboPausado: true,
      robotPaused: true,
      robotState: 'HUMAN_ACTIVE',
      leticiaStep: 'human',
      etapa: 'HUMANO',
      botAtivo: false,
      atendimentoHumano: true,
      botState: { active: false, flow: 'human', step: 'human_handoff' },
      transferidoPor: usuario?.nome,
      transferidoPorId: usuario?.id,
      transferidoEm: new Date().toISOString(),
    })
    await writeAudit({
      empresaId: conversas.empresaId,
      usuarioId: usuario?.id,
      usuarioNome: usuario?.nome,
      modulo: 'atendimento',
      acao: 'assignment.transferred',
      entidade: 'conversa',
      entidadeId: selected.id,
      depois: { de: selected.assignedTo, para: u.nome },
    })
    toast.success(`Atendimento transferido para ${String(u.nome)}`)
  }

  async function mudarStatus(status: string) {
    if (!selected) return
    await conversas.update(selected.id, { status })
    if (status === 'remarketing' && cliente) {
      await clientes.update(cliente.id, {
        remarketingStatus: 'novo',
        pipelineStage: 'remarketing',
        proximaAcao: 'Fila de remarketing',
      } as never)
      toast.success('Cliente entrou no remarketing')
    }
  }

  async function assumir() {
    if (!selected) return
    await conversas.update(selected.id, {
      assignedTo: usuario?.nome,
      assignedToId: usuario?.id,
      lastAssignedTo: selected.assignedTo,
      status: 'em_atendimento',
      statusAtendimento: 'HUMANO',
      roboPausado: true,
      robotPaused: true,
      robotState: 'HUMAN_ACTIVE',
      leticiaStep: 'human',
      etapa: 'HUMANO',
      botAtivo: false,
      atendimentoHumano: true,
      botState: { active: false, flow: 'human', step: 'human' },
      triagemStatus: 'humano',
    })
    await writeAudit({
      empresaId: conversas.empresaId,
      usuarioId: usuario?.id,
      usuarioNome: usuario?.nome,
      modulo: 'Chat Clientes',
      submodulo: 'Atendimento',
      acao: 'ATENDIMENTO_ASSUMIDO',
      descricao: 'Funcionário assumiu atendimento',
      origem: 'FUNCIONÁRIO',
      entidade: 'conversa',
      entidadeId: selected.id,
      clienteId: String(selected.clienteId || ''),
      clienteNome: String(cliente?.nome || selected.titulo || ''),
      cpfCliente: String(cliente?.cpf || ''),
      depois: { de: 'robo', para: usuario?.nome },
    })
    toast.success('Atendimento assumido. Robô pausado nesta conversa.')
  }

  async function finalizarAtendimento() {
    if (!selected) return
    const flow = String(selected.botState?.flow || 'main')
    await conversas.update(selected.id, {
      status: 'finalizado',
      statusAtendimento: 'FINALIZADO',
      finalizadoEm: new Date().toISOString(),
      roboPausado: true,
      robotPaused: true,
      robotState: 'HUMAN_ACTIVE',
      leticiaStep: 'human',
      etapa: 'HUMANO',
      botAtivo: false,
      atendimentoHumano: true,
      botState: { active: false, flow, step: 'human_handoff' },
    })
    toast.success('Atendimento finalizado. O histórico permanece nesta conversa.')
  }

  async function transferirLaiane() {
    if (!selected) return
    await conversas.update(selected.id, {
      assignedTo: 'Laiane',
      status: 'transferido',
      statusAtendimento: 'TRANSFERIDO',
      roboPausado: true,
      robotPaused: true,
      robotState: 'HUMAN_ACTIVE',
      leticiaStep: 'human',
      etapa: 'HUMANO',
      botAtivo: false,
      atendimentoHumano: true,
      botState: { active: false, flow: String(selected.botState?.flow || 'human'), step: 'human_handoff' },
      transferidoEm: new Date().toISOString(),
      transferidoPor: usuario?.nome,
    })
    await mensagens.create({
      conversaId: selected.id,
      texto: 'Atendimento transferido para Laiane.',
      tipo: 'texto',
      autorNome: 'Sistema',
      autorId: 'sistema',
      status: 'local',
    } as any)
    toast.success('Atendimento transferido para Laiane.')
  }

  const timeline = useMemo(() => {
    if (!cliente) return []
    const ev: { t: unknown; label: string }[] = []
    if (cliente.criadoEm) ev.push({ t: cliente.criadoEm, label: 'Cliente criado' })
    for (const h of cliente.historicoOrigens || []) {
      ev.push({ t: h.em, label: `Origem ${origemTexto(String(h.origem))} · ${String(h.campanha || h.fonte || '')}` })
    }
    if (selected?.criadoEm) ev.push({ t: selected.criadoEm, label: 'Conversa criada' })
    if (selected?.transferidoEm) ev.push({ t: selected.transferidoEm, label: `Transferido para ${String(selected.assignedTo || '')}` })
    for (const m of msgs.slice(0, 30)) ev.push({ t: m.criadoEm, label: `${m.interno ? 'Nota' : 'Msg'} · ${String(m.texto || '').slice(0, 40)}` })
    for (const d of docsCli) ev.push({ t: d.criadoEm, label: `Documento · ${String(d.nome || d.categoria)}` })
    for (const p of propsCli) ev.push({ t: p.criadoEm, label: `Proposta · ${String(p.produto || '')}` })
    for (const p of contrCli) ev.push({ t: p.criadoEm, label: `Contrato · ${String(p.numero || p.produto || '')}` })
    return ev.filter((x) => x.t).sort((a, b) => String(a.t).localeCompare(String(b.t)))
  }, [cliente, selected, msgs, docsCli, propsCli, contrCli])

  if (conversas.loading) return <LoadingBlock />

  const listaCol = (
    <div className="flex flex-col h-full min-h-0 border-r" style={{ borderColor: 'var(--code-border)', background: 'var(--code-surface)' }}>
      <div className="p-2 border-b space-y-2" style={{ borderColor: 'var(--code-border)' }}>
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-sm font-bold">Chat Clientes</h1>
          <button type="button" aria-label="Novo contato" title="Novo contato" className="h-7 w-7 rounded-full text-lg leading-none font-bold" style={{ background: 'var(--code-orange)', color: '#111' }} onClick={() => setNovoCli(true)}>+</button>
        </div>
        <TextInput placeholder="Buscar cliente ou telefone" value={busca} onChange={(e) => setBusca(e.target.value)} />
        <div className="flex flex-wrap gap-1">
          {VISTA.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFiltro(f.id)}
              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${filtro === f.id ? 'nexus-cta text-white' : ''}`}
              style={filtro === f.id ? undefined : { background: 'var(--code-surface-muted)' }}
            >
              {f.label} {contagem[f.id as keyof typeof contagem] ? contagem[f.id as keyof typeof contagem] : ''}
            </button>
          ))}
        </div>
        {filtro === 'finalizados' && (
          <>
            <p className="text-[10px] leading-snug" style={{ color: 'var(--code-muted)' }}>Histórico encerrado. A hora é a da última mensagem.</p>
            <div className="flex items-center justify-between gap-2">
              <label className="text-[11px] flex items-center gap-1 font-semibold" style={{ color: 'var(--code-muted)' }}>
                <input
                  type="checkbox"
                  checked={externas.some((c) => conversaFinalizada(c)) && externas.filter((c) => conversaFinalizada(c)).every((c) => marcadas.includes(c.id))}
                  onChange={(e) => alternarTodas(e.target.checked)}
                  aria-label="Marcar todas as conversas finalizadas"
                />
                Todas
              </label>
              <button type="button" disabled={!marcadas.length || excluindo} onClick={() => void excluirMarcadas()} className="text-[11px] font-semibold px-2 py-0.5 rounded-full disabled:opacity-40" style={{ background: 'var(--code-danger)', color: '#fff' }}>
                {excluindo ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </>
        )}
      </div>
      <div className="flex-1 overflow-y-auto">
        {lista.length === 0 && <div className="p-3"><EmptyState title={filtro === 'finalizados' ? 'Nenhum atendimento finalizado' : 'Nenhuma conversa'} description={filtro === 'finalizados' ? 'Quando você finalizar, o cliente aparece aqui.' : 'Os clientes que falam com você ficam nesta lista.'} /></div>}
        {lista.map((c) => {
          const cli = clientes.items.find((x) => x.id === c.clienteId)
          const unread = naoLidasDe(c)
          const preview = String(c.lastMessage || ultimaMensagem.get(c.id)?.texto || 'Sem mensagens')
          const fone = displayPhone(String(cli?.whatsapp || cli?.telefone || ''))
          const nome = String(c.titulo || cli?.nome || fone || 'Conversa')
          const quandoLista = Math.max(instanteChat(c.finalizadoEm), instanteChat(c.atualizadoEm), instanteChat(c.criadoEm), ultimaMensagem.get(c.id)?.em || 0)
          const hora = formatMessageClock(quandoLista ? new Date(quandoLista) : null)
          const fechada = filtro === 'finalizados'
          return (
            <div
              key={c.id}
              role="button"
              tabIndex={0}
              onClick={() => abrirConversa(c.id, String(c.clienteId || ''))}
              onKeyDown={(e) => { if (e.key === 'Enter') abrirConversa(c.id, String(c.clienteId || '')) }}
              className="w-full text-left px-3 py-2.5 border-b cursor-pointer"
              style={{
                borderColor: 'var(--code-border)',
                background: selected?.id === c.id ? 'var(--code-surface-muted)' : 'transparent',
              }}
            >
              <div className="flex items-start gap-2">
                {fechada && (
                  <label className="mt-1 shrink-0" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={marcadas.includes(c.id)} aria-label={`Marcar ${nome}`} onChange={(e) => alternarConversa(c.id, e.target.checked)} />
                  </label>
                )}
                {fechada && (
                  <span className="mt-0.5 h-8 w-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold" style={{ background: 'var(--code-surface-muted)', color: 'var(--code-text)' }} aria-hidden>
                    {nome.trim().slice(0, 1).toUpperCase()}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between gap-2">
                    <p className="text-sm font-semibold truncate">{nome}</p>
                    <span className="text-[10px] shrink-0" style={{ color: 'var(--code-muted)' }}>{hora}</span>
                  </div>
                  {fone && <p className="text-[11px] truncate" style={{ color: 'var(--code-muted)' }}>{fone}</p>}
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-[11px] truncate flex-1" style={{ color: 'var(--code-muted)' }}>{preview}</p>
                    {fechada && <span className="chat-finalizado shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-semibold">Finalizado</span>}
                    {unread > 0 && <span className="shrink-0 text-[10px] px-1.5 rounded-full text-white" style={{ background: 'var(--code-orange)' }}>{unread}</span>}
                  </div>
                  {!fechada && (
                    <label className="text-[10px] mt-1 flex items-center gap-1" style={{ color: 'var(--code-muted)' }} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={unread > 0} onChange={(e) => marcarNaoLida(c.id, e.target.checked)} />
                      Não lida
                    </label>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )

  const chatCol = (
    <div className="flex flex-col h-full min-h-0" style={{ background: 'var(--code-bg)' }}>
      {selected ? (
        <>
          <div className="px-3 py-2 border-b shrink-0" style={{ borderColor: 'var(--code-border)', background: 'var(--code-surface)' }}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[10px] font-semibold" style={{ color: 'var(--code-orange)' }}>Letícia · uma pergunta por vez</p>
                <div className="flex items-center gap-2">
                  <button type="button" className="lg:hidden text-xs font-semibold" onClick={() => setPainel('lista')}>← Fila</button>
                  <p className="font-bold text-sm">{textoMisto(String(cliente?.nome || selected.titulo || ''))}</p>
                </div>
                <p className="text-[11px]" style={{ color: 'var(--code-muted)' }}>{displayCpfSidebar(cliente?.cpf) ? `CPF ${displayCpfSidebar(cliente?.cpf)}` : 'CPF —'} · {displayPhone(String(cliente?.whatsapp || cliente?.telefone || '')) || 'Telefone —'}</p>
                <label className="text-[11px] mt-1 flex items-center gap-1" style={{ color: 'var(--code-muted)' }}>
                  Nascimento
                  <input
                    type="date"
                    className="nexus-input text-[11px] h-7"
                    aria-label="Data de nascimento"
                    value={nascimentoParaInput(nascimentoCliente)}
                    onChange={(e) => void salvarNascimento(e.target.value)}
                  />
                </label>
                <label className="text-[11px] mt-1 flex items-center gap-1" style={{ color: 'var(--code-muted)' }}>
                  <input type="checkbox" checked={naoLidasDe(selected) > 0} onChange={(e) => marcarNaoLida(selected.id, e.target.checked)} />
                  Não lida
                </label>
                {(cliente?.produto || cliente?.modalidade || selected.produto) && (
                  <p className="text-[11px] font-semibold" style={{ color: 'var(--code-orange)' }}>
                    {produtoLabel(String(cliente?.produto || cliente?.modalidade || selected.produto || selected.operacao || ''))}
                  </p>
                )}
                {(cliente?.campanhaNome || cliente?.campanha) && <p className="text-[11px]">{String(cliente.campanhaNome || cliente.campanha)}</p>}
              </div>
              <div className="flex flex-wrap gap-1 justify-end">
                <GhostButton className="text-xs" onClick={() => void assumir()}>Assumir</GhostButton>
                <GhostButton className="text-xs" onClick={() => void finalizarAtendimento()}>Finalizar atendimento</GhostButton>
                <GhostButton className="text-xs" onClick={() => void transferirLaiane()}>Transferir para Laiane</GhostButton>
                <GhostButton className="text-xs" aria-label="Fechar" data-nexus-esc onClick={fecharConversa}>X</GhostButton>
                <GhostButton className="text-xs lg:hidden" onClick={() => setPainel('ficha')}>Cliente</GhostButton>
                <SelectInput value={String(selected.status || '')} onChange={(e) => void mudarStatus(e.target.value)}>
                  <option value="aguardando_triagem">Nova conversa</option>
                  <option value="aguardando_atendimento">Aguardando atendimento</option>
                  <option value="aguardando_cliente">Aguardando cliente</option>
                  <option value="em_atendimento">Em atendimento</option>
                  <option value="transferido">Transferido</option>
                  <option value="finalizado">Finalizado</option>
                  <option value="documentacao">Documentação</option>
                  <option value="proposta">Proposta</option>
                  <option value="contrato">Contrato</option>
                  <option value="remarketing">Remarketing</option>
                </SelectInput>
              </div>
            </div>
            <div className="mt-2">
              <SelectInput value="" onChange={(e) => {
                const valor = e.target.value
                if (valor === 'laiane') void transferirLaiane()
                else void transferir(valor)
              }}>
                <option value="">Transferir para funcionário</option>
                <option value="laiane">Laiane</option>
                {usuariosEmpresa.items.filter((u) => !/laiane/i.test(String(u.nome || ''))).map((u) => <option key={u.id} value={u.id}>{String(u.nome)}{u.cargo ? ` — ${String(u.cargo)}` : ''}</option>)}
              </SelectInput>
            </div>
          </div>
          <div className="relative flex-1 min-h-0">
          <div
            ref={listaChatRef}
            className="chat-wa-area h-full overflow-y-auto p-3 space-y-2"
            onScroll={(e) => {
              const el = e.currentTarget
              const noFim = el.scrollHeight - el.scrollTop - el.clientHeight < 80
              noFundoRef.current = noFim
              setLongeDoFim(!noFim)
            }}
          >
            {selected.roboPausado ? null : null}
            <div className="chat-wa">
            {msgs.length > limiteMsgs && (
              <button type="button" className="text-[11px] font-semibold" onClick={() => setLimiteMsgs((n) => n + 50)}>Carregar anteriores</button>
            )}
            {msgs.slice(-limiteMsgs).map((m, indice, listaVisivel) => {
              const mark = deliveryMark(String(m.erpStatus || m.status || ''))
              const minha = m.autorId === usuario?.id || Boolean(m.clientMessageId)
              const daLeticia = m.autorId === 'leticia'
              const enviadaAoCliente = Boolean(minha || daLeticia)
              const quando = asDate(m.criadoEm)
              const dia = rotuloDiaMensagem(quando)
              const diaAnterior = indice > 0 ? rotuloDiaMensagem(asDate(listaVisivel[indice - 1].criadoEm)) : ''
              const hora = horaMensagem(quando) || '—'
              const rotuloEntrega = enviadaAoCliente ? deliveryLabel(String(m.erpStatus || m.status || '')) : 'Recebida'
              return (
              <div key={m.id}>
                {dia && dia !== diaAnterior ? <p className="chat-dia">{dia}</p> : null}
              <div className={`bolha ${minha || daLeticia ? 'sai' : 'entra'}`}>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[10px]" style={{ color: 'var(--code-muted)' }}>{textoMisto(String(m.autorNome || ''))}</p>
                  <button type="button" className="text-xs" aria-label="Ações da mensagem" onClick={() => setMenuMsg(menuMsg === m.id ? null : m.id)}>⋮</button>
                </div>
                {menuMsg === m.id && (
                  <div className="text-[11px] flex flex-wrap gap-2 mb-1">
                    <button type="button" onClick={() => { setRespondendo({ id: m.id, texto: String(m.texto || '').slice(0, 140), wamid: String(m.wamid || '') }); setMenuMsg(null) }}>Responder</button>
                    <button type="button" onClick={() => { void navigator.clipboard.writeText(String(m.texto || '')).then(() => toast.success('Copiado.')); setMenuMsg(null) }}>Copiar</button>
                    <Link to={`/digitacao?nova=1&cliente=${cliente?.id || ''}&conversa=${selected?.id || ''}&nome=${encodeURIComponent(String(cliente?.nome || ''))}&telefone=${encodeURIComponent(String(cliente?.whatsapp || cliente?.telefone || ''))}&produto=${encodeURIComponent(String(cliente?.produto || cliente?.modalidade || ''))}&origem=whatsapp`} onClick={() => setMenuMsg(null)}>Criar proposta</Link>
                    <Link to={`/digitacao?digitacao=1&cliente=${cliente?.id || ''}&conversa=${selected?.id || ''}&nome=${encodeURIComponent(String(cliente?.nome || ''))}&telefone=${encodeURIComponent(String(cliente?.whatsapp || cliente?.telefone || ''))}&produto=${encodeURIComponent(String(cliente?.produto || cliente?.modalidade || ''))}&origem=whatsapp`} onClick={() => setMenuMsg(null)}>Criar digitação</Link>
                    <button type="button" onClick={() => {
                      if (m.wamid && mark !== 'failed') {
                        toast.error('O WhatsApp não permite alterar uma mensagem já enviada.')
                        setMenuMsg(null)
                        return
                      }
                      setEditando({ id: m.id, texto: String(m.texto || ''), clientMessageId: String(m.clientMessageId || ''), reenviar: mark === 'failed' && Boolean(m.clientMessageId) })
                      setMenuMsg(null)
                    }}>Editar</button>
                  </div>
                )}
                    {m.replyToTexto ? <p className="text-[10px] border-l-2 pl-1 mb-1">Respondendo a: {String(m.replyToTexto)}</p> : null}
                    {String(m.tipo) === 'imagem' && (m.arquivoUrl && !midiaFalhou[m.id] ? <img src={String(m.arquivoUrl)} alt="" className="max-h-40 rounded mt-1" onError={() => setMidiaFalhou((atual) => ({ ...atual, [m.id]: true }))} /> : <p>Imagem indisponível</p>)}
                    {String(m.tipo) === 'audio' && (m.arquivoUrl && !midiaFalhou[m.id] ? <audio controls src={String(m.arquivoUrl)} className="mt-1" onError={() => setMidiaFalhou((atual) => ({ ...atual, [m.id]: true }))} /> : <p>Áudio indisponível</p>)}
                    {String(m.tipo) === 'video' && (m.arquivoUrl && !midiaFalhou[m.id] ? <video controls src={String(m.arquivoUrl)} className="max-h-40 rounded mt-1" onError={() => setMidiaFalhou((atual) => ({ ...atual, [m.id]: true }))} /> : <p>Vídeo indisponível</p>)}
                    {String(m.tipo) === 'documento' && <p>📎 {String(m.texto)}</p>}
                    {!['imagem', 'documento', 'audio', 'video'].includes(String(m.tipo)) && <p>{String(m.texto || '')}</p>}
                    {Array.isArray(m.opcoes) && m.opcoes.length > 0 ? (
                      <details className="opcoes">
                        <summary>{String(m.listaBotao || LETICIA_MENU_TITULO)}</summary>
                        {m.opcoes.map((op: { id?: string; title?: string }) => (
                          <span key={String(op.id || op.title)}>{String(op.title || '')}</span>
                        ))}
                      </details>
                    ) : null}
                    {m.editedAt ? <p className="text-[10px]">editada no CRM</p> : null}
                <p className={`text-[10px] text-right${mark === 'failed' ? ' chat-falha' : ''}`} style={{ color: mark === 'read' ? '#53bdeb' : mark === 'failed' ? undefined : 'var(--code-muted)' }}>
                  {hora} · {enviadaAoCliente ? `${deliveryGlyph(String(m.erpStatus || m.status || ''))} ` : ''}{rotuloEntrega}
                </p>
                {mark === 'failed' && m.erroEnvio ? <p className="chat-falha text-[10px]">{String(m.erroEnvio)}</p> : null}
                {mark === 'failed' && m.clientMessageId && (
                  <button type="button" className="text-[10px] font-semibold" onClick={() => void reenviar(m as any)}>Tentar novamente</button>
                )}
              </div>
              </div>
              )
            })}
            {msgs.length === 0 && <p className="text-sm text-center" style={{ color: 'var(--code-muted)' }}>Nenhuma mensagem ainda.</p>}
            </div>
          </div>
            {longeDoFim ? (
              <button type="button" className="absolute bottom-3 right-3 text-[11px] font-semibold px-2 py-1 rounded shadow" style={{ background: 'var(--code-orange)', color: '#111' }} onClick={() => {
                const el = listaChatRef.current
                noFundoRef.current = true
                setLongeDoFim(false)
                if (el) el.scrollTop = el.scrollHeight
              }}>Novas mensagens</button>
            ) : null}
          </div>
          <div className="p-2 border-t shrink-0" style={{ borderColor: 'var(--code-border)', background: 'var(--code-surface)' }}>
            {emojis && <EmojiPicker onPick={(emoji) => setTexto((t) => `${t}${emoji}`)} onClose={() => setEmojis(false)} />}
            {respondendo && (
              <div className="mb-2 text-xs flex items-start justify-between gap-2">
                <p>Respondendo a: {respondendo.texto}</p>
                <button type="button" aria-label="Cancelar resposta" onClick={() => setRespondendo(null)}>X</button>
              </div>
            )}
            {editando && (
              <div className="mb-2 text-xs">
                <p className="mb-1">Editando mensagem...</p>
                <input className="nexus-input w-full text-xs mb-2" value={editando.texto} onChange={(e) => setEditando({ ...editando, texto: e.target.value })} />
                <div className="flex gap-2">
                  <button type="button" onClick={() => setEditando(null)}>Cancelar</button>
                  <button type="button" className="font-semibold" onClick={() => {
                    const atual = editando
                    setEditando(null)
                    void mensagens.update(atual.id, { texto: atual.texto, editedAt: new Date().toISOString() })
                    if (atual.reenviar && atual.clientMessageId && selected?.id) void entregarTexto(selected.id, atual.texto, atual.clientMessageId, atual.id)
                  }}>Salvar</button>
                </div>
              </div>
            )}
            {midia && (
              <div className="mb-2 rounded-lg p-2 text-xs" style={{ border: '1px solid var(--code-border)' }}>
                {midia.file.type.startsWith('image/') ? <img src={midia.url} alt="" className="max-h-32 rounded mb-2" /> : null}
                <p>{midia.file.name} · {(midia.file.size / 1024).toFixed(0)} KB · {midia.file.type || 'arquivo'}</p>
                <input className="nexus-input w-full text-xs mb-2" value={midia.legenda} onChange={(e) => setMidia({ ...midia, legenda: e.target.value })} placeholder="Legenda" />
                <div className="flex gap-2">
                  <button type="button" onClick={() => { URL.revokeObjectURL(midia.url); setMidia(null) }}>Cancelar</button>
                  <button type="button" className="font-semibold" onClick={() => { const atual = midia; URL.revokeObjectURL(atual.url); setMidia(null); void enviarMidia(atual.file, atual.legenda) }}>Enviar</button>
                </div>
                <p style={{ color: 'var(--code-muted)' }}>Enter envia. ESC cancela. O arquivo só sai neste clique.</p>
              </div>
            )}
            {audioPreview && (
              <div className="mb-2 rounded-lg p-2 text-xs" style={{ border: '1px solid var(--code-border)' }}>
                <audio controls src={audioPreview.url} />
                <div className="flex gap-2 mt-1">
                  <button type="button" onClick={() => { URL.revokeObjectURL(audioPreview.url); setAudioPreview(null) }}>Cancelar</button>
                  <button type="button" className="font-semibold" onClick={() => { const file = audioPreview.file; URL.revokeObjectURL(audioPreview.url); setAudioPreview(null); void enviarAudio(file) }}>Enviar</button>
                </div>
                <p style={{ color: 'var(--code-muted)' }}>Enter envia o áudio. ESC cancela.</p>
              </div>
            )}
            {gravando && (
              <p className="text-xs mb-1 flex items-center gap-2">
                Gravando {String(Math.floor(gravandoSeg / 60)).padStart(2, '0')}:{String(gravandoSeg % 60).padStart(2, '0')}
                <button type="button" className="font-semibold" onClick={() => {
                  const rec = recorderRef.current
                  if (!rec) return
                  if (rec.state === 'recording') {
                    rec.pause()
                    pausadoRef.current = true
                    setAudioPausado(true)
                  } else if (rec.state === 'paused') {
                    rec.resume()
                    pausadoRef.current = false
                    setAudioPausado(false)
                  }
                }}>{audioPausado ? 'Continuar' : 'Pausar'}</button>
                <button type="button" className="font-semibold" onClick={() => { enviarAoPararRef.current = false; cancelarGravacaoRef.current = false; recorderRef.current?.stop() }}>Parar</button>
              </p>
            )}
            <div className="flex items-end gap-2">
              <button type="button" className="text-lg px-1" aria-label="Emoji" onClick={() => { setMenuAnexo(false); setEmojis((v) => !v) }}>😀</button>
              <div className="relative">
                <button type="button" className="text-lg px-1" aria-label="Anexar" onClick={() => { setEmojis(false); setMenuAnexo((v) => !v) }}>📎</button>
                {menuAnexo && (
                  <div className="absolute bottom-8 left-0 z-20 rounded-lg p-1 text-xs shadow" style={{ background: 'var(--code-surface)', border: '1px solid var(--code-border)' }}>
                    <button type="button" className="block w-full text-left px-2 py-1" onClick={() => { setMenuAnexo(false); imagemRef.current?.click() }}>Imagem</button>
                    <button type="button" className="block w-full text-left px-2 py-1" onClick={() => { setMenuAnexo(false); documentoRef.current?.click() }}>Documento</button>
                    <button type="button" className="block w-full text-left px-2 py-1" onClick={() => { setMenuAnexo(false); planilhaRef.current?.click() }}>Planilha</button>
                    <button type="button" className="block w-full text-left px-2 py-1" onClick={() => { setMenuAnexo(false); videoRef.current?.click() }}>Vídeo</button>
                  </div>
                )}
                <input ref={imagemRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ''; if (file) setMidia({ file, url: URL.createObjectURL(file), legenda: '' }) }} />
                <input ref={documentoRef} type="file" accept="application/pdf,.pdf,.doc,.docx,.txt" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ''; if (file) setMidia({ file, url: URL.createObjectURL(file), legenda: '' }) }} />
                <input ref={planilhaRef} type="file" accept=".xls,.xlsx,.csv,text/csv" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ''; if (file) setMidia({ file, url: URL.createObjectURL(file), legenda: '' }) }} />
                <input ref={videoRef} type="file" accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ''; if (file) setMidia({ file, url: URL.createObjectURL(file), legenda: '' }) }} />
              </div>
              <button type="button" className="text-lg px-1" aria-label="Áudio" style={{ color: gravando ? 'var(--code-orange)' : 'inherit' }} onClick={() => void gravarAudio()}>🎤</button>
              <TextArea
                rows={2}
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                onKeyDown={(e) => {
                  const acao = teclaEnviaMensagem(e.key, e.shiftKey)
                  if (acao === 'linha') return
                  if (acao === 'enviar') {
                    e.preventDefault()
                    if (!enviando && texto.trim()) void send()
                  }
                }}
                placeholder="Digite uma mensagem..."
              />
              <PrimaryButton type="button" disabled={enviando || (!texto.trim() && !audioPreview && !gravando && !midia)} onClick={() => void send()}>{enviando ? 'Enviando...' : 'Enviar'}</PrimaryButton>
            </div>
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center p-6">
          <EmptyState title="Selecione um atendimento" description="Clique em um cliente na fila à esquerda. A conversa abre nesta mesma tela." />
        </div>
      )}
    </div>
  )

  const fichaCol = (
    <div className="h-full min-h-0 overflow-y-auto overflow-x-hidden border-l px-3 py-2.5 text-sm" style={{ borderColor: 'var(--code-border)', background: 'var(--code-surface)' }}>
      {cliente ? (
        <div className="space-y-2.5 min-w-0">
          <button type="button" className="lg:hidden text-[11px] font-semibold" onClick={() => setPainel('chat')}>← Conversa</button>
          {(() => {
            const phone = displayPhone(String(cliente.whatsapp || cliente.telefone || ''))
            const st = statusAtendimentoLabel(String(selected?.status || cliente.status || ''))
            const credLiberado = moneyOrEmpty(cliente.valorLiberado)
            const credParcela = moneyOrEmpty(cliente.valorParcela)
            const credPrazo = cliente.quantidadeParcelas ? `${cliente.quantidadeParcelas}x` : ''
            const hasCredit = Boolean(credLiberado || credParcela || credPrazo)
            const rua = [cliente.endereco, cliente.numero].filter(Boolean).join(', ')
            const hasAddr = Boolean(rua || cliente.bairro || cliente.cidade || cliente.cep)
            return (
              <>
                <header className="pb-2" style={{ borderBottom: '1px solid var(--code-border)' }}>
                  <p className="font-semibold text-[15px] leading-snug">{textoMisto(cliente.nome)}</p>
                  <p className="text-[12px] mt-1 font-semibold" style={{ color: 'var(--code-orange)' }}>{statusAtendimentoLabel(String(selected?.status || '')).label}</p>
                  <p className="text-[12px] mt-1">CPF {displayCpfSidebar(cliente.cpf) || '—'}</p>
                  <p className="text-[12px]" style={{ color: 'var(--code-muted)' }}>{phone || 'Telefone não informado'}</p>
                </header>

                <section className="rounded-lg px-2.5 py-2 text-[12px]" style={{ border: '1px solid var(--code-border)' }}>
                  <label className="flex items-center justify-between gap-2">
                    Nascimento
                    <input
                      type="date"
                      className="nexus-input text-[11px] h-7"
                      aria-label="Data de nascimento do cliente"
                      value={nascimentoParaInput(nascimentoCliente)}
                      onChange={(e) => void salvarNascimento(e.target.value)}
                    />
                  </label>
                  {hasAddr ? <p className="mt-1">{[rua, cliente.bairro, cliente.cidade, cliente.estado].filter(Boolean).join(' · ')}</p> : null}
                </section>

                <section className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--code-border)' }}>
                  <div className="flex items-center justify-between gap-2 px-2 py-1.5" style={{ background: 'var(--code-surface-muted)' }}>
                    <p className="text-[11px] font-semibold">Documentos do cliente</p>
                    <label className="text-[11px] font-semibold cursor-pointer" style={{ color: 'var(--code-orange)' }}>
                      Anexar
                      <input type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf,.pdf,video/mp4,audio/*" className="hidden" onChange={(e) => { Array.from(e.target.files || []).forEach((f) => void attach(f)); e.target.value = '' }} />
                    </label>
                  </div>
                  {pastaCliente.length === 0 && <p className="px-2 py-2 text-[11px]" style={{ color: 'var(--code-muted)' }}>Nenhum arquivo salvo nesta pasta.</p>}
                  {pastaCliente.map((d) => {
                    const url = String(d.url || '')
                    return (
                      <a key={d.id} href={url || undefined} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-2 py-1.5 border-t min-w-0" style={{ borderColor: 'var(--code-border)' }}>
                        <span className="text-[10px] font-semibold shrink-0" style={{ color: 'var(--code-orange)' }}>DOC</span>
                        <span className="text-[11px] truncate">{String(d.nome || 'Arquivo')}</span>
                        <span className="ml-auto text-[10px] shrink-0" style={{ color: 'var(--code-muted)' }}>Salvo</span>
                      </a>
                    )
                  })}
                </section>

                <section className="pt-0.5">
                  <Link className="text-[12px] font-semibold" to={`/digitacao?cliente=${cliente.id}&nome=${encodeURIComponent(cliente.nome || '')}&telefone=${encodeURIComponent(String(cliente.whatsapp || cliente.telefone || ''))}`}>Proposta</Link>
                  <Link className="block mt-1 text-[12px] font-semibold" to={`/digitacao?nova=1&cliente=${cliente.id}&conversa=${selected?.id || ''}&nome=${encodeURIComponent(cliente.nome || '')}&telefone=${encodeURIComponent(String(cliente.whatsapp || cliente.telefone || ''))}&produto=${encodeURIComponent(String(cliente.produto || cliente.modalidade || ''))}&origem=${String(selected?.leticiaStep || '').includes('analysis') ? 'atendimento' : 'whatsapp'}`}>Criar proposta</Link>
                  <Link className="block mt-1 text-[12px] font-semibold" to={`/digitacao?digitacao=1&cliente=${cliente.id}&conversa=${selected?.id || ''}&nome=${encodeURIComponent(cliente.nome || '')}&telefone=${encodeURIComponent(String(cliente.whatsapp || cliente.telefone || ''))}&produto=${encodeURIComponent(String(cliente.produto || cliente.modalidade || ''))}&origem=whatsapp`}>Criar digitação</Link>
                  {String(selected?.leticiaStep || '').includes('analysis') ? <p className="mt-1 text-[11px]">Dados coletados pelo atendimento. A proposta não é criada sozinha.</p> : null}
                  <button
                    type="button"
                    className="block mt-1 text-[12px] font-semibold text-left"
                    style={{ color: 'var(--code-orange)' }}
                    onClick={() => { setObsTexto(String(cliente.observacoes || '')); setObsAberta(true) }}
                  >
                    Obs{cliente.observacoes ? ` · ${String(cliente.observacoes).slice(0, 42)}` : ''}
                  </button>
                  {obsAberta && (
                    <div className="mt-1 rounded-lg p-2" style={{ border: '1px solid var(--code-border)' }}>
                      <textarea className="nexus-input w-full text-xs" rows={3} value={obsTexto} onChange={(e) => setObsTexto(e.target.value)} placeholder="Observação" />
                      <button type="button" className="text-[11px] font-semibold mt-1" style={{ color: 'var(--code-orange)' }} onClick={() => { void clientes.update(cliente.id, { observacoes: obsTexto }); setObsAberta(false) }}>Guardar</button>
                    </div>
                  )}
                </section>
              </>
            )
          })()}
        </div>
      ) : (
        <p className="text-xs" style={{ color: 'var(--code-muted)' }}>Selecione uma conversa para ver o cliente.</p>
      )}
    </div>
  )

  return (
    <div className="-m-3 md:-m-4 h-[calc(100vh-3.5rem)] md:h-[calc(100vh-4.5rem)] flex flex-col">
      <ErrorBanner message={conversas.error} />
      {novoCli && (
        <NexusModal compact title="Novo contato" onClose={() => setNovoCli(false)} onSave={() => void adicionarCliente()} closeOnBackdrop={false}>
          <label className="text-xs font-semibold block mb-2">Nome completo
            <TextInput placeholder="Nome completo" value={manual.nome} onChange={(e) => setManual({ ...manual, nome: e.target.value })} />
          </label>
          <label className="text-xs font-semibold block mb-2">CPF
            <TextInput placeholder="000.000.000-00" inputMode="numeric" value={manual.cpf} onChange={(e) => setManual({ ...manual, cpf: mascaraCpf(e.target.value) })} />
          </label>
          <label className="text-xs font-semibold block mb-2">Telefone WhatsApp
            <TextInput placeholder="(00) 00000-0000" inputMode="tel" value={manual.telefone} onChange={(e) => setManual({ ...manual, telefone: mascaraTelefone(e.target.value) })} />
          </label>
        </NexusModal>
      )}
      <div className="flex-1 min-h-0 grid lg:grid-cols-[300px_1fr_280px]">
        <div className={`${painel === 'lista' ? 'block' : 'hidden'} lg:block h-full min-h-0`}>{listaCol}</div>
        <div className={`${painel === 'chat' ? 'block' : 'hidden'} lg:block h-full min-h-0`}>{chatCol}</div>
        <div className={`${painel === 'ficha' ? 'block' : 'hidden'} lg:block h-full min-h-0`}>{fichaCol}</div>
      </div>
    </div>
  )
}

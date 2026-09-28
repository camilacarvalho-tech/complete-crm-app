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
import { origemMarca, origemPrincipalDe, origemTexto } from '../lib/origemLead'
import { produtoLabel } from '../modules/leads-monitor/catalog/produtosMonitor'
import { drainErpInbound } from '../lib/inboundErpMessage'
import { drainErpToCrmEvents } from '../integrations/events/eventHandlers'
import { drainNxErpHttpInbox, sendReplyViaNxErp } from '../integrations/erp/drainNxErpInbox'
import { deliveryGlyph, deliveryLabel, deliveryMark, newClientMessageId, phoneError } from '../integrations/erp/chatOutbound'
import { loadNxErpCrmConfig } from '../integrations/erp/nxErpCrmClient'
import { formatMessageClock, horaMensagem, rotuloDiaMensagem } from '../lib/messageClock'
import { gravacaoParaOgg } from '../lib/oggOpus'
import { textoMisto } from '../lib/uiPt'
import { EmojiPicker } from '../components/chat/EmojiPicker'
import { ClienteLink } from '../components/nexus/ClienteLink'
import type { NexusCliente } from '../types/nexus'
import { digits, maskCpf, maskPhone } from '../lib/format'
import './chatInterno.css'

const FILA = [
  { id: 'todas', label: 'Todas' },
  { id: 'novos', label: 'Novos' },
  { id: 'aguardando', label: 'Aguardando' },
  { id: 'em_atendimento', label: 'Em atendimento' },
  { id: 'aguardando_cliente', label: 'Aguardando cliente' },
  { id: 'documentacao', label: 'Documentação' },
  { id: 'proposta', label: 'Proposta' },
  { id: 'contrato', label: 'Contrato' },
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

function displayNascimento(value?: string) {
  const raw = String(value || '').trim()
  if (!raw) return '—'
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`
  const compacto = digits(raw)
  if (compacto.length === 8) return `${compacto.slice(0, 2)}/${compacto.slice(2, 4)}/${compacto.slice(4)}`
  const d = asDate(value)
  return d ? d.toLocaleDateString('pt-BR') : raw
}

function moneyOrEmpty(v: unknown) {
  const n = Number(v)
  if (!Number.isFinite(n) || n <= 0) return ''
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function statusAtendimentoLabel(status?: string) {
  const mapa: Record<string, string> = {
    aguardando_triagem: 'Novos',
    novos: 'Novos',
    aguardando_funcionario: 'Aguardando',
    aguardando: 'Aguardando',
    em_atendimento: 'Em atendimento',
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

function slotFila(c: { status?: unknown }, cli?: NexusCliente): string {
  const st = String(c.status || '')
  const stage = String(cli?.pipelineStage || '')
  if (st === 'finalizado') return 'finalizados'
  if (st === 'aguardando_cliente') return 'aguardando_cliente'
  if (stage === 'contrato' || st === 'contrato') return 'contrato'
  if (stage === 'proposta' || st === 'proposta') return 'proposta'
  if (stage === 'documentacao' || st === 'documentacao') return 'documentacao'
  if (st === 'em_atendimento') return 'em_atendimento'
  if (st === 'aguardando_funcionario' || st === 'aguardando_humano') return 'aguardando'
  return 'novos'
}

export default function ChatCenter() {
  const { usuario } = useAuth()
  const toast = useToast()
  const { conversas, mensagens, clientes, documentos, propostas, digitacoes, contratos, usuariosEmpresa } = useNexusStore()
  const [params, setParams] = useSearchParams()
  const clientePref = params.get('cliente')
  const modalidade = params.get('modalidade')
  const [filtro, setFiltro] = useState(params.get('fila') || 'todas')
  const [filtrosAbertos, setFiltrosAbertos] = useState(false)
  const [origemF, setOrigemF] = useState('')
  const [campanhaF, setCampanhaF] = useState('')
  const [fonteF, setFonteF] = useState('')
  const [estadoF, setEstadoF] = useState('')
  const [cidadeF, setCidadeF] = useState('')
  const [segmentoF, setSegmentoF] = useState('')
  const [produtoF, setProdutoF] = useState('')
  const [respF, setRespF] = useState('')
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [emojis, setEmojis] = useState(false)
  const [midia, setMidia] = useState<{ file: File; url: string; legenda: string } | null>(null)
  const [audioPreview, setAudioPreview] = useState<{ url: string; file: File } | null>(null)
  const [gravandoSeg, setGravandoSeg] = useState(0)
  const [limiteMsgs, setLimiteMsgs] = useState(50)
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

  useEffect(() => {
    if (conversas.loading || sessionStorage.getItem('nexus-chat-so-camila')) return
    const falsas = externas.filter((c) => {
      const cli = clientes.items.find((x) => x.id === c.clienteId)
      return !/camila/i.test(`${c.titulo || ''} ${cli?.nome || ''}`)
    })
    sessionStorage.setItem('nexus-chat-so-camila', '1')
    if (falsas.length) void Promise.all(falsas.map((c) => conversas.remove(c.id)))
  }, [conversas.loading, externas, clientes.items, conversas.remove])

  const contagem = useMemo(() => {
    const map: Record<string, number> = { todas: 0 }
    for (const f of FILA) map[f.id] = 0
    for (const c of externas) {
      const cli = clientes.items.find((x) => x.id === c.clienteId)
      const slot = slotFila(c, cli)
      map[slot] = (map[slot] || 0) + 1
      if (slot !== 'finalizados') map.todas += 1
    }
    return map
  }, [externas, clientes.items])

  const lista = useMemo(() => {
    const q = busca.toLowerCase()
    return externas
      .filter((c) => {
        const cli = clientes.items.find((x) => x.id === c.clienteId)
        const slot = slotFila(c, cli)
        if (filtro === 'todas' && slot === 'finalizados') return false
        if (filtro !== 'todas' && slot !== filtro) return false
        const orig = origemPrincipalDe(cli || { origemLead: c.origemLead })
        if (origemF && orig !== origemF) return false
        if (campanhaF && !String(cli?.campanhaNome || cli?.campanha || c.campanhaNome || '').toLowerCase().includes(campanhaF.toLowerCase())) return false
        if (fonteF && !String(cli?.fonte || cli?.fontePesquisa || '').toLowerCase().includes(fonteF.toLowerCase())) return false
        if (estadoF && String(cli?.estado || c.estado || '').toLowerCase() !== estadoF.toLowerCase()) return false
        if (cidadeF && !String(cli?.cidade || c.cidade || '').toLowerCase().includes(cidadeF.toLowerCase())) return false
        if (segmentoF && !String(cli?.modalidade || '').toLowerCase().includes(segmentoF.toLowerCase())) return false
        if (produtoF && !String(cli?.produto || cli?.modalidade || '').toLowerCase().includes(produtoF.toLowerCase())) return false
        if (respF && String(c.assignedToId || '') !== respF) return false
        if (clientePref && c.clienteId !== clientePref) return false
        if (q) {
          const blob = `${c.titulo} ${c.lastMessage} ${c.assignedTo}`.toLowerCase()
          const extra = `${cli?.nome} ${cli?.telefone} ${cli?.whatsapp} ${cli?.campanhaNome}`.toLowerCase()
          if (!blob.includes(q) && !extra.includes(q)) return false
        }
        return true
      })
      .sort((a, b) => String(b.atualizadoEm || b.criadoEm || '').localeCompare(String(a.atualizadoEm || a.criadoEm || '')))
  }, [externas, filtro, clientePref, busca, clientes.items, origemF, campanhaF, fonteF, estadoF, cidadeF, segmentoF, produtoF, respF])

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
  const origemCode = origemPrincipalDe(cliente)
  const marca = origemMarca(origemCode)
  const msgs = mensagens.items
    .filter((m) => m.conversaId === selected?.id)
    .sort((a, b) => String(a.criadoEm || '').localeCompare(String(b.criadoEm || '')))

  useEffect(() => {
    noFundoRef.current = true
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
    if (!nome) {
      toast.error('Informe o nome do cliente')
      return
    }
    const id = await clientes.create({
      nome,
      cpf: manual.cpf.trim(),
      telefone: manual.telefone.trim(),
      whatsapp: manual.telefone.trim(),
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
      if (mensagemId) await mensagens.update(mensagemId, { status: 'failed', erroEnvio: invalido })
      toast.error(invalido)
      return
    }
    const erp = usuario?.empresaId ? await loadNxErpCrmConfig(usuario.empresaId) : null
    if (!(erp?.modo === 'real' && erp.ativo && erp.apiUrl && usuario?.empresaId)) {
      if (mensagemId) await mensagens.update(mensagemId, { status: 'failed', erroEnvio: 'NX ERP real não está ativo' })
      toast.error('Registrada no Nexus. NX ERP real não está ativo — nada foi enviado ao WhatsApp.')
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
    if (mensagemId) {
      await mensagens.update(mensagemId, confirmado
        ? { status: 'sent', erpStatus: 'sent', wamid: sent.wamid, messageId: sent.wamid, erroEnvio: '' }
        : { status: 'failed', erpStatus: 'failed', erroEnvio: sent.wamid ? '' : (sent.message || 'A Meta não confirmou o envio.') })
    }
    if (!confirmado) toast.error(sent.message || 'A Meta não confirmou o envio.')
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
    const cid = await ensureConversa()
    if (!cid) return
    const invalido = phoneError(String(cliente?.whatsapp || cliente?.telefone || ''))
    if (invalido) {
      toast.error(invalido)
      return
    }
    const clientMessageId = newClientMessageId()
    const resposta = respondendo
    envioTickRef.current = true
    setTexto('')
    setRespondendo(null)
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
    void conversas.update(cid, { lastMessage: textoEnvio, status: 'aguardando_cliente', lastAssignedTo: selected?.assignedTo })
    envioTickRef.current = false
    void entregarTexto(cid, textoEnvio, clientMessageId, mensagemId, resposta?.wamid)
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
      status: 'em_atendimento',
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

  async function transferirLaiane() {
    if (!selected) return
    await conversas.update(selected.id, {
      assignedTo: 'Laiane',
      status: 'em_atendimento',
      statusAtendimento: 'HUMANO',
      roboPausado: true,
      robotPaused: true,
      robotState: 'HUMAN_ACTIVE',
      leticiaStep: 'human',
      etapa: 'HUMANO',
      botAtivo: false,
      atendimentoHumano: true,
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
          <button type="button" className="text-[11px] font-semibold" style={{ color: 'var(--code-orange)' }} onClick={() => setNovoCli(true)}>Cliente</button>
        </div>
        <TextInput placeholder="Buscar cliente ou telefone" value={busca} onChange={(e) => setBusca(e.target.value)} />
        <button type="button" className="text-[11px] font-semibold" style={{ color: 'var(--code-orange)' }} onClick={() => setFiltrosAbertos((v) => !v)}>
          {filtrosAbertos ? 'Ocultar filtros' : 'Filtros'}
        </button>
        {filtrosAbertos && (
          <div className="grid grid-cols-2 gap-1">
            <SelectInput value={origemF} onChange={(e) => setOrigemF(e.target.value)}>
              <option value="">Origem</option>
              <option value="leads_monitor">Leads Monitor</option>
              <option value="trafego_pago">Tráfego pago</option>
              <option value="disparo_massa">Disparo em massa</option>
              <option value="planilha_csv">Planilha</option>
              <option value="landing_page">Landing page</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="manual">Manual</option>
            </SelectInput>
            <TextInput placeholder="Campanha" value={campanhaF} onChange={(e) => setCampanhaF(e.target.value)} />
            <TextInput placeholder="Fonte" value={fonteF} onChange={(e) => setFonteF(e.target.value)} />
            <TextInput placeholder="UF" value={estadoF} onChange={(e) => setEstadoF(e.target.value)} />
            <TextInput placeholder="Cidade" value={cidadeF} onChange={(e) => setCidadeF(e.target.value)} />
            <TextInput placeholder="Segmento" value={segmentoF} onChange={(e) => setSegmentoF(e.target.value)} />
            <TextInput placeholder="Produto" value={produtoF} onChange={(e) => setProdutoF(e.target.value)} />
            <SelectInput value={respF} onChange={(e) => setRespF(e.target.value)}>
              <option value="">Responsável</option>
              {usuariosEmpresa.items.map((u) => <option key={u.id} value={u.id}>{String(u.nome)}</option>)}
            </SelectInput>
          </div>
        )}
        <div className="flex flex-wrap gap-1">
          {FILA.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFiltro(f.id)}
              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${filtro === f.id ? 'nexus-cta text-white' : ''}`}
              style={filtro === f.id ? undefined : { background: 'var(--code-surface-muted)' }}
            >
              {f.label} {contagem[f.id] ? contagem[f.id] : ''}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {lista.length === 0 && <div className="p-3"><EmptyState title="Nenhuma conversa neste filtro" description="Leads aprovados no Monitor entram automaticamente aqui." /></div>}
        {lista.map((c) => {
          const cli = clientes.items.find((x) => x.id === c.clienteId)
          const oc = origemPrincipalDe(cli || { origemLead: c.origemLead })
          const mk = origemMarca(oc)
          const unread = Number(c.naoLidas || 0)
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => abrirConversa(c.id, String(c.clienteId || ''))}
              className="w-full text-left px-3 py-2 border-b"
              style={{
                borderColor: 'var(--code-border)',
                background: selected?.id === c.id ? 'var(--code-surface-muted)' : 'transparent',
              }}
            >
              <div className="flex justify-between gap-2">
                <p className="text-sm font-semibold truncate">{String(c.titulo || cli?.nome || 'Conversa')}</p>
                <span className="text-[10px] shrink-0" style={{ color: 'var(--code-muted)' }}>{formatMessageClock(asDate(c.atualizadoEm || c.criadoEm))}</span>
              </div>
              <p className="text-[11px] truncate" style={{ color: 'var(--code-muted)' }}>{String(c.lastMessage || 'Sem mensagens')}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] font-semibold" style={{ color: mk.cor }}>{mk.emoji} {origemTexto(oc)}</span>
                {(cli?.produto || cli?.modalidade || c.produto) ? (
                  <span className="text-[10px] font-semibold" style={{ color: 'var(--code-orange)' }}>
                    {produtoLabel(String(cli?.produto || cli?.modalidade || c.produto || ''))}
                  </span>
                ) : null}
                {unread > 0 && <span className="ml-auto text-[10px] px-1.5 rounded-full text-white" style={{ background: 'var(--code-orange)' }}>{unread}</span>}
              </div>
              <p className="text-[10px]" style={{ color: 'var(--code-muted)' }}>{String(cli?.campanhaNome || cli?.campanha || c.campanhaNome || '—')} · {String(c.assignedTo || 'sem responsável')}</p>
            </button>
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
                <p className="text-[10px] font-semibold" style={{ color: 'var(--code-orange)' }}>LOCAL / TESTE · Letícia não envia WhatsApp sozinha</p>
                <div className="flex items-center gap-2">
                  <button type="button" className="lg:hidden text-xs font-semibold" onClick={() => setPainel('lista')}>← Fila</button>
                  <p className="font-bold text-sm">{textoMisto(String(cliente?.nome || selected.titulo || ''))}</p>
                </div>
                <p className="text-[11px]" style={{ color: 'var(--code-muted)' }}>{displayCpfSidebar(cliente?.cpf) ? `CPF ${displayCpfSidebar(cliente?.cpf)}` : 'CPF —'} · {displayPhone(String(cliente?.whatsapp || cliente?.telefone || '')) || 'Telefone —'}</p>
                {(cliente?.produto || cliente?.modalidade || selected.produto) && (
                  <p className="text-[11px] font-semibold" style={{ color: 'var(--code-orange)' }}>
                    {produtoLabel(String(cliente?.produto || cliente?.modalidade || selected.produto || selected.operacao || ''))}
                  </p>
                )}
                {(cliente?.campanhaNome || cliente?.campanha) && <p className="text-[11px]">{String(cliente.campanhaNome || cliente.campanha)}</p>}
              </div>
              <div className="flex flex-wrap gap-1 justify-end">
                <GhostButton className="text-xs" onClick={() => void assumir()}>Assumir</GhostButton>
                <GhostButton className="text-xs" onClick={() => void transferirLaiane()}>Transferir para Laiane</GhostButton>
                <GhostButton className="text-xs" aria-label="Fechar" data-nexus-esc onClick={fecharConversa}>X</GhostButton>
                <GhostButton className="text-xs lg:hidden" onClick={() => setPainel('ficha')}>Cliente</GhostButton>
                <SelectInput value={String(selected.status || '')} onChange={(e) => void mudarStatus(e.target.value)}>
                  <option value="aguardando_triagem">Novos</option>
                  <option value="aguardando_funcionario">Aguardando</option>
                  <option value="em_atendimento">Em atendimento</option>
                  <option value="aguardando_cliente">Aguardando cliente</option>
                  <option value="documentacao">Documentação</option>
                  <option value="proposta">Proposta</option>
                  <option value="contrato">Contrato</option>
                  <option value="finalizado">Finalizado</option>
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
          <div
            ref={listaChatRef}
            className="flex-1 overflow-y-auto p-3 space-y-2"
            onScroll={(e) => {
              const el = e.currentTarget
              noFundoRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
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
              const apagada = Boolean(m.deletedAt)
              const quando = asDate(m.criadoEm)
              const dia = rotuloDiaMensagem(quando)
              const diaAnterior = indice > 0 ? rotuloDiaMensagem(asDate(listaVisivel[indice - 1].criadoEm)) : ''
              const statusLeticia = daLeticia ? (mark === 'sending' ? 'Gerando...' : 'Enviada') : ''
              return (
              <div key={m.id}>
                {dia && dia !== diaAnterior ? <p className="text-[10px] text-center py-1" style={{ color: 'var(--code-muted)' }}>{dia}</p> : null}
              <div className={`bolha ${minha || daLeticia ? 'sai' : 'entra'}`}>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[10px]" style={{ color: 'var(--code-muted)' }}>{textoMisto(String(m.autorNome || ''))} · {horaMensagem(quando)}</p>
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
                    <button type="button" onClick={() => { setMenuMsg(null); if (window.confirm('Apagar esta mensagem?')) void mensagens.update(m.id, { deletedAt: new Date().toISOString() }) }}>Apagar</button>
                  </div>
                )}
                {apagada ? <p>Mensagem apagada</p> : (
                  <>
                    {m.replyToTexto ? <p className="text-[10px] border-l-2 pl-1 mb-1">Respondendo a: {String(m.replyToTexto)}</p> : null}
                    {String(m.tipo) === 'imagem' && (m.arquivoUrl ? <img src={String(m.arquivoUrl)} alt="" className="max-h-40 rounded mt-1" /> : <p>Imagem: {String(m.texto)}</p>)}
                    {String(m.tipo) === 'audio' && (m.arquivoUrl ? <audio controls src={String(m.arquivoUrl)} className="mt-1" /> : <p>Áudio: {String(m.texto)}</p>)}
                    {String(m.tipo) === 'video' && (m.arquivoUrl ? <video controls src={String(m.arquivoUrl)} className="max-h-40 rounded mt-1" /> : <p>Vídeo: {String(m.texto)}</p>)}
                    {String(m.tipo) === 'documento' && <p>📎 {String(m.texto)}</p>}
                    {!['imagem', 'documento', 'audio', 'video'].includes(String(m.tipo)) && <p>{String(m.texto || '')}</p>}
                    {m.editedAt ? <p className="text-[10px]">editada no CRM</p> : null}
                  </>
                )}
                {(minha || daLeticia) && !apagada && (
                  <p className="text-[10px] text-right" style={{ color: mark === 'read' ? '#53bdeb' : mark === 'failed' ? '#b91c1c' : 'var(--code-muted)' }}>
                    {daLeticia ? (mark === 'sending' ? '…' : '✓') : deliveryGlyph(String(m.erpStatus || m.status || ''))} {daLeticia ? statusLeticia : deliveryLabel(String(m.erpStatus || m.status || ''))}
                  </p>
                )}
                {mark === 'failed' && m.erroEnvio ? <p className="text-[10px]" style={{ color: '#b91c1c' }}>{String(m.erroEnvio)}</p> : null}
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
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    if (!enviando) void send()
                  }
                }}
                placeholder="Digite uma mensagem..."
              />
              <PrimaryButton disabled={!texto.trim() && !audioPreview && !gravando && !midia} onClick={() => void send()}>Enviar</PrimaryButton>
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
                  <p>Nascimento {displayNascimento(nascimentoCliente)}</p>
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
        <NexusModal compact title="Cliente manual" onClose={() => setNovoCli(false)} onSave={() => void adicionarCliente()} closeOnBackdrop={false}>
          <label className="text-xs font-semibold block mb-2">Nome
            <TextInput placeholder="Nome completo" value={manual.nome} onChange={(e) => setManual({ ...manual, nome: e.target.value })} />
          </label>
          <label className="text-xs font-semibold block mb-2">CPF
            <TextInput placeholder="CPF" value={manual.cpf} onChange={(e) => setManual({ ...manual, cpf: e.target.value })} />
          </label>
          <label className="text-xs font-semibold block mb-2">Telefone
            <TextInput placeholder="WhatsApp" value={manual.telefone} onChange={(e) => setManual({ ...manual, telefone: e.target.value })} />
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

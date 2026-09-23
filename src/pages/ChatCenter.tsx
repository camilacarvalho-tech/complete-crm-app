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
import { getWhatsAppProvider } from '../integrations/providers'
import { labelPt, textoMisto } from '../lib/uiPt'
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

function horaCurta(v: unknown) {
  const d = asDate(v)
  return d ? d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''
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
  const [gravando, setGravando] = useState(false)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const [busca, setBusca] = useState('')
  const [novoCli, setNovoCli] = useState(false)
  const [obsAberta, setObsAberta] = useState(false)
  const [obsTexto, setObsTexto] = useState('')
  const [pastaLocal, setPastaLocal] = useState<{ id: string; clienteId: string; nome: string; url: string; tipo: string }[]>([])
  const [manual, setManual] = useState({ nome: '', cpf: '', telefone: '' })
  const [waReady, setWaReady] = useState<boolean | null>(null)
  const [painel, setPainel] = useState<'lista' | 'chat' | 'ficha'>(params.get('conversa') ? 'chat' : 'lista')
  const selectedId = params.get('conversa')

  useEffect(() => {
    const eid = usuario?.empresaId
    if (!eid) return
    void drainErpInbound(eid)
    void drainErpToCrmEvents(eid)
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
    if (!selectedId) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') fecharConversa()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedId, params])

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
    if (id) void conversas.update(id, { naoLidas: 0 })
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

  async function send() {
    const cid = await ensureConversa()
    if (!cid || !texto.trim()) return
    let statusMsg = 'enviando'
    const health = await getWhatsAppProvider().healthCheck()
    setWaReady(health.status === 'online')
    if (health.status !== 'online') {
      statusMsg = 'nao_enviada'
      toast.error('Registrada no Nexus. WhatsApp oficial: não configurado — não enviada ao cliente.')
    } else {
      const sent = await getWhatsAppProvider().sendMessage(String(cliente?.whatsapp || cliente?.telefone || ''), texto.trim())
      if (!sent.ok) {
        statusMsg = 'nao_enviada'
        toast.error(sent.message || 'WhatsApp ainda não configurado.')
      }
    }
    await mensagens.create({
      conversaId: cid,
      texto: texto.trim(),
      tipo: 'texto',
      interno: false,
      autorId: usuario?.id,
      autorNome: usuario?.nome,
      status: statusMsg,
      channel: selected?.canal || 'whatsapp',
    } as any)
    await conversas.update(cid, { lastMessage: texto.trim(), status: 'aguardando_cliente', lastAssignedTo: selected?.assignedTo })
    setTexto('')
  }

  async function attach(file: File) {
    const cid = await ensureConversa()
    if (!cid || !cliente) return
    const allowed = /^(image\/(jpeg|jpg|png|webp)|application\/pdf|audio\/(webm|ogg|mpeg|mp4|wav)|video\/(mp4|webm|quicktime))$/i.test(file.type) || /\.(pdf|jpe?g|png|webp|webm|ogg|mp3|m4a|wav|mp4|mov)$/i.test(file.name)
    if (!allowed) {
      toast.error('Use imagem, PDF, vídeo ou áudio.')
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
      const mime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg'
      const rec = new MediaRecorder(stream)
      const chunks: Blob[] = []
      rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data) }
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        setGravando(false)
        const blob = new Blob(chunks, { type: mime })
        const file = new File([blob], `audio-${Date.now()}.webm`, { type: mime })
        void attach(file)
      }
      recorderRef.current = rec
      rec.start()
      setGravando(true)
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
                <span className="text-[10px] shrink-0" style={{ color: 'var(--code-muted)' }}>{horaCurta(c.atualizadoEm || c.criadoEm)}</span>
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
              <SelectInput value="" onChange={(e) => void transferir(e.target.value)}>
                <option value="">Transferir para funcionário</option>
                {usuariosEmpresa.items.map((u) => <option key={u.id} value={u.id}>{String(u.nome)}{u.cargo ? ` — ${String(u.cargo)}` : ''}</option>)}
              </SelectInput>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {selected.roboPausado ? null : null}
            <div className="chat-wa">
            {msgs.map((m) => (
              <div key={m.id} className={`bolha ${m.autorId === usuario?.id ? 'sai' : 'entra'}`}>
                <p className="text-[10px]" style={{ color: 'var(--code-muted)' }}>{textoMisto(String(m.autorNome || ''))} · {horaCurta(m.criadoEm)}</p>
                {String(m.tipo) === 'imagem' && (m.arquivoUrl ? <img src={String(m.arquivoUrl)} alt="" className="max-h-40 rounded mt-1" /> : <p>Imagem: {String(m.texto)}</p>)}
                {String(m.tipo) === 'audio' && (m.arquivoUrl ? <audio controls src={String(m.arquivoUrl)} className="mt-1" /> : <p>Áudio: {String(m.texto)}</p>)}
                {String(m.tipo) === 'video' && (m.arquivoUrl ? <video controls src={String(m.arquivoUrl)} className="max-h-40 rounded mt-1" /> : <p>Vídeo: {String(m.texto)}</p>)}
                {String(m.tipo) === 'documento' && <p>📎 {String(m.texto)}</p>}
                {!['imagem', 'documento', 'audio', 'video'].includes(String(m.tipo)) && <p>{String(m.texto || '')}</p>}
              </div>
            ))}
            {msgs.length === 0 && <p className="text-sm text-center" style={{ color: 'var(--code-muted)' }}>Nenhuma mensagem ainda.</p>}
            </div>
          </div>
          <div className="p-2 border-t shrink-0" style={{ borderColor: 'var(--code-border)', background: 'var(--code-surface)' }}>
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
                placeholder="Digite uma mensagem..."
              />
              <PrimaryButton onClick={() => void send()}>Enviar</PrimaryButton>
            </div>
            <div className="flex flex-wrap gap-3 items-center text-[11px] mt-1">
              <label className="cursor-pointer font-semibold" style={{ color: 'var(--code-orange)' }}>
                Imagem
                <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && attach(e.target.files[0])} />
              </label>
              <label className="cursor-pointer font-semibold">
                Documento
                <input type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => e.target.files?.[0] && attach(e.target.files[0])} />
              </label>
              <label className="cursor-pointer font-semibold">
                Vídeo
                <input type="file" accept="video/mp4,video/webm,video/quicktime,.mp4,.mov" className="hidden" onChange={(e) => e.target.files?.[0] && attach(e.target.files[0])} />
              </label>
              <button type="button" className="font-semibold" style={{ color: gravando ? 'var(--code-orange)' : 'inherit' }} onClick={() => void gravarAudio()}>
                {gravando ? 'Parar e enviar áudio' : 'Áudio'}
              </button>
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
                  <Link className="text-[12px] font-semibold" to={`/propostas?cliente=${cliente.id}`}>Proposta</Link>
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

import { useState, useEffect, useRef, useMemo } from 'react'
import {
  MessageCircle, X, Send, User, ChevronLeft, ChevronRight,
  Download, FileText, Paperclip, Search, Save, Smile,
  Mic, StopCircle, Pin, Star, Tag,
  Zap, BookOpen, PinOff, UserPlus, Plus
} from 'lucide-react'
import * as XLSX from 'xlsx'
import {
  collection, query, onSnapshot, addDoc, updateDoc, doc, getDoc,
  serverTimestamp, orderBy, getDocs, where
} from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../contexts/AuthContext'
import {
  PIPELINE_ETAPAS, TAG_COLORS, RESPOSTAS_RAPIDAS, MENSAGENS_PRONTAS,
  type PipelineEtapa
} from '../constants/pipeline'
import { maskPhone, maskCpf, onlyDigits } from '../utils/masks'

interface Conversa {
  id: string
  nome: string
  telefone: string
  ultimaMensagem: string
  naoLidas: number
  hora: string
  fixada?: boolean
  favorita?: boolean
  tags?: string[]
  clienteId?: string
  atualizadoEm?: any
}

interface Mensagem {
  id: string
  texto: string
  remetente: 'cliente' | 'atendente'
  hora: string
  timestamp?: any
  imagem?: string
  pdf?: string
  nomeArquivo?: string
  audio?: string
}

const nichosModalidades: Record<string, string[]> = {
  Odontologia: ['Clareamento Dental', 'Implante Dentário', 'Ortodontia', 'Limpeza', 'Canal'],
  'Corban/INSS': ['Aposentadoria', 'Empréstimo Consignado', 'Refinanciamento', 'Portabilidade', 'BPC/LOAS'],
  Advocacia: ['Civil', 'Trabalhista', 'Criminal', 'Família', 'Previdenciário'],
  'Clínica Médica': ['Clínico Geral', 'Cardiologia', 'Dermatologia', 'Ortopedia', 'Pediatria'],
  Psicologia: ['Terapia Individual', 'Casal', 'Familiar', 'Avaliação'],
}

const emojis = [
  '😀','😃','😄','😁','😆','😅','🤣','😂','🙂','😉','😊','😇','🥰','😍','🤩','😘',
  '👍','👎','👌','✌️','🤞','🤟','🤘','🤙','👋','🤝','🙏','💪','❤️','🧡','💛','💚',
  '💙','💜','🔥','✨','🎉','🎊','✅','❌','⭐','💯'
]

const fichaVazia = (conv?: Conversa | null) => ({
  nome: conv?.nome || '',
  cpf: '',
  rg: '',
  cnh: '',
  dataNascimento: '',
  telefone: conv?.telefone || '',
  whatsapp: conv?.telefone || '',
  email: '',
  empresa: '',
  cep: '',
  endereco: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  uf: '',
  nicho: '',
  modalidade: '',
  status: 'Novo Lead' as string,
  pipeline: 'Novo Lead' as PipelineEtapa | string,
  responsavel: '',
  origem: 'WhatsApp',
  score: 50,
  observacoes: '',
  tags: [] as string[],
  favorito: false,
})

export default function ChatCenter() {
  const { user, empresa, usuario } = useAuth()
  const empresaId =
    empresa?.id ||
    usuario?.empresaId ||
    localStorage.getItem('empresaId') ||
    localStorage.getItem('nexus_empresa_id') ||
    ''
  const nomeUsuario = usuario?.nome || user?.displayName || 'Atendente'

  const [modalOpen, setModalOpen] = useState(false)
  const [conversas, setConversas] = useState<Conversa[]>([])
  const [conversaSelecionada, setConversaSelecionada] = useState<Conversa | null>(null)
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [novaMensagem, setNovaMensagem] = useState('')
  const [painelAberto, setPainelAberto] = useState(true)
  const [busca, setBusca] = useState('')
  const [buscaConversa, setBuscaConversa] = useState('')
  const [showEmojis, setShowEmojis] = useState(false)
  const [showRapidas, setShowRapidas] = useState(false)
  const [showProntas, setShowProntas] = useState(false)
  const [imagemPreview, setImagemPreview] = useState<string | null>(null)
  const [pdfPreview, setPdfPreview] = useState<{ name: string; dataUrl: string } | null>(null)
  const [gravandoAudio, setGravandoAudio] = useState(false)
  const [audioPreview, setAudioPreview] = useState<string | null>(null)
  const [imagemModal, setImagemModal] = useState<string | null>(null)
  const [formCliente, setFormCliente] = useState(fichaVazia())
  const [documentos, setDocumentos] = useState<Array<{ nome: string; tipo: string; tamanho: number; dataUrl?: string }>>([])
  const [salvoMsg, setSalvoMsg] = useState('')
  const [clienteDocId, setClienteDocId] = useState<string | null>(null)
  const [novaTag, setNovaTag] = useState('')
  const [loadingConv, setLoadingConv] = useState(true)
  const [showNovoContato, setShowNovoContato] = useState(false)
  const [novoContato, setNovoContato] = useState({ nome: '', telefone: '', whatsapp: '' })
  const [criandoContato, setCriandoContato] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!modalOpen) return
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (showNovoContato) { setShowNovoContato(false); return }
      if (imagemModal) { setImagemModal(null); return }
      if (showEmojis || showRapidas || showProntas) {
        setShowEmojis(false); setShowRapidas(false); setShowProntas(false); return
      }
      if (imagemPreview || pdfPreview || audioPreview) {
        setImagemPreview(null); setPdfPreview(null); setAudioPreview(null); return
      }
      setModalOpen(false)
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [modalOpen, showNovoContato, imagemModal, showEmojis, showRapidas, showProntas, imagemPreview, pdfPreview, audioPreview])

  useEffect(() => {
    if (!empresaId) { setConversas([]); setLoadingConv(false); return }
    const unsub = onSnapshot(
      query(collection(db, 'empresas', empresaId, 'conversas'), orderBy('atualizadoEm', 'desc')),
      (snap) => {
        setConversas(snap.docs.map((d) => {
          const data = d.data()
          return {
            id: d.id,
            nome: data.nome || 'Sem nome',
            telefone: data.telefone || data.whatsapp || '',
            ultimaMensagem: data.ultimaMensagem || '',
            naoLidas: Number(data.naoLidas || 0),
            hora: data.hora || '',
            fixada: !!data.fixada,
            favorita: !!data.favorita,
            tags: data.tags || [],
            clienteId: data.clienteId,
            atualizadoEm: data.atualizadoEm,
          } as Conversa
        }))
        setLoadingConv(false)
      },
      () => {
        return onSnapshot(collection(db, 'empresas', empresaId, 'conversas'), (snap) => {
          setConversas(snap.docs.map((d) => {
            const data = d.data()
            return {
              id: d.id,
              nome: data.nome || 'Sem nome',
              telefone: data.telefone || '',
              ultimaMensagem: data.ultimaMensagem || '',
              naoLidas: Number(data.naoLidas || 0),
              hora: data.hora || '',
              fixada: !!data.fixada,
              favorita: !!data.favorita,
              tags: data.tags || [],
              clienteId: data.clienteId,
            } as Conversa
          }))
          setLoadingConv(false)
        })
      }
    )
    return () => unsub()
  }, [empresaId])

  useEffect(() => {
    if (!empresaId || !conversaSelecionada) { setMensagens([]); return }
    const path = collection(db, 'empresas', empresaId, 'conversas', conversaSelecionada.id, 'mensagens')
    const unsub = onSnapshot(
      query(path, orderBy('timestamp', 'asc')),
      (snap) => {
        setMensagens(snap.docs.map((d) => {
          const data = d.data()
          return {
            id: d.id,
            texto: data.texto || '',
            remetente: data.remetente || 'cliente',
            hora: data.hora || '',
            timestamp: data.timestamp,
            imagem: data.imagem,
            pdf: data.pdf,
            nomeArquivo: data.nomeArquivo,
            audio: data.audio,
          } as Mensagem
        }))
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 80)
      },
      () => {
        onSnapshot(path, (snap) => {
          setMensagens(snap.docs.map((d) => {
            const data = d.data()
            return {
              id: d.id,
              texto: data.texto || '',
              remetente: data.remetente || 'cliente',
              hora: data.hora || '',
              imagem: data.imagem,
              pdf: data.pdf,
              nomeArquivo: data.nomeArquivo,
              audio: data.audio,
            } as Mensagem
          }))
        })
      }
    )
    void carregarFicha(conversaSelecionada)
    void updateDoc(doc(db, 'empresas', empresaId, 'conversas', conversaSelecionada.id), { naoLidas: 0 }).catch(() => {})
    return () => unsub()
  }, [empresaId, conversaSelecionada?.id])

  const carregarFicha = async (conv: Conversa) => {
    setSalvoMsg('')
    if (!empresaId) { setFormCliente(fichaVazia(conv)); return }
    try {
      let clienteId = conv.clienteId
      if (!clienteId) {
        const limpo = conv.telefone.replace(/\D/g, '')
        const q = query(collection(db, 'empresas', empresaId, 'clientes'), where('whatsapp', '==', limpo))
        const snap = await getDocs(q)
        if (!snap.empty) {
          clienteId = snap.docs[0].id
          const data = snap.docs[0].data()
          setClienteDocId(clienteId!)
          setFormCliente({
            ...fichaVazia(conv),
            nome: data.nome || conv.nome,
            cpf: data.cpf || '',
            telefone: data.telefone || conv.telefone,
            whatsapp: data.whatsapp || limpo,
            email: data.email || '',
            empresa: data.empresa || '',
            modalidade: data.modalidade || '',
            status: data.status || 'Novo Lead',
            pipeline: data.pipeline || data.status || 'Novo Lead',
            responsavel: data.atendente || data.responsavel || '',
            origem: data.origem || 'WhatsApp',
            score: data.score ?? 50,
            observacoes: data.observacoes || '',
            tags: data.tags || conv.tags || [],
            favorito: !!data.favorito || !!conv.favorita,
          })
          setDocumentos(Array.isArray(data.documentos) ? data.documentos : [])
          return
        }
      } else {
        const snap = await getDoc(doc(db, 'empresas', empresaId, 'clientes', clienteId))
        if (snap.exists()) {
          const data = snap.data()
          setClienteDocId(clienteId)
          setFormCliente({ ...fichaVazia(conv), ...data, pipeline: data.pipeline || data.status || 'Novo Lead' } as any)
          setDocumentos(Array.isArray(data.documentos) ? data.documentos : [])
          return
        }
      }
      setFormCliente(fichaVazia(conv))
      setDocumentos([])
      setClienteDocId(null)
    } catch {
      setFormCliente(fichaVazia(conv))
      setDocumentos([])
    }
  }

  const enviarMensagem = async () => {
    if ((!novaMensagem.trim() && !imagemPreview && !pdfPreview) || !conversaSelecionada || !empresaId) return
    const hora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    const texto = novaMensagem.trim()
    const ultima = pdfPreview ? `📄 ${pdfPreview.name}` : imagemPreview ? '📷 Imagem' : texto
    try {
      await addDoc(
        collection(db, 'empresas', empresaId, 'conversas', conversaSelecionada.id, 'mensagens'),
        {
          texto,
          remetente: 'atendente',
          hora,
          timestamp: serverTimestamp(),
          imagem: imagemPreview || null,
          pdf: pdfPreview?.dataUrl || null,
          nomeArquivo: pdfPreview?.name || (imagemPreview ? 'imagem.jpg' : null),
        }
      )
      await updateDoc(doc(db, 'empresas', empresaId, 'conversas', conversaSelecionada.id), {
        ultimaMensagem: ultima,
        hora,
        atualizadoEm: serverTimestamp(),
      })
    } catch (e) {
      console.error(e)
      alert('Erro ao enviar mensagem.')
    }
    setNovaMensagem('')
    setImagemPreview(null)
    setPdfPreview(null)
    setShowEmojis(false)
    setShowRapidas(false)
    setShowProntas(false)
  }

  const handleAnexo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      if (file.type.startsWith('image/')) {
        setImagemPreview(dataUrl)
        setPdfPreview(null)
      } else if (file.type === 'application/pdf') {
        setPdfPreview({ name: file.name, dataUrl })
        setImagemPreview(null)
      } else {
        alert('Envie imagem ou PDF.')
      }
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const iniciarGravacao = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []
      mediaRecorder.ondataavailable = (ev) => audioChunksRef.current.push(ev.data)
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        setAudioPreview(URL.createObjectURL(blob))
        stream.getTracks().forEach((t) => t.stop())
      }
      mediaRecorder.start()
      setGravandoAudio(true)
    } catch {
      alert('Erro ao acessar microfone.')
    }
  }

  const pararGravacao = () => {
    mediaRecorderRef.current?.stop()
    setGravandoAudio(false)
  }

  const enviarAudio = async () => {
    if (!audioPreview || !conversaSelecionada || !empresaId) return
    const hora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    try {
      await addDoc(
        collection(db, 'empresas', empresaId, 'conversas', conversaSelecionada.id, 'mensagens'),
        { texto: '', remetente: 'atendente', hora, timestamp: serverTimestamp(), audio: audioPreview }
      )
      await updateDoc(doc(db, 'empresas', empresaId, 'conversas', conversaSelecionada.id), {
        ultimaMensagem: '🎤 Áudio',
        hora,
        atualizadoEm: serverTimestamp(),
      })
    } catch (e) {
      console.error(e)
    }
    setAudioPreview(null)
  }

  const toggleFixar = async (conv: Conversa, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!empresaId) return
    await updateDoc(doc(db, 'empresas', empresaId, 'conversas', conv.id), {
      fixada: !conv.fixada,
      atualizadoEm: serverTimestamp(),
    }).catch(console.error)
  }

  const toggleFavorito = async () => {
    if (!conversaSelecionada || !empresaId) return
    const next = !formCliente.favorito
    setFormCliente({ ...formCliente, favorito: next })
    await updateDoc(doc(db, 'empresas', empresaId, 'conversas', conversaSelecionada.id), {
      favorita: next,
      atualizadoEm: serverTimestamp(),
    }).catch(console.error)
  }

  const addTag = () => {
    const t = novaTag.trim()
    if (!t || formCliente.tags.includes(t)) return
    setFormCliente({ ...formCliente, tags: [...formCliente.tags, t] })
    setNovaTag('')
  }

  const removeTag = (t: string) => {
    setFormCliente({ ...formCliente, tags: formCliente.tags.filter((x) => x !== t) })
  }

  const salvarCliente = async () => {
    if (!conversaSelecionada || !formCliente.nome.trim() || !empresaId) {
      alert('Preencha ao menos o nome do cliente!')
      return
    }
    setSalvoMsg('Salvando…')
    try {
      const payload = {
        ...formCliente,
        documentos: documentos.map((d) => ({ nome: d.nome, tipo: d.tipo, tamanho: d.tamanho })),
        atendente: formCliente.responsavel || nomeUsuario,
        status: formCliente.pipeline || formCliente.status,
        pipeline: formCliente.pipeline,
        atualizadoEm: serverTimestamp(),
        conversaId: conversaSelecionada.id,
        empresaId,
      }
      let cid = clienteDocId
      if (cid) {
        await updateDoc(doc(db, 'empresas', empresaId, 'clientes', cid), payload)
      } else {
        const ref = await addDoc(collection(db, 'empresas', empresaId, 'clientes'), {
          ...payload,
          criadoEm: serverTimestamp(),
        })
        cid = ref.id
        setClienteDocId(ref.id)
      }
      await updateDoc(doc(db, 'empresas', empresaId, 'conversas', conversaSelecionada.id), {
        nome: formCliente.nome.trim(),
        telefone: formCliente.whatsapp || formCliente.telefone,
        tags: formCliente.tags,
        favorita: formCliente.favorito,
        clienteId: cid,
        atualizadoEm: serverTimestamp(),
      })
      setSalvoMsg('Ficha salva')
      setTimeout(() => setSalvoMsg(''), 2500)
    } catch (e) {
      console.error(e)
      setSalvoMsg('Erro ao salvar')
    }
  }

  const exportarClientes = () => {
    const dados = conversas.map((c) => ({
      Nome: c.nome,
      Telefone: c.telefone,
      Tags: (c.tags || []).join(', '),
      Fixada: c.fixada ? 'Sim' : 'Não',
      Favorita: c.favorita ? 'Sim' : 'Não',
      'Última Mensagem': c.ultimaMensagem,
    }))
    const ws = XLSX.utils.json_to_sheet(dados)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Conversas')
    XLSX.writeFile(wb, `Atendimento_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.xlsx`)
  }

  const criarNovoContato = async () => {
    const eid =
      empresaId ||
      localStorage.getItem('empresaId') ||
      localStorage.getItem('nexus_empresa_id') ||
      ''
    if (!eid) {
      alert('Empresa não identificada. Faça logout e login novamente.')
      return
    }
    const nome = novoContato.nome.trim()
    const telefone = maskPhone(novoContato.whatsapp || novoContato.telefone)
    if (!nome || !onlyDigits(telefone)) {
      alert('Preencha nome e telefone/WhatsApp.')
      return
    }
    setCriandoContato(true)
    try {
      const limpo = onlyDigits(telefone)
      const hora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      const clienteRef = await addDoc(collection(db, 'empresas', eid, 'clientes'), {
        nome,
        telefone,
        whatsapp: limpo,
        pipeline: 'Novo Lead',
        status: 'Novo Lead',
        origem: 'Atendimento',
        atendente: nomeUsuario,
        tags: [],
        favorito: false,
        criadoEm: serverTimestamp(),
        atualizadoEm: serverTimestamp(),
        empresaId: eid,
      })
      const convRef = await addDoc(collection(db, 'empresas', eid, 'conversas'), {
        nome,
        telefone,
        whatsapp: limpo,
        ultimaMensagem: 'Novo contato criado',
        naoLidas: 0,
        hora,
        fixada: false,
        favorita: false,
        tags: [],
        clienteId: clienteRef.id,
        atualizadoEm: serverTimestamp(),
        criadoEm: serverTimestamp(),
        empresaId: eid,
      })
      await updateDoc(doc(db, 'empresas', eid, 'clientes', clienteRef.id), {
        conversaId: convRef.id,
      })
      const nova: Conversa = {
        id: convRef.id,
        nome,
        telefone,
        ultimaMensagem: 'Novo contato criado',
        naoLidas: 0,
        hora,
        fixada: false,
        favorita: false,
        tags: [],
        clienteId: clienteRef.id,
      }
      setConversaSelecionada(nova)
      setClienteDocId(clienteRef.id)
      setFormCliente({
        ...fichaVazia(nova),
        nome,
        telefone,
        whatsapp: telefone,
        pipeline: 'Novo Lead',
        status: 'Novo Lead',
        origem: 'Atendimento',
        responsavel: nomeUsuario,
      })
      setPainelAberto(true)
      setShowNovoContato(false)
      setNovoContato({ nome: '', telefone: '', whatsapp: '' })
    } catch (e) {
      console.error(e)
      alert('Erro ao criar contato. Verifique permissões do Firestore.')
    } finally {
      setCriandoContato(false)
    }
  }

  const mensagensFiltradas = useMemo(() => {
    if (!buscaConversa.trim()) return mensagens
    const q = buscaConversa.toLowerCase()
    return mensagens.filter((m) => m.texto.toLowerCase().includes(q) || (m.nomeArquivo || '').toLowerCase().includes(q))
  }, [mensagens, buscaConversa])

  const conversasFiltradas = conversas.filter(
    (c) =>
      c.nome.toLowerCase().includes(busca.toLowerCase()) ||
      c.telefone.includes(busca) ||
      (c.tags || []).some((t) => t.toLowerCase().includes(busca.toLowerCase()))
  )

  const tagColor = (i: number) => TAG_COLORS[i % TAG_COLORS.length]

  if (!modalOpen) {
    return (
      <div className="h-[calc(100vh-5rem)] -m-8 flex items-center justify-center bg-slate-900">
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="px-8 py-4 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold text-lg flex items-center gap-3 transition-all transform hover:scale-105 shadow-2xl"
        >
          <MessageCircle className="w-7 h-7" />
          Abrir Nexus Atendimento
          <span className="text-xl">→</span>
        </button>
      </div>
    )
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-slate-900 flex flex-col">
        <div className="p-3 sm:p-4 bg-slate-800 border-b border-slate-700 flex items-center justify-between gap-2 shrink-0">
          <h1 className="text-lg sm:text-2xl font-bold text-white flex items-center gap-2 truncate">
            <MessageCircle className="w-6 h-6 sm:w-7 sm:h-7 text-green-500 shrink-0" />
            Nexus Atendimento
          </h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowNovoContato(true)}
              className="text-xs px-3 py-1.5 bg-code-action hover:brightness-110 text-white rounded-lg flex items-center gap-1 font-semibold"
            >
              <UserPlus className="w-3.5 h-3.5" /> Novo Contato
            </button>
            <button type="button" onClick={exportarClientes} className="text-xs px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded-lg flex items-center gap-1">
              <Download className="w-3.5 h-3.5" /> Exportar
            </button>
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white"
              title="Fechar"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Lista */}
          <div className="w-80 bg-slate-800 border-r border-slate-700 flex flex-col">
            <div className="p-3 border-b border-slate-700 space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar conversa, tag..."
                  className="w-full pl-10 pr-3 py-2 text-sm rounded-lg bg-slate-700 text-white placeholder-slate-400"
                />
              </div>
              <button
                type="button"
                onClick={() => setShowNovoContato(true)}
                className="w-full py-2 rounded-lg bg-code-action hover:brightness-110 text-white text-sm font-semibold flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> Criar novo contato
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {conversasFiltradas.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => setConversaSelecionada(conv)}
                  className={`p-3 border-b border-slate-700 cursor-pointer transition ${
                    conversaSelecionada?.id === conv.id ? 'bg-slate-700' : 'hover:bg-slate-700/50'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                      {(conv.nome || '?')[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1 gap-1">
                        <h3 className="font-semibold text-white text-sm truncate flex items-center gap-1">
                          {conv.fixada && <Pin className="w-3 h-3 text-amber-400" />}
                          {conv.favorita && <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />}
                          {conv.nome}
                        </h3>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => toggleFixar(conv, e)}
                            className="p-0.5 text-slate-400 hover:text-amber-400"
                            title={conv.fixada ? 'Desafixar' : 'Fixar'}
                          >
                            {conv.fixada ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                          </button>
                          {conv.naoLidas > 0 && (
                            <span className="bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                              {conv.naoLidas}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-slate-400 truncate">{conv.telefone}</p>
                      <p className="text-xs text-slate-400 truncate mt-1">{conv.ultimaMensagem}</p>
                      {(conv.tags || []).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {conv.tags!.slice(0, 3).map((t, i) => (
                            <span key={t} className={`text-[10px] px-1.5 py-0.5 rounded ${tagColor(i).bg} text-white`}>
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                      <p className="text-[10px] text-slate-500 mt-1">{conv.hora}</p>
                    </div>
                  </div>
                </div>
              ))}
              {conversasFiltradas.length === 0 && (
                <div className="text-center p-6 space-y-3">
                  <p className="text-slate-500 text-sm">Nenhuma conversa</p>
                  <button
                    type="button"
                    onClick={() => setShowNovoContato(true)}
                    className="px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white text-sm font-semibold inline-flex items-center gap-2"
                  >
                    <UserPlus className="w-4 h-4" /> Criar novo contato
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Chat */}
          <div className="flex-1 flex flex-col bg-slate-900">
            {!conversaSelecionada ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageCircle className="w-20 h-20 mx-auto mb-4 text-slate-600" />
                  <h3 className="text-xl font-bold mb-2 text-white">Selecione uma conversa</h3>
                  <p className="text-slate-400 mb-4">Escolha um cliente da lista ou crie um novo</p>
                  <button
                    type="button"
                    onClick={() => setShowNovoContato(true)}
                    className="px-5 py-2.5 rounded-xl bg-code-action hover:brightness-110 text-white font-semibold inline-flex items-center gap-2"
                  >
                    <UserPlus className="w-5 h-5" /> Criar novo contato
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="p-4 bg-slate-800 border-b border-slate-700 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white font-bold shrink-0">
                        {conversaSelecionada.nome[0]}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-white truncate">{conversaSelecionada.nome}</h3>
                        <p className="text-xs text-slate-400">{conversaSelecionada.telefone}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={toggleFavorito}
                      className={`p-2 rounded-lg ${formCliente.favorito ? 'text-yellow-400 bg-slate-700' : 'text-slate-400 hover:text-yellow-400'}`}
                      title="Favoritar cliente"
                    >
                      <Star className={`w-5 h-5 ${formCliente.favorito ? 'fill-yellow-400' : ''}`} />
                    </button>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input
                      value={buscaConversa}
                      onChange={(e) => setBuscaConversa(e.target.value)}
                      placeholder="Pesquisar nesta conversa..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-slate-700 text-white placeholder-slate-400"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {mensagensFiltradas.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.remetente === 'atendente' ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[70%] rounded-lg px-4 py-2 ${
                          msg.remetente === 'atendente' ? 'bg-green-500 text-white' : 'bg-slate-700 text-white'
                        }`}
                      >
                        {msg.imagem && (
                          <img
                            src={msg.imagem}
                            alt={msg.nomeArquivo}
                            className="rounded-lg mb-2 max-w-full h-auto cursor-pointer"
                            onClick={() => setImagemModal(msg.imagem!)}
                          />
                        )}
                        {msg.pdf && (
                          <a href={msg.pdf} download={msg.nomeArquivo || 'arquivo.pdf'} className="flex items-center gap-2 text-sm underline mb-1">
                            <FileText className="w-4 h-4" /> {msg.nomeArquivo || 'PDF'}
                          </a>
                        )}
                        {msg.audio && <audio controls src={msg.audio} className="max-w-full mb-1" />}
                        {msg.texto && <p className="text-sm whitespace-pre-wrap">{msg.texto}</p>}
                        <p className="text-[10px] opacity-70 mt-1">{msg.hora}</p>
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>

                <div className="p-4 bg-slate-800 border-t border-slate-700">
                  {imagemPreview && (
                    <div className="mb-2 relative inline-block">
                      <img src={imagemPreview} alt="Preview" className="max-h-32 rounded-lg border-2 border-green-500" />
                      <button onClick={() => setImagemPreview(null)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  {pdfPreview && (
                    <div className="mb-2 flex items-center gap-2 text-sm text-white bg-slate-700 px-3 py-2 rounded-lg">
                      <FileText className="w-4 h-4" /> {pdfPreview.name}
                      <button onClick={() => setPdfPreview(null)} className="ml-auto text-red-400"><X className="w-4 h-4" /></button>
                    </div>
                  )}
                  {audioPreview && (
                    <div className="mb-2 p-3 bg-slate-700 rounded-lg flex items-center gap-3">
                      <audio controls src={audioPreview} className="flex-1" />
                      <button onClick={() => setAudioPreview(null)} className="bg-red-500 text-white rounded-full p-1"><X className="w-4 h-4" /></button>
                    </div>
                  )}
                  {showEmojis && (
                    <div className="mb-2 p-3 bg-slate-700 rounded-lg max-h-40 overflow-y-auto">
                      <div className="grid grid-cols-10 gap-2">
                        {emojis.map((emoji, i) => (
                          <button key={i} type="button" onClick={() => setNovaMensagem((m) => m + emoji)} className="text-xl hover:scale-125">
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {showRapidas && (
                    <div className="mb-2 p-2 bg-slate-700 rounded-lg space-y-1 max-h-40 overflow-y-auto">
                      {RESPOSTAS_RAPIDAS.map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => { setNovaMensagem(r); setShowRapidas(false) }}
                          className="block w-full text-left text-xs text-slate-200 hover:bg-slate-600 px-2 py-1.5 rounded"
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  )}
                  {showProntas && (
                    <div className="mb-2 p-2 bg-slate-700 rounded-lg space-y-1 max-h-48 overflow-y-auto">
                      {MENSAGENS_PRONTAS.map((m) => (
                        <button
                          key={m.titulo}
                          type="button"
                          onClick={() => { setNovaMensagem(m.texto); setShowProntas(false) }}
                          className="block w-full text-left px-2 py-1.5 rounded hover:bg-slate-600"
                        >
                          <span className="text-xs font-semibold text-green-400">{m.titulo}</span>
                          <p className="text-[11px] text-slate-300 truncate">{m.texto}</p>
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                    <button type="button" onClick={() => { setShowEmojis(!showEmojis); setShowRapidas(false); setShowProntas(false) }} className="p-3 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600" title="Emojis">
                      <Smile className="w-5 h-5" />
                    </button>
                    <button type="button" onClick={() => { setShowRapidas(!showRapidas); setShowEmojis(false); setShowProntas(false) }} className="p-3 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600" title="Respostas rápidas">
                      <Zap className="w-5 h-5" />
                    </button>
                    <button type="button" onClick={() => { setShowProntas(!showProntas); setShowEmojis(false); setShowRapidas(false) }} className="p-3 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600" title="Mensagens prontas">
                      <BookOpen className="w-5 h-5" />
                    </button>
                    <label className="p-3 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 cursor-pointer" title="Anexar imagem/PDF">
                      <Paperclip className="w-5 h-5" />
                      <input type="file" accept="image/*,application/pdf" onChange={handleAnexo} className="hidden" />
                    </label>
                    {!audioPreview && (
                      <button
                        type="button"
                        onClick={gravandoAudio ? pararGravacao : iniciarGravacao}
                        className={`p-3 rounded-lg ${gravandoAudio ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                      >
                        {gravandoAudio ? <StopCircle className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                      </button>
                    )}
                    {audioPreview ? (
                      <button type="button" onClick={enviarAudio} className="flex-1 px-6 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center justify-center gap-2">
                        <Send className="w-5 h-5" /> Enviar Áudio
                      </button>
                    ) : (
                      <>
                        <input
                          type="text"
                          value={novaMensagem}
                          onChange={(e) => setNovaMensagem(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && enviarMensagem()}
                          placeholder="Digite sua mensagem..."
                          className="flex-1 min-w-[120px] px-4 py-3 rounded-lg bg-slate-700 text-white placeholder-slate-400 outline-none"
                          disabled={gravandoAudio}
                        />
                        <button
                          type="button"
                          onClick={enviarMensagem}
                          disabled={(!novaMensagem.trim() && !imagemPreview && !pdfPreview) || gravandoAudio}
                          className="px-6 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center gap-2 disabled:opacity-50"
                        >
                          <Send className="w-5 h-5" /> Enviar
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Painel cliente */}
          {conversaSelecionada && (
            <div className="relative flex">
              <div
                className="w-12 bg-green-500 flex flex-col items-center justify-center cursor-pointer hover:bg-green-600"
                onClick={() => setPainelAberto(!painelAberto)}
              >
                <User className="w-6 h-6 text-white mb-2" />
                {['C','L','I','E','N','T','E'].map((l, i) => (
                  <span key={i} className="text-white font-bold text-sm">{l}</span>
                ))}
                <div className="mt-4">{painelAberto ? <ChevronRight className="w-6 h-6 text-white" /> : <ChevronLeft className="w-6 h-6 text-white" />}</div>
              </div>
              <div className={`bg-slate-800 border-l border-slate-700 transition-all duration-300 h-full overflow-y-auto ${painelAberto ? 'w-96' : 'w-0 overflow-hidden'}`}>
                <div className="p-6 space-y-3 w-96">
                  <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2"><User className="w-5 h-5 text-blue-500" /> Dados do Cliente</h3>
                    <button type="button" onClick={() => setPainelAberto(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
                  </div>

                  {([
                    ['Nome Completo *', 'nome', 'text'],
                    ['CPF', 'cpf', 'text'],
                    ['E-mail', 'email', 'email'],
                    ['Empresa', 'empresa', 'text'],
                    ['Telefone', 'telefone', 'tel'],
                    ['WhatsApp', 'whatsapp', 'tel'],
                  ] as const).map(([label, key, type]) => (
                    <div key={key}>
                      <label className="block text-xs font-semibold mb-1 text-slate-300">{label}</label>
                      <input
                        type={type}
                        value={(formCliente as any)[key]}
                        onChange={(e) => {
                          let v = e.target.value
                          if (key === 'cpf') v = maskCpf(v)
                          if (key === 'telefone' || key === 'whatsapp') v = maskPhone(v)
                          setFormCliente({ ...formCliente, [key]: v })
                        }}
                        placeholder={key === 'cpf' ? '000.000.000-00' : key === 'telefone' || key === 'whatsapp' ? '(11) 98765-4321' : undefined}
                        className="w-full px-3 py-2 text-sm rounded-lg bg-slate-700 text-white"
                      />
                    </div>
                  ))}

                  <div>
                    <label className="block text-xs font-semibold mb-1 text-slate-300">Pipeline atual</label>
                    <select
                      value={formCliente.pipeline}
                      onChange={(e) => setFormCliente({ ...formCliente, pipeline: e.target.value, status: e.target.value })}
                      className="w-full px-3 py-2 text-sm rounded-lg bg-slate-700 text-white"
                    >
                      {PIPELINE_ETAPAS.map((e) => <option key={e} value={e}>{e}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-slate-300">Responsável</label>
                    <input value={formCliente.responsavel} onChange={(e) => setFormCliente({ ...formCliente, responsavel: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg bg-slate-700 text-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-slate-300">Origem do lead</label>
                    <select value={formCliente.origem} onChange={(e) => setFormCliente({ ...formCliente, origem: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg bg-slate-700 text-white">
                      {['WhatsApp','SMS','Instagram','Facebook','Google','Indicação','Orgânico'].map((o) => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-slate-300">Modalidade</label>
                    <input value={formCliente.modalidade} onChange={(e) => setFormCliente({ ...formCliente, modalidade: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg bg-slate-700 text-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-slate-300">Score: {formCliente.score}</label>
                    <input type="range" min={0} max={100} value={formCliente.score} onChange={(e) => setFormCliente({ ...formCliente, score: Number(e.target.value) })} className="w-full" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-slate-300">Observações</label>
                    <textarea value={formCliente.observacoes} onChange={(e) => setFormCliente({ ...formCliente, observacoes: e.target.value })} rows={3} className="w-full px-3 py-2 text-sm rounded-lg bg-slate-700 text-white resize-none" />
                  </div>

                  <div className="border-t border-slate-700 pt-3">
                    <label className="block text-xs font-semibold mb-2 text-slate-300 flex items-center gap-1"><Tag className="w-3.5 h-3.5" /> Tags</label>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {formCliente.tags.map((t, i) => (
                        <span key={t} className={`text-xs px-2 py-0.5 rounded-full ${tagColor(i).bg} text-white flex items-center gap-1`}>
                          {t}
                          <button type="button" onClick={() => removeTag(t)}><X className="w-3 h-3" /></button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input value={novaTag} onChange={(e) => setNovaTag(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addTag()} placeholder="Nova tag" className="flex-1 px-2 py-1.5 text-xs rounded bg-slate-700 text-white" />
                      <button type="button" onClick={addTag} className="px-2 py-1.5 text-xs bg-blue-500 text-white rounded">Add</button>
                    </div>
                  </div>

                  <div className="border-t border-slate-700 pt-3">
                    <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2"><FileText className="w-4 h-4" /> Documentos</h4>
                    <label className="block cursor-pointer p-3 rounded-lg bg-slate-700/50 border border-slate-600 text-center text-sm text-slate-300">
                      <Paperclip className="w-4 h-4 inline mr-1" /> Adicionar (PDF/JPG)
                      <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (!file || file.size > 5 * 1024 * 1024) return
                        const reader = new FileReader()
                        reader.onload = () => setDocumentos((p) => [...p, { nome: file.name, tipo: file.type, tamanho: file.size, dataUrl: reader.result as string }])
                        reader.readAsDataURL(file)
                        e.target.value = ''
                      }} />
                    </label>
                    {documentos.map((docItem, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs text-slate-300 mt-1 p-2 bg-slate-700/30 rounded">
                        <span className="truncate">{docItem.nome}</span>
                        <button type="button" onClick={() => setDocumentos((p) => p.filter((_, i) => i !== idx))} className="text-red-400"><X className="w-3 h-3" /></button>
                      </div>
                    ))}
                  </div>

                  {salvoMsg && <p className="text-xs text-center text-teal-400 font-semibold">{salvoMsg}</p>}
                  <button type="button" onClick={salvarCliente} className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold flex items-center justify-center gap-2">
                    <Save className="w-4 h-4" /> Salvar Cliente
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showNovoContato && (
        <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4" onClick={() => !criandoContato && setShowNovoContato(false)}>
          <div
            className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-code-action" /> Novo Contato
              </h2>
              <button type="button" onClick={() => setShowNovoContato(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-slate-400">
              Cria a conversa e abre a ficha do cliente (igual ao Nexus Interno).
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Nome Completo *</label>
                <input
                  value={novoContato.nome}
                  onChange={(e) => setNovoContato({ ...novoContato, nome: e.target.value })}
                  placeholder="Ex: João Silva"
                  className="w-full px-3 py-2.5 rounded-lg bg-slate-700 text-white border border-slate-600 focus:border-code-action outline-none"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Telefone *</label>
                <input
                  value={novoContato.telefone}
                  onChange={(e) => {
                    const v = maskPhone(e.target.value)
                    setNovoContato({ ...novoContato, telefone: v, whatsapp: v })
                  }}
                  placeholder="(14) 99610-7544"
                  inputMode="tel"
                  className="w-full px-3 py-2.5 rounded-lg bg-slate-700 text-white border border-slate-600 focus:border-code-action outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">WhatsApp</label>
                <input
                  value={novoContato.whatsapp}
                  onChange={(e) => setNovoContato({ ...novoContato, whatsapp: maskPhone(e.target.value) })}
                  placeholder="(14) 99610-7544"
                  inputMode="tel"
                  className="w-full px-3 py-2.5 rounded-lg bg-slate-700 text-white border border-slate-600 focus:border-code-action outline-none"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNovoContato(false)}
                disabled={criandoContato}
                className="flex-1 py-2.5 rounded-lg bg-slate-600 hover:bg-slate-500 text-white font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={criarNovoContato}
                disabled={criandoContato}
                className="flex-1 py-2.5 rounded-lg bg-code-action hover:brightness-110 text-white font-semibold disabled:opacity-60"
              >
                {criandoContato ? 'Criando…' : 'Criar e abrir ficha'}
              </button>
            </div>
          </div>
        </div>
      )}

      {imagemModal && (
        <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4" onClick={() => setImagemModal(null)}>
          <img src={imagemModal} alt="Visualização" className="max-w-full max-h-full rounded-lg" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </>
  )
}

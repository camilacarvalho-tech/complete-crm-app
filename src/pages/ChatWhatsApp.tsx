import { useState, useEffect, useRef } from 'react'
import { 
  MessageCircle, Send, Phone, User, FileText, X, Save, CheckCircle, 
  Paperclip, Edit2, Clock, Check, CheckCheck, MoreVertical, UserPlus,
  ArrowRight, AlertCircle, Users, Search, Filter, RefreshCw
} from 'lucide-react'
import { 
  collection, query, onSnapshot, addDoc, updateDoc, doc, 
  serverTimestamp, orderBy, where, getDocs, getDoc, setDoc 
} from 'firebase/firestore'
import { db } from '../firebase'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'

// ========== INTERFACES ==========
interface Conversa {
  id: string
  numeroWhatsApp: string
  nomeCliente: string
  cpfCliente: string
  emailCliente?: string
  status: 'nao_lida' | 'lida' | 'aguardando' | 'finalizada' | 'fila'
  atendente?: string
  ultimaMensagem?: string
  timestampUltimaMensagem?: any
  naoLidas: number
  prioridade?: 'normal' | 'urgente' | 'vip'
  criadoEm: any
  atualizadoEm: any
}

interface Mensagem {
  id: string
  texto: string
  remetente: 'cliente' | 'atendente'
  timestamp: any
  lida: boolean
  editada: boolean
  historicoEdicoes?: Array<{ texto: string, editadoEm: any }>
}

interface Cliente {
  id: string
  nome: string
  cpf: string
  telefone: string
  email?: string
  whatsapp?: string
  status: string
  modalidade?: string
  atendente?: string
  observacoes?: string
}

// ========== COMPONENTE PRINCIPAL ==========
export default function ChatWhatsApp() {
  const { user, empresa } = useAuth()
  const { darkMode } = useTheme()
  
  // Estados principais
  const [conversas, setConversas] = useState<Conversa[]>([])
  const [conversasFila, setConversasFila] = useState<Conversa[]>([])
  const [conversaSelecionada, setConversaSelecionada] = useState<Conversa | null>(null)
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [novaMensagem, setNovaMensagem] = useState('')
  const [loading, setLoading] = useState(false)
  
  // Estados de modais
  const [modalNovaConversa, setModalNovaConversa] = useState(false)
  const [modalEditarMensagem, setModalEditarMensagem] = useState(false)
  const [mensagemEditando, setMensagemEditando] = useState<Mensagem | null>(null)
  const [textoEditado, setTextoEditado] = useState('')
  const [modalEditarCliente, setModalEditarCliente] = useState(false)
  
  // Dados do cliente
  const [clienteInfo, setClienteInfo] = useState<Cliente | null>(null)
  const [formCliente, setFormCliente] = useState({
    nome: '',
    cpf: '',
    email: '',
    telefone: '',
    status: 'Lead',
    modalidade: '',
    observacoes: ''
  })
  
  // Filtros
  const [filtroStatus, setFiltroStatus] = useState<string>('todas')
  const [busca, setBusca] = useState('')
  
  const chatEndRef = useRef<HTMLDivElement>(null)
  const empresaId = empresa?.id || localStorage.getItem('empresaId') || 'default'
  const userId = user?.uid || 'default'
  const nomeUsuario = user?.displayName || localStorage.getItem('userName') || 'Atendente'
  const perfilUsuario = user?.perfil || localStorage.getItem('userPerfil') || 'Funcionário'

  // ========== CARREGAR CONVERSAS ATIVAS ==========
  useEffect(() => {
    const q = query(
      collection(db, 'empresas', empresaId, 'conversasWhatsApp'),
      where('status', 'in', ['nao_lida', 'lida', 'aguardando']),
      orderBy('atualizadoEm', 'desc')
    )
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const conversasData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      })) as Conversa[]
      
      // Filtrar por atendente se funcionário
      if (perfilUsuario === 'Funcionário') {
        setConversas(conversasData.filter(c => c.atendente === nomeUsuario))
      } else {
        setConversas(conversasData)
      }
    })
    
    return () => unsubscribe()
  }, [empresaId, perfilUsuario, nomeUsuario])

  // ========== CARREGAR FILA DE ATENDIMENTO ==========
  useEffect(() => {
    const q = query(
      collection(db, 'empresas', empresaId, 'conversasWhatsApp'),
      where('status', '==', 'fila'),
      orderBy('criadoEm', 'asc')
    )
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const filaData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      })) as Conversa[]
      setConversasFila(filaData)
    })
    
    return () => unsubscribe()
  }, [empresaId])

  // ========== CARREGAR MENSAGENS DA CONVERSA SELECIONADA ==========
  useEffect(() => {
    if (!conversaSelecionada) {
      setMensagens([])
      setClienteInfo(null)
      return
    }
    
    // Marcar como lida ao abrir
    if (conversaSelecionada.status === 'nao_lida') {
      marcarComoLida(conversaSelecionada.id)
    }
    
    // Carregar mensagens
    const q = query(
      collection(db, 'empresas', empresaId, 'conversasWhatsApp', conversaSelecionada.id, 'mensagens'),
      orderBy('timestamp', 'asc')
    )
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const mensagensData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        editada: doc.data().editada || false,
        historicoEdicoes: doc.data().historicoEdicoes || []
      })) as Mensagem[]
      setMensagens(mensagensData)
      
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    })
    
    // Buscar dados do cliente
    carregarDadosCliente()
    
    return () => unsubscribe()
  }, [conversaSelecionada, empresaId])

  // ========== BUSCAR DADOS DO CLIENTE NO CADASTRO ==========
  const carregarDadosCliente = async () => {
    if (!conversaSelecionada) return
    
    try {
      const limpo = conversaSelecionada.numeroWhatsApp.replace(/\D/g, '')
      const q = query(
        collection(db, 'empresas', empresaId, 'clientes'),
        where('whatsapp', '==', limpo)
      )
      const snapshot = await getDocs(q)
      
      if (!snapshot.empty) {
        const clienteDoc = snapshot.docs[0]
        const cliente = {
          id: clienteDoc.id,
          ...clienteDoc.data()
        } as Cliente
        
        setClienteInfo(cliente)
        setFormCliente({
          nome: cliente.nome || conversaSelecionada.nomeCliente || '',
          cpf: cliente.cpf || conversaSelecionada.cpfCliente || '',
          email: cliente.email || conversaSelecionada.emailCliente || '',
          telefone: cliente.telefone || conversaSelecionada.numeroWhatsApp || '',
          status: cliente.status || 'Lead',
          modalidade: cliente.modalidade || '',
          observacoes: cliente.observacoes || ''
        })
      } else {
        // Cliente não existe no cadastro ainda
        setClienteInfo(null)
        setFormCliente({
          nome: conversaSelecionada.nomeCliente || '',
          cpf: conversaSelecionada.cpfCliente || '',
          email: conversaSelecionada.emailCliente || '',
          telefone: conversaSelecionada.numeroWhatsApp || '',
          status: 'Lead',
          modalidade: '',
          observacoes: ''
        })
      }
    } catch (error) {
      console.error('Erro ao carregar cliente:', error)
    }
  }

  // ========== PEGAR CLIENTE DA FILA ==========
  const pegarClienteDaFila = async (conversaId: string) => {
    try {
      await updateDoc(doc(db, 'empresas', empresaId, 'conversasWhatsApp', conversaId), {
        status: 'nao_lida',
        atendente: nomeUsuario,
        atualizadoEm: serverTimestamp()
      })
      
      alert('✅ Cliente atribuído a você!')
    } catch (error) {
      console.error('Erro ao pegar cliente:', error)
      alert('❌ Erro ao pegar cliente')
    }
  }

  // ========== MARCAR COMO LIDA / NÃO LIDA ==========
  const marcarComoLida = async (conversaId: string) => {
    try {
      await updateDoc(doc(db, 'empresas', empresaId, 'conversasWhatsApp', conversaId), {
        status: 'lida',
        naoLidas: 0,
        atualizadoEm: serverTimestamp()
      })
    } catch (error) {
      console.error('Erro ao marcar como lida:', error)
    }
  }

  const marcarComoNaoLida = async (conversaId: string) => {
    try {
      await updateDoc(doc(db, 'empresas', empresaId, 'conversasWhatsApp', conversaId), {
        status: 'nao_lida',
        naoLidas: 1,
        atualizadoEm: serverTimestamp()
      })
      alert('✅ Marcada como não lida!')
    } catch (error) {
      console.error('Erro ao marcar como não lida:', error)
    }
  }

  // ========== ENVIAR MENSAGEM ==========
  const enviarMensagem = async () => {
    if (!novaMensagem.trim() || !conversaSelecionada) return
    
    try {
      await addDoc(
        collection(db, 'empresas', empresaId, 'conversasWhatsApp', conversaSelecionada.id, 'mensagens'),
        {
          texto: novaMensagem.trim(),
          remetente: 'atendente',
          timestamp: serverTimestamp(),
          lida: true,
          editada: false
        }
      )
      
      await updateDoc(doc(db, 'empresas', empresaId, 'conversasWhatsApp', conversaSelecionada.id), {
        ultimaMensagem: novaMensagem.trim(),
        timestampUltimaMensagem: serverTimestamp(),
        atualizadoEm: serverTimestamp()
      })
      
      setNovaMensagem('')
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error)
      alert('❌ Erro ao enviar mensagem')
    }
  }

  // ========== EDITAR MENSAGEM ==========
  const abrirEdicaoMensagem = (mensagem: Mensagem) => {
    if (mensagem.remetente !== 'atendente') return
    setMensagemEditando(mensagem)
    setTextoEditado(mensagem.texto)
    setModalEditarMensagem(true)
  }

  const salvarEdicaoMensagem = async () => {
    if (!mensagemEditando || !conversaSelecionada || !textoEditado.trim()) return
    
    try {
      const historicoAtual = mensagemEditando.historicoEdicoes || []
      const novoHistorico = [
        ...historicoAtual,
        {
          texto: mensagemEditando.texto,
          editadoEm: serverTimestamp()
        }
      ]
      
      await updateDoc(
        doc(db, 'empresas', empresaId, 'conversasWhatsApp', conversaSelecionada.id, 'mensagens', mensagemEditando.id),
        {
          texto: textoEditado.trim(),
          editada: true,
          historicoEdicoes: novoHistorico
        }
      )
      
      setModalEditarMensagem(false)
      setMensagemEditando(null)
      setTextoEditado('')
      alert('✅ Mensagem editada com sucesso!')
    } catch (error) {
      console.error('Erro ao editar mensagem:', error)
      alert('❌ Erro ao editar mensagem')
    }
  }

  // ========== SALVAR / ATUALIZAR CLIENTE ==========
  const salvarCliente = async () => {
    if (!formCliente.nome.trim() || !conversaSelecionada) {
      alert('⚠️ Preencha pelo menos o nome do cliente')
      return
    }
    
    setLoading(true)
    try {
      const limpo = conversaSelecionada.numeroWhatsApp.replace(/\D/g, '')
      
      if (clienteInfo) {
        // Atualizar cliente existente
        await updateDoc(doc(db, 'empresas', empresaId, 'clientes', clienteInfo.id), {
          nome: formCliente.nome.trim(),
          cpf: formCliente.cpf.trim(),
          email: formCliente.email.trim(),
          telefone: formCliente.telefone.trim(),
          whatsapp: limpo,
          status: formCliente.status,
          modalidade: formCliente.modalidade,
          observacoes: formCliente.observacoes.trim(),
          atualizadoEm: serverTimestamp()
        })
      } else {
        // Criar novo cliente
        await addDoc(collection(db, 'empresas', empresaId, 'clientes'), {
          nome: formCliente.nome.trim(),
          cpf: formCliente.cpf.trim(),
          email: formCliente.email.trim(),
          telefone: formCliente.telefone.trim(),
          whatsapp: limpo,
          status: formCliente.status,
          modalidade: formCliente.modalidade,
          observacoes: formCliente.observacoes.trim(),
          atendente: nomeUsuario,
          origem: 'WhatsApp',
          criadoEm: serverTimestamp()
        })
      }
      
      // Atualizar dados na conversa também
      await updateDoc(doc(db, 'empresas', empresaId, 'conversasWhatsApp', conversaSelecionada.id), {
        nomeCliente: formCliente.nome.trim(),
        cpfCliente: formCliente.cpf.trim(),
        emailCliente: formCliente.email.trim(),
        atualizadoEm: serverTimestamp()
      })
      
      setModalEditarCliente(false)
      await carregarDadosCliente() // Recarregar dados
      alert('✅ Cliente salvo com sucesso!')
    } catch (error) {
      console.error('Erro ao salvar cliente:', error)
      alert('❌ Erro ao salvar cliente')
    } finally {
      setLoading(false)
    }
  }

  // ========== FINALIZAR CONVERSA ==========
  const finalizarConversa = async () => {
    if (!conversaSelecionada) return
    
    if (!formCliente.nome.trim()) {
      alert('⚠️ Preencha os dados do cliente antes de finalizar!')
      setModalEditarCliente(true)
      return
    }
    
    if (!window.confirm('Deseja finalizar esta conversa?')) return
    
    setLoading(true)
    try {
      // Salvar cliente primeiro
      await salvarCliente()
      
      // Marcar conversa como finalizada
      await updateDoc(doc(db, 'empresas', empresaId, 'conversasWhatsApp', conversaSelecionada.id), {
        status: 'finalizada',
        finalizadaEm: serverTimestamp()
      })
      
      setConversaSelecionada(null)
      alert('✅ Conversa finalizada!')
    } catch (error) {
      console.error('Erro ao finalizar:', error)
      alert('❌ Erro ao finalizar conversa')
    } finally {
      setLoading(false)
    }
  }

  // ========== TRANSFERIR ATENDENTE ==========
  const transferirAtendente = async (novoAtendente: string) => {
    if (!conversaSelecionada) return
    
    try {
      await updateDoc(doc(db, 'empresas', empresaId, 'conversasWhatsApp', conversaSelecionada.id), {
        atendente: novoAtendente,
        atualizadoEm: serverTimestamp()
      })
      
      alert(`✅ Conversa transferida para ${novoAtendente}!`)
      setConversaSelecionada(null)
    } catch (error) {
      console.error('Erro ao transferir:', error)
      alert('❌ Erro ao transferir')
    }
  }

  // ========== FORMATAÇÃO ==========
  const formatarNumero = (numero: string) => {
    const limpo = numero.replace(/\D/g, '')
    if (limpo.length === 11) {
      return `(${limpo.slice(0, 2)}) ${limpo.slice(2, 7)}-${limpo.slice(7)}`
    }
    if (limpo.length === 10) {
      return `(${limpo.slice(0, 2)}) ${limpo.slice(2, 6)}-${limpo.slice(6)}`
    }
    return numero
  }

  const formatarDataMensagem = (timestamp: any) => {
    if (!timestamp?.toDate) return ''
    
    const data = timestamp.toDate()
    const hoje = new Date()
    const ontem = new Date(hoje)
    ontem.setDate(ontem.getDate() - 1)
    
    const ehHoje = data.toDateString() === hoje.toDateString()
    const ehOntem = data.toDateString() === ontem.toDateString()
    
    const hora = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    
    if (ehHoje) return `Hoje ${hora}`
    if (ehOntem) return `Ontem ${hora}`
    
    return `${data.toLocaleDateString('pt-BR')} ${hora}`
  }

  const formatarTempoRelativo = (timestamp: any) => {
    if (!timestamp?.toDate) return ''
    
    const data = timestamp.toDate()
    const agora = new Date()
    const diff = Math.floor((agora.getTime() - data.getTime()) / 1000) // segundos
    
    if (diff < 60) return 'Agora'
    if (diff < 3600) return `Há ${Math.floor(diff / 60)} min`
    if (diff < 86400) return `Há ${Math.floor(diff / 3600)}h`
    if (diff < 604800) return `Há ${Math.floor(diff / 86400)} dias`
    
    return data.toLocaleDateString('pt-BR')
  }

  // ========== ÍCONES DE STATUS ==========
  const getStatusIcon = (status: string, naoLidas: number) => {
    if (naoLidas > 0) return <span className="text-xl">🟢</span>
    if (status === 'lida') return <span className="text-xl">⚪</span>
    if (status === 'aguardando') return <span className="text-xl">⏰</span>
    if (status === 'finalizada') return <span className="text-xl">✅</span>
    return <span className="text-xl">🟢</span>
  }

  // ========== FILTRAR CONVERSAS ==========
  const conversasFiltradas = conversas.filter(conv => {
    const matchBusca = busca === '' || 
      conv.nomeCliente?.toLowerCase().includes(busca.toLowerCase()) ||
      conv.numeroWhatsApp.includes(busca)
    
    const matchStatus = filtroStatus === 'todas' || conv.status === filtroStatus
    
    return matchBusca && matchStatus
  })

  // ========== RENDER ==========
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className={`p-4 border-b flex items-center justify-between ${
        darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
      }`}>
        <div>
          <h1 className={`text-2xl font-bold flex items-center gap-2 ${
            darkMode ? 'text-white' : 'text-slate-800'
          }`}>
            <MessageCircle className="w-7 h-7 text-green-500" />
            Chat Center
          </h1>
          <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Conversas WhatsApp sincronizadas
          </p>
        </div>
        
        {conversasFila.length > 0 && (
          <div className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg">
            <Users className="w-5 h-5" />
            <span className="font-bold">{conversasFila.length}</span>
            <span className="text-sm">na fila</span>
          </div>
        )}
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* SIDEBAR ESQUERDA - LISTA DE CONVERSAS */}
        <div className={`w-80 border-r flex flex-col ${
          darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
        }`}>
          {/* Busca e Filtros */}
          <div className="p-3 border-b border-slate-700 space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar conversa..."
                className={`w-full pl-10 pr-3 py-2 text-sm rounded-lg ${
                  darkMode 
                    ? 'bg-slate-700 text-white placeholder-slate-400' 
                    : 'bg-slate-100 text-slate-800'
                }`}
              />
            </div>
            
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className={`w-full px-3 py-2 text-sm rounded-lg ${
                darkMode 
                  ? 'bg-slate-700 text-white' 
                  : 'bg-slate-100 text-slate-800'
              }`}
            >
              <option value="todas">Todas</option>
              <option value="nao_lida">🟢 Não lidas</option>
              <option value="lida">⚪ Lidas</option>
              <option value="aguardando">⏰ Aguardando</option>
            </select>
          </div>

          {/* FILA DE ATENDIMENTO */}
          {conversasFila.length > 0 && (
            <div className="p-3 bg-orange-500/10 border-b border-orange-500">
              <h3 className="text-sm font-bold text-orange-600 dark:text-orange-400 mb-2 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Fila de Atendimento ({conversasFila.length})
              </h3>
              <div className="space-y-2">
                {conversasFila.map(conv => (
                  <div
                    key={conv.id}
                    className={`p-2 rounded-lg flex items-center justify-between ${
                      darkMode ? 'bg-slate-700' : 'bg-white'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate ${
                        darkMode ? 'text-white' : 'text-slate-800'
                      }`}>
                        {conv.nomeCliente || 'Sem nome'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatarNumero(conv.numeroWhatsApp)}
                      </p>
                    </div>
                    <button
                      onClick={() => pegarClienteDaFila(conv.id)}
                      className="px-3 py-1 bg-orange-500 text-white text-xs rounded-lg hover:bg-orange-600 transition flex items-center gap-1"
                    >
                      <UserPlus className="w-3 h-3" />
                      Pegar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* LISTA DE CONVERSAS */}
          <div className="flex-1 overflow-y-auto">
            {conversasFiltradas.length === 0 ? (
              <div className="p-6 text-center">
                <MessageCircle className={`w-12 h-12 mx-auto mb-3 ${
                  darkMode ? 'text-slate-600' : 'text-slate-300'
                }`} />
                <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Nenhuma conversa encontrada
                </p>
              </div>
            ) : (
              conversasFiltradas.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => setConversaSelecionada(conv)}
                  className={`p-3 border-b cursor-pointer transition ${
                    conversaSelecionada?.id === conv.id
                      ? darkMode
                        ? 'bg-slate-700 border-slate-600'
                        : 'bg-blue-50 border-blue-200'
                      : darkMode
                      ? 'hover:bg-slate-700/50 border-slate-700'
                      : 'hover:bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {/* Status Icon */}
                    <div className="mt-0.5">
                      {getStatusIcon(conv.status, conv.naoLidas)}
                    </div>
                    
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className={`font-semibold truncate text-sm ${
                          conv.naoLidas > 0 ? 'font-bold' : ''
                        } ${
                          darkMode ? 'text-white' : 'text-slate-800'
                        }`}>
                          {conv.nomeCliente || 'Sem nome'}
                        </h3>
                        {conv.prioridade === 'vip' && <span className="text-yellow-500">⭐</span>}
                        {conv.prioridade === 'urgente' && <span className="text-red-500">🔥</span>}
                      </div>
                      
                      <p className={`text-xs truncate ${
                        darkMode ? 'text-slate-400' : 'text-slate-500'
                      }`}>
                        {formatarNumero(conv.numeroWhatsApp)}
                      </p>
                      
                      {conv.atendente && (
                        <p className={`text-xs mt-1 ${
                          darkMode ? 'text-slate-500' : 'text-slate-400'
                        }`}>
                          Atendente: {conv.atendente}
                        </p>
                      )}
                      
                      {conv.ultimaMensagem && (
                        <p className={`text-xs truncate mt-1 ${
                          conv.naoLidas > 0 ? 'font-semibold' : ''
                        } ${
                          darkMode ? 'text-slate-400' : 'text-slate-600'
                        }`}>
                          {conv.ultimaMensagem}
                        </p>
                      )}
                      
                      {conv.timestampUltimaMensagem && (
                        <p className="text-[10px] text-slate-500 mt-1">
                          {formatarTempoRelativo(conv.timestampUltimaMensagem)}
                        </p>
                      )}
                    </div>
                    
                    {/* Badge não lidas */}
                    {conv.naoLidas > 0 && (
                      <div className="bg-green-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                        {conv.naoLidas}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        {/* ÁREA CENTRAL - CONVERSA */}
        <div className="flex-1 flex flex-col">
          {!conversaSelecionada ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className={`w-20 h-20 mx-auto mb-4 ${
                  darkMode ? 'text-slate-600' : 'text-slate-300'
                }`} />
                <h3 className={`text-xl font-bold mb-2 ${
                  darkMode ? 'text-white' : 'text-slate-800'
                }`}>
                  Selecione uma conversa
                </h3>
                <p className={darkMode ? 'text-slate-400' : 'text-slate-500'}>
                  Escolha uma conversa da lista ou pegue um cliente da fila
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Header da Conversa */}
              <div className={`p-4 border-b flex items-center justify-between ${
                darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
              }`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white font-bold">
                    {conversaSelecionada.nomeCliente?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <h3 className={`font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                      {conversaSelecionada.nomeCliente || 'Sem nome'}
                    </h3>
                    <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      {formatarNumero(conversaSelecionada.numeroWhatsApp)}
                    </p>
                  </div>
                </div>

                {/* Ações Rápidas */}
                <div className="flex gap-2">
                  <button
                    onClick={() => marcarComoNaoLida(conversaSelecionada.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      darkMode 
                        ? 'bg-slate-700 text-white hover:bg-slate-600' 
                        : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    }`}
                    title="Marcar como não lida"
                  >
                    Não Lida
                  </button>
                  
                  <button
                    onClick={finalizarConversa}
                    disabled={loading}
                    className="px-4 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition text-xs font-semibold disabled:opacity-50 flex items-center gap-1"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Finalizar
                  </button>
                </div>
              </div>

              {/* Área de Mensagens */}
              <div className={`flex-1 overflow-y-auto p-4 space-y-3 ${
                darkMode ? 'bg-slate-900' : 'bg-slate-50'
              }`}>
                {mensagens.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageCircle className={`w-12 h-12 mx-auto mb-3 ${
                      darkMode ? 'text-slate-700' : 'text-slate-300'
                    }`} />
                    <p className={darkMode ? 'text-slate-500' : 'text-slate-400'}>
                      Nenhuma mensagem ainda
                    </p>
                  </div>
                ) : (
                  mensagens.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.remetente === 'atendente' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`group relative max-w-[70%] rounded-lg px-4 py-2 ${
                          msg.remetente === 'atendente'
                            ? 'bg-green-500 text-white'
                            : darkMode
                            ? 'bg-slate-700 text-white'
                            : 'bg-white text-slate-800 border border-slate-200'
                        }`}
                      >
                        {/* Botão Editar (só aparece no hover) */}
                        {msg.remetente === 'atendente' && (
                          <button
                            onClick={() => abrirEdicaoMensagem(msg)}
                            className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition bg-blue-500 text-white p-1.5 rounded-full shadow-lg"
                            title="Editar mensagem"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        )}
                        
                        <p className="text-sm break-words whitespace-pre-wrap">{msg.texto}</p>
                        
                        <div className="flex items-center justify-end gap-1 mt-1">
                          <p className="text-[10px] opacity-70">
                            {formatarDataMensagem(msg.timestamp)}
                          </p>
                          
                          {msg.editada && (
                            <span className="text-[10px] opacity-70 italic ml-1" title="Mensagem editada">
                              (editada)
                            </span>
                          )}
                          
                          {msg.remetente === 'atendente' && msg.lida && (
                            <CheckCheck className="w-3 h-3 text-blue-300" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input de Mensagem */}
              <div className={`p-4 border-t ${
                darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
              }`}>
                <div className="flex gap-2">
                  <button className={`p-2.5 rounded-lg transition ${
                    darkMode 
                      ? 'hover:bg-slate-700 text-slate-400' 
                      : 'hover:bg-slate-100 text-slate-500'
                  }`}>
                    <Paperclip className="w-5 h-5" />
                  </button>
                  
                  <input
                    type="text"
                    value={novaMensagem}
                    onChange={(e) => setNovaMensagem(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && enviarMensagem()}
                    placeholder="Digite uma mensagem..."
                    className={`flex-1 px-4 py-3 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none ${
                      darkMode 
                        ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400 border'
                        : 'bg-white border border-slate-300 text-slate-800'
                    }`}
                  />
                  
                  <button
                    onClick={enviarMensagem}
                    className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition flex items-center gap-2"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
        {/* SIDEBAR DIREITA - DADOS DO CLIENTE */}
        {conversaSelecionada && (
          <div className={`w-80 border-l overflow-y-auto ${
            darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
          }`}>
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-blue-500 to-green-500 text-white sticky top-0 z-10">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <User className="w-5 h-5" />
                Informações do Cliente
              </h3>
              <p className="text-xs text-white/80 mt-1">
                {clienteInfo ? 'Cliente cadastrado' : 'Cliente não cadastrado ainda'}
              </p>
            </div>

            {/* Dados */}
            <div className="p-4 space-y-3">
              {/* Nome */}
              <div>
                <label className={`block text-xs font-semibold mb-1 ${
                  darkMode ? 'text-slate-300' : 'text-slate-700'
                }`}>
                  Nome *
                </label>
                <input
                  type="text"
                  value={formCliente.nome}
                  onChange={(e) => setFormCliente({ ...formCliente, nome: e.target.value })}
                  placeholder="Nome completo"
                  className={`w-full px-3 py-2 text-sm rounded-lg outline-none ${
                    darkMode 
                      ? 'bg-slate-700 text-white placeholder-slate-400' 
                      : 'bg-slate-100 text-slate-800'
                  }`}
                />
              </div>

              {/* CPF */}
              <div>
                <label className={`block text-xs font-semibold mb-1 ${
                  darkMode ? 'text-slate-300' : 'text-slate-700'
                }`}>
                  CPF
                </label>
                <input
                  type="text"
                  value={formCliente.cpf}
                  onChange={(e) => setFormCliente({ ...formCliente, cpf: e.target.value })}
                  placeholder="000.000.000-00"
                  className={`w-full px-3 py-2 text-sm rounded-lg outline-none ${
                    darkMode 
                      ? 'bg-slate-700 text-white placeholder-slate-400' 
                      : 'bg-slate-100 text-slate-800'
                  }`}
                />
              </div>

              {/* WhatsApp (readonly) */}
              <div>
                <label className={`block text-xs font-semibold mb-1 ${
                  darkMode ? 'text-slate-300' : 'text-slate-700'
                }`}>
                  WhatsApp
                </label>
                <input
                  type="text"
                  value={formatarNumero(conversaSelecionada.numeroWhatsApp)}
                  readOnly
                  className={`w-full px-3 py-2 text-sm rounded-lg outline-none ${
                    darkMode 
                      ? 'bg-slate-700/50 text-slate-400' 
                      : 'bg-slate-100 text-slate-600'
                  }`}
                />
              </div>

              {/* Email */}
              <div>
                <label className={`block text-xs font-semibold mb-1 ${
                  darkMode ? 'text-slate-300' : 'text-slate-700'
                }`}>
                  E-mail
                </label>
                <input
                  type="email"
                  value={formCliente.email}
                  onChange={(e) => setFormCliente({ ...formCliente, email: e.target.value })}
                  placeholder="email@exemplo.com"
                  className={`w-full px-3 py-2 text-sm rounded-lg outline-none ${
                    darkMode 
                      ? 'bg-slate-700 text-white placeholder-slate-400' 
                      : 'bg-slate-100 text-slate-800'
                  }`}
                />
              </div>

              {/* Status */}
              <div>
                <label className={`block text-xs font-semibold mb-1 ${
                  darkMode ? 'text-slate-300' : 'text-slate-700'
                }`}>
                  Status
                </label>
                <select
                  value={formCliente.status}
                  onChange={(e) => setFormCliente({ ...formCliente, status: e.target.value })}
                  className={`w-full px-3 py-2 text-sm rounded-lg outline-none ${
                    darkMode 
                      ? 'bg-slate-700 text-white' 
                      : 'bg-slate-100 text-slate-800'
                  }`}
                >
                  <option value="Lead">Lead</option>
                  <option value="Contato Feito">Contato Feito</option>
                  <option value="Qualificado">Qualificado</option>
                  <option value="Proposta Enviada">Proposta Enviada</option>
                  <option value="Negociação">Negociação</option>
                  <option value="Cliente">Cliente</option>
                  <option value="Perdido">Perdido</option>
                </select>
              </div>

              {/* Modalidade */}
              <div>
                <label className={`block text-xs font-semibold mb-1 ${
                  darkMode ? 'text-slate-300' : 'text-slate-700'
                }`}>
                  Modalidade/Nicho
                </label>
                <input
                  type="text"
                  value={formCliente.modalidade}
                  onChange={(e) => setFormCliente({ ...formCliente, modalidade: e.target.value })}
                  placeholder="Ex: INSS, Consulta, etc"
                  className={`w-full px-3 py-2 text-sm rounded-lg outline-none ${
                    darkMode 
                      ? 'bg-slate-700 text-white placeholder-slate-400' 
                      : 'bg-slate-100 text-slate-800'
                  }`}
                />
              </div>

              {/* Observações */}
              <div>
                <label className={`block text-xs font-semibold mb-1 ${
                  darkMode ? 'text-slate-300' : 'text-slate-700'
                }`}>
                  Observações
                </label>
                <textarea
                  value={formCliente.observacoes}
                  onChange={(e) => setFormCliente({ ...formCliente, observacoes: e.target.value })}
                  placeholder="Anotações sobre o cliente..."
                  rows={4}
                  className={`w-full px-3 py-2 text-sm rounded-lg outline-none resize-none ${
                    darkMode 
                      ? 'bg-slate-700 text-white placeholder-slate-400' 
                      : 'bg-slate-100 text-slate-800'
                  }`}
                />
              </div>

              {/* Botão Salvar */}
              <button
                onClick={salvarCliente}
                disabled={loading}
                className="w-full py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                {clienteInfo ? 'Atualizar Cliente' : 'Salvar Cliente'}
              </button>

              {/* Info Atendente */}
              {conversaSelecionada.atendente && (
                <div className={`p-3 rounded-lg border ${
                  darkMode 
                    ? 'bg-slate-700/50 border-slate-600' 
                    : 'bg-slate-50 border-slate-200'
                }`}>
                  <p className={`text-xs font-semibold mb-1 ${
                    darkMode ? 'text-slate-300' : 'text-slate-700'
                  }`}>
                    Atendente Responsável
                  </p>
                  <p className={`text-sm font-bold ${
                    darkMode ? 'text-white' : 'text-slate-800'
                  }`}>
                    {conversaSelecionada.atendente}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* MODAL EDITAR MENSAGEM */}
      {modalEditarMensagem && mensagemEditando && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`max-w-2xl w-full rounded-xl shadow-2xl ${
            darkMode ? 'bg-slate-800' : 'bg-white'
          }`}>
            {/* Header */}
            <div className="p-6 border-b border-slate-700">
              <div className="flex items-center justify-between">
                <h3 className={`text-xl font-bold flex items-center gap-2 ${
                  darkMode ? 'text-white' : 'text-slate-800'
                }`}>
                  <Edit2 className="w-6 h-6 text-blue-500" />
                  Editar Mensagem
                </h3>
                <button
                  onClick={() => {
                    setModalEditarMensagem(false)
                    setMensagemEditando(null)
                    setTextoEditado('')
                  }}
                  className="p-2 hover:bg-slate-700 rounded-lg transition"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              {/* Texto Original */}
              <div>
                <label className={`block text-sm font-semibold mb-2 ${
                  darkMode ? 'text-slate-300' : 'text-slate-700'
                }`}>
                  Texto Original
                </label>
                <div className={`p-3 rounded-lg text-sm ${
                  darkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-600'
                }`}>
                  {mensagemEditando.texto}
                </div>
              </div>

              {/* Novo Texto */}
              <div>
                <label className={`block text-sm font-semibold mb-2 ${
                  darkMode ? 'text-slate-300' : 'text-slate-700'
                }`}>
                  Novo Texto
                </label>
                <textarea
                  value={textoEditado}
                  onChange={(e) => setTextoEditado(e.target.value)}
                  rows={5}
                  className={`w-full px-4 py-3 rounded-lg outline-none resize-none ${
                    darkMode 
                      ? 'bg-slate-700 text-white placeholder-slate-400' 
                      : 'bg-slate-100 text-slate-800'
                  }`}
                  placeholder="Digite o novo texto da mensagem..."
                />
              </div>

              {/* Aviso */}
              <div className={`p-3 rounded-lg flex items-start gap-2 ${
                darkMode ? 'bg-yellow-900/20 border border-yellow-700' : 'bg-yellow-50 border border-yellow-200'
              }`}>
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className={`text-sm font-semibold ${
                    darkMode ? 'text-yellow-400' : 'text-yellow-800'
                  }`}>
                    A mensagem original será salva no histórico
                  </p>
                  <p className={`text-xs mt-1 ${
                    darkMode ? 'text-yellow-500' : 'text-yellow-700'
                  }`}>
                    Aparecerá como "editada" na conversa
                  </p>
                </div>
              </div>

              {/* Histórico de Edições */}
              {mensagemEditando.historicoEdicoes && mensagemEditando.historicoEdicoes.length > 0 && (
                <div>
                  <label className={`block text-sm font-semibold mb-2 ${
                    darkMode ? 'text-slate-300' : 'text-slate-700'
                  }`}>
                    Histórico de Edições ({mensagemEditando.historicoEdicoes.length})
                  </label>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {mensagemEditando.historicoEdicoes.map((edicao, index) => (
                      <div
                        key={index}
                        className={`p-2 rounded-lg text-xs ${
                          darkMode ? 'bg-slate-700' : 'bg-slate-100'
                        }`}
                      >
                        <p className={darkMode ? 'text-white' : 'text-slate-800'}>
                          {edicao.texto}
                        </p>
                        <p className="text-slate-500 text-[10px] mt-1">
                          Editada em: {formatarDataMensagem(edicao.editadoEm)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-700 flex justify-end gap-3">
              <button
                onClick={() => {
                  setModalEditarMensagem(false)
                  setMensagemEditando(null)
                  setTextoEditado('')
                }}
                className={`px-6 py-2.5 rounded-lg font-semibold transition ${
                  darkMode 
                    ? 'bg-slate-700 text-white hover:bg-slate-600' 
                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                }`}
              >
                Cancelar
              </button>
              <button
                onClick={salvarEdicaoMensagem}
                disabled={!textoEditado.trim()}
                className="px-6 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Salvar Edição
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

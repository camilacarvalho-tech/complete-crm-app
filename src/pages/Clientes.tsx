import { useState, useEffect, useRef } from 'react'
import { Users, Plus, Search, Download, Phone, Mail, Edit, Trash2, X, Send, Paperclip, UserCheck, MessageCircle } from 'lucide-react'
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, orderBy, where, getDocs } from 'firebase/firestore'
import { db } from '../firebase'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

interface Cliente {
  id: string
  nome: string
  cpf?: string
  rg?: string
  cnh?: string
  nascimento?: string
  whatsapp?: string
  telefone?: string
  email?: string
  cep?: string
  endereco?: string
  numero?: string
  complemento?: string
  bairro?: string
  cidade?: string
  estado?: string
  status: string
  modalidade?: string
  origem?: string
  atendente?: string
  observacoes?: string
  banco?: string
  agencia?: string
  tipoConta?: string
  numeroConta?: string
  valorSolicitado?: string
  docRG?: string
  docCNH?: string
  docHolerite?: string
  docExtratoConsignado?: string
  docComprovanteResidencia?: string
  senhaGovBR?: string
  loginGovBR?: string
  senhaSIAPE?: string
  matriculaSIAPE?: string
  senhaPrefeitura?: string
  matriculaPrefeitura?: string
  senhaAppBanco?: string
  senhaINSS?: string
  contatoWhatsApp?: boolean
  criadoEm: any
}

interface Mensagem {
  id: string
  texto: string
  remetente: 'cliente' | 'atendente'
  criadoEm: any
  lida?: boolean
}

export default function Clientes() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [filtroStatus, setFiltroStatus] = useState('Todos')
  const [busca, setBusca] = useState('')
  const [modalAberto, setModalAberto] = useState(false)
  const [clienteEditando, setClienteEditando] = useState<Cliente | null>(null)
  const [loading, setLoading] = useState(false)
  const [visuFila, setVisuFila] = useState(false)
  const [atendentes, setAtendentes] = useState<string[]>([])
  const [atendenteTransferir, setAtendenteTransferir] = useState('')
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [novaMensagem, setNovaMensagem] = useState('')
  const chatEndRef = useRef<HTMLDivElement>(null)
  const { darkMode } = useTheme()
  const { empresa, usuario, user } = useAuth()
  const navigate = useNavigate()

  const empresaId = empresa?.id || usuario?.empresaId || ''
  const atendenteAtual = usuario?.nome || user?.displayName || 'Atendente'

  const statusOptions = [
    'Todos', 'Lead', 'Em Atendimento', 'Proposta', 'Doc. Recebida',
    'Análise Bancária', 'Aprovado', 'Pago', 'Sem Contato', 'Recusado', 'Remarketing'
  ]

  const modalidadeOptions = [
    'Antecipação FGTS', 'Crédito CLT', 'INSS', 'Conta de Energia',
    'Refinanciamento Veículo', 'Refinanciamento Imóvel', 'Placa Solar',
    'SIAPE', 'Servidor Municipal', 'Bolsa Família', 'Limpa Nome', 'Hunting Bancário'
  ]

  const origemOptions = [
    'WhatsApp', 'Site', 'Landing Page', 'Tráfego Pago',
    'Indicação', 'Instagram', 'Facebook', 'Outro'
  ]

  const tipoContaOptions = ['Conta Corrente', 'Conta Poupança']

  const statusColors: Record<string, string> = {
    'Lead': 'bg-purple-500',
    'Em Atendimento': 'bg-blue-500',
    'Proposta': 'bg-yellow-500',
    'Doc. Recebida': 'bg-cyan-500',
    'Análise Bancária': 'bg-indigo-500',
    'Aprovado': 'bg-green-500',
    'Pago': 'bg-emerald-600',
    'Sem Contato': 'bg-orange-500',
    'Recusado': 'bg-red-500',
    'Remarketing': 'bg-pink-500'
  }

  const [formData, setFormData] = useState({
    nome: '', cpf: '', rg: '', cnh: '', nascimento: '',
    whatsapp: '', telefone: '', email: '',
    cep: '', endereco: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '',
    status: 'Lead', modalidade: '', origem: 'WhatsApp', atendente: '', observacoes: '',
    banco: '', agencia: '', tipoConta: 'Conta Corrente', numeroConta: '', valorSolicitado: '',
    docRG: '', docCNH: '', docHolerite: '', docExtratoConsignado: '', docComprovanteResidencia: '',
    senhaGovBR: '', loginGovBR: '', senhaSIAPE: '', matriculaSIAPE: '',
    senhaPrefeitura: '', matriculaPrefeitura: '', senhaAppBanco: '', senhaINSS: '',
    contatoWhatsApp: true
  })

  useEffect(() => {
    if (!empresaId) {
      setClientes([])
      return
    }
    const q = query(collection(db, 'empresas', empresaId, 'clientes'))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const clientesData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      })) as Cliente[]
      setClientes(clientesData)
      
      const atendentesUnicos = Array.from(new Set(clientesData.map(c => c.atendente).filter(Boolean))) as string[]
      setAtendentes(atendentesUnicos)
    })
    return () => unsubscribe()
  }, [empresaId])

  useEffect(() => {
    if (!clienteEditando) {
      setMensagens([])
      return
    }
    
    const q = query(
      collection(db, 'empresas', empresaId, 'clientes', clienteEditando.id, 'mensagens'),
      orderBy('criadoEm', 'asc')
    )
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const mensagensData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      })) as Mensagem[]
      setMensagens(mensagensData)
      
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    })
    return () => unsubscribe()
  }, [clienteEditando, empresaId])

  const clientesFiltrados = clientes.filter((cliente) => {
    const matchStatus = filtroStatus === 'Todos' || cliente.status === filtroStatus
    const matchBusca =
      cliente.nome?.toLowerCase().includes(busca.toLowerCase()) ||
      cliente.cpf?.includes(busca) ||
      cliente.whatsapp?.includes(busca) ||
      cliente.telefone?.includes(busca)
    return matchStatus && matchBusca
  })

  const contarPorStatus = (status: string) => {
    if (status === 'Todos') return clientes.length
    return clientes.filter((c) => c.status === status).length
  }

  const abrirModalNovo = () => {
    setClienteEditando(null)
    setFormData({
      nome: '', cpf: '', rg: '', cnh: '', nascimento: '',
      whatsapp: '', telefone: '', email: '',
      cep: '', endereco: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '',
      status: 'Lead', modalidade: '', origem: 'WhatsApp', atendente: '', observacoes: '',
      banco: '', agencia: '', tipoConta: 'Conta Corrente', numeroConta: '', valorSolicitado: '',
      docRG: '', docCNH: '', docHolerite: '', docExtratoConsignado: '', docComprovanteResidencia: '',
      senhaGovBR: '', loginGovBR: '', senhaSIAPE: '', matriculaSIAPE: '',
      senhaPrefeitura: '', matriculaPrefeitura: '', senhaAppBanco: '', senhaINSS: '',
      contatoWhatsApp: true
    })
    setModalAberto(true)
  }

  const abrirModalEditar = (cliente: Cliente) => {
    setClienteEditando(cliente)
    setFormData({
      nome: cliente.nome || '', cpf: cliente.cpf || '', rg: cliente.rg || '',
      cnh: cliente.cnh || '', nascimento: cliente.nascimento || '',
      whatsapp: cliente.whatsapp || '', telefone: cliente.telefone || '', email: cliente.email || '',
      cep: cliente.cep || '', endereco: cliente.endereco || '', numero: cliente.numero || '',
      complemento: cliente.complemento || '', bairro: cliente.bairro || '',
      cidade: cliente.cidade || '', estado: cliente.estado || '',
      status: cliente.status || 'Lead', modalidade: cliente.modalidade || '',
      origem: cliente.origem || 'WhatsApp', atendente: cliente.atendente || '',
      observacoes: cliente.observacoes || '',
      banco: cliente.banco || '', agencia: cliente.agencia || '',
      tipoConta: cliente.tipoConta || 'Conta Corrente', numeroConta: cliente.numeroConta || '',
      valorSolicitado: cliente.valorSolicitado || '',
      docRG: cliente.docRG || '', docCNH: cliente.docCNH || '', docHolerite: cliente.docHolerite || '',
      docExtratoConsignado: cliente.docExtratoConsignado || '',
      docComprovanteResidencia: cliente.docComprovanteResidencia || '',
      senhaGovBR: cliente.senhaGovBR || '', loginGovBR: cliente.loginGovBR || '',
      senhaSIAPE: cliente.senhaSIAPE || '', matriculaSIAPE: cliente.matriculaSIAPE || '',
      senhaPrefeitura: cliente.senhaPrefeitura || '', matriculaPrefeitura: cliente.matriculaPrefeitura || '',
      senhaAppBanco: cliente.senhaAppBanco || '', senhaINSS: cliente.senhaINSS || '',
      contatoWhatsApp: cliente.contatoWhatsApp ?? true
    })
    setModalAberto(true)
  }

  const salvarCliente = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (clienteEditando) {
        // Atualizar cliente existente
        await updateDoc(doc(db, 'empresas', empresaId, 'clientes', clienteEditando.id), {
          ...formData, atualizadoEm: serverTimestamp()
        })
        
        // Atualizar conversa do WhatsApp se existir
        if (formData.whatsapp) {
          const limpo = formData.whatsapp.replace(/\D/g, '')
          const qConv = query(
            collection(db, 'empresas', empresaId, 'conversasWhatsApp'),
            where('numeroWhatsApp', '==', limpo)
          )
          const snapshotConv = await import('firebase/firestore').then(mod => mod.getDocs(qConv))
          
          if (!snapshotConv.empty) {
            const conversaDoc = snapshotConv.docs[0]
            await updateDoc(doc(db, 'empresas', empresaId, 'conversasWhatsApp', conversaDoc.id), {
              nomeCliente: formData.nome,
              cpfCliente: formData.cpf || '',
              emailCliente: formData.email || '',
              modalidadeCliente: formData.modalidade || '',
              statusCliente: formData.status,
              atualizadoEm: serverTimestamp()
            })
          }
        }
      } else {
        // Criar novo cliente
        const novoClienteRef = await addDoc(collection(db, 'empresas', empresaId, 'clientes'), {
          ...formData, criadoEm: serverTimestamp()
        })
        
        // Criar conversa automática no WhatsApp se tiver número
        if (formData.whatsapp) {
          const limpo = formData.whatsapp.replace(/\D/g, '')
          
          if (limpo.length >= 10) {
            // Verificar se já existe conversa com este número
            const qConv = query(
              collection(db, 'empresas', empresaId, 'conversasWhatsApp'),
              where('numeroWhatsApp', '==', limpo)
            )
            const snapshotConv = await import('firebase/firestore').then(mod => mod.getDocs(qConv))
            
            if (snapshotConv.empty) {
              // Criar conversa
              const conversaRef = await addDoc(collection(db, 'empresas', empresaId, 'conversasWhatsApp'), {
                numeroWhatsApp: limpo,
                nomeCliente: formData.nome,
                cpfCliente: formData.cpf || '',
                emailCliente: formData.email || '',
                modalidadeCliente: formData.modalidade || '',
                statusCliente: formData.status,
                status: 'ativa',
                atendente: formData.atendente || atendenteAtual,
                naoLidas: 0,
                criadoEm: serverTimestamp(),
                atualizadoEm: serverTimestamp(),
                clienteId: novoClienteRef.id
              })
              
              // Adicionar mensagem inicial do sistema
              await addDoc(
                collection(db, 'empresas', empresaId, 'conversasWhatsApp', conversaRef.id, 'mensagens'),
                {
                  texto: `✅ Cliente cadastrado no sistema\n\n📋 Nome: ${formData.nome}\n📱 WhatsApp: ${formData.whatsapp}\n🎯 Modalidade: ${formData.modalidade || 'Não definida'}\n📍 Status: ${formData.status}`,
                  remetente: 'atendente',
                  timestamp: serverTimestamp(),
                  lida: true
                }
              )
              
              console.log('✅ Conversa criada automaticamente no WhatsApp')
            }
          }
        }
      }
      setModalAberto(false)
      alert('✅ Cliente salvo com sucesso!')
    } catch (error) {
      console.error('Erro ao salvar:', error)
      alert('❌ Erro ao salvar cliente')
    } finally {
      setLoading(false)
    }
  }

  const excluirCliente = async (id: string) => {
    if (!window.confirm('Deseja excluir?')) return
    try {
      await deleteDoc(doc(db, 'empresas', empresaId, 'clientes', id))
    } catch (error) {
      console.error('Erro ao excluir:', error)
    }
  }

  const exportarCSV = () => {
    const headers = ['Nome', 'CPF', 'WhatsApp', 'Status', 'Modalidade']
    const rows = clientesFiltrados.map((c) => [
      c.nome, c.cpf || '', c.whatsapp || '', c.status, c.modalidade || ''
    ])
    const csvContent = 'data:text/csv;charset=utf-8,' +
      [headers, ...rows].map((e) => e.join(',')).join('\n')
    const link = document.createElement('a')
    link.setAttribute('href', encodeURI(csvContent))
    link.setAttribute('download', `clientes_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const whatsappLink = (numero: string) => {
    const limpo = numero.replace(/\D/g, '')
    const comCodigo = limpo.startsWith('55') ? limpo : '55' + limpo
    return `https://wa.me/${comCodigo}`
  }

  const abrirChatWhatsApp = async (cliente: Cliente) => {
    if (!cliente.whatsapp) {
      alert('⚠️ Cliente não possui WhatsApp cadastrado')
      return
    }
    
    const limpo = cliente.whatsapp.replace(/\D/g, '')
    
    // Verificar se já existe conversa
    const qConv = query(
      collection(db, 'empresas', empresaId, 'conversasWhatsApp'),
      where('numeroWhatsApp', '==', limpo)
    )
    
    const snapshotConv = await getDocs(qConv)
    
    if (snapshotConv.empty) {
      // Criar conversa se não existir
      const conversaRef = await addDoc(collection(db, 'empresas', empresaId, 'conversasWhatsApp'), {
        numeroWhatsApp: limpo,
        nomeCliente: cliente.nome,
        cpfCliente: cliente.cpf || '',
        emailCliente: cliente.email || '',
        modalidadeCliente: cliente.modalidade || '',
        statusCliente: cliente.status,
        status: 'ativa',
        atendente: cliente.atendente || atendenteAtual,
        naoLidas: 0,
        criadoEm: serverTimestamp(),
        atualizadoEm: serverTimestamp(),
        clienteId: cliente.id
      })
      
      // Adicionar mensagem inicial
      await addDoc(
        collection(db, 'empresas', empresaId, 'conversasWhatsApp', conversaRef.id, 'mensagens'),
        {
          texto: `✅ Conversa iniciada pelo cadastro de cliente\n\n📋 ${cliente.nome}\n📱 ${cliente.whatsapp}\n🎯 ${cliente.modalidade || 'Sem modalidade'}`,
          remetente: 'atendente',
          timestamp: serverTimestamp(),
          lida: true
        }
      )
    }
    
    // Redirecionar para o Chat WhatsApp
    navigate('/chat-whatsapp')
  }

  const enviarMensagem = async () => {
    if (!novaMensagem.trim() || !clienteEditando) return
    
    try {
      await addDoc(collection(db, 'empresas', empresaId, 'clientes', clienteEditando.id, 'mensagens'), {
        texto: novaMensagem,
        remetente: 'atendente',
        criadoEm: serverTimestamp(),
        lida: true
      })
      setNovaMensagem('')
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error)
    }
  }

  const transferirCliente = async () => {
    if (!clienteEditando || !atendenteTransferir) return
    
    try {
      await updateDoc(doc(db, 'empresas', empresaId, 'clientes', clienteEditando.id), {
        atendente: atendenteTransferir,
        atualizadoEm: serverTimestamp()
      })
      setAtendenteTransferir('')
      alert(`Cliente transferido para ${atendenteTransferir}`)
    } catch (error) {
      console.error('Erro ao transferir:', error)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className={`text-3xl font-bold flex items-center gap-3 ${
          darkMode ? 'text-white' : 'text-slate-800'
        }`}>
          <Users className="w-8 h-8 text-blue-500" />
          Clientes
        </h1>
        <div className="flex gap-3">
          <button onClick={exportarCSV} className={`px-4 py-2 rounded-lg font-semibold transition flex items-center gap-2 ${
            darkMode 
              ? 'bg-slate-700 text-white hover:bg-slate-600' 
              : 'bg-slate-600 text-white hover:bg-slate-700'
          }`}>
            <Download className="w-5 h-5" />
            Exportar
          </button>
          <button onClick={abrirModalNovo} className="bg-gradient-to-r from-orange-500 to-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:from-orange-600 hover:to-blue-700 transition shadow-lg flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Novo Cliente
          </button>
        </div>
      </div>

      <div className={`rounded-xl shadow-lg p-6 mb-6 ${
        darkMode ? 'bg-slate-800/80' : 'bg-white'
      }`}>
        <div className="relative">
          <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
            darkMode ? 'text-slate-400' : 'text-slate-400'
          }`} />
          <input
            type="text"
            placeholder="Buscar por nome, CPF ou WhatsApp..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className={`w-full pl-10 pr-4 py-3 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none ${
              darkMode 
                ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' 
                : 'bg-white border-slate-300 border text-slate-800'
            }`}
          />
        </div>
      </div>

      <div className={`rounded-xl shadow-lg p-6 mb-6 ${
        darkMode ? 'bg-slate-800/80' : 'bg-white'
      }`}>
        <div className="flex flex-wrap gap-2">
          {statusOptions.map((status) => (
            <button
              key={status}
              onClick={() => setFiltroStatus(status)}
              className={`px-4 py-2 rounded-full font-semibold transition ${
                filtroStatus === status
                  ? 'bg-gradient-to-r from-orange-500 to-blue-600 text-white shadow-lg'
                  : darkMode
                  ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {status} <span className="ml-1 opacity-75">({contarPorStatus(status)})</span>
            </button>
          ))}
        </div>
        
        <div className={`mt-4 pt-4 ${darkMode ? 'border-t border-slate-700' : 'border-t border-slate-200'}`}>
          <button
            onClick={() => setVisuFila(!visuFila)}
            className={`px-6 py-2 rounded-lg font-semibold transition flex items-center gap-2 ${
              visuFila
                ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg'
                : darkMode
                ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
            }`}
          >
            <UserCheck className="w-5 h-5" />
            {visuFila ? 'Ver Todos os Clientes' : 'Fila por Atendente'}
          </button>
        </div>
      </div>

      {visuFila ? (
        <div className="space-y-6">
          {atendentes.length === 0 ? (
            <div className={`rounded-xl shadow-lg p-12 text-center ${
              darkMode ? 'bg-slate-800/80 text-slate-400' : 'bg-white text-slate-500'
            }`}>
              Nenhum atendente encontrado
            </div>
          ) : (
            atendentes.map((atendente) => {
              const clientesDoAtendente = clientesFiltrados.filter(c => c.atendente === atendente)
              if (clientesDoAtendente.length === 0) return null
              
              return (
                <div key={atendente} className={`rounded-xl shadow-lg p-6 ${
                  darkMode ? 'bg-slate-800/80' : 'bg-white'
                }`}>
                  <h3 className={`text-xl font-bold mb-4 flex items-center gap-2 ${
                    darkMode ? 'text-white' : 'text-slate-800'
                  }`}>
                    <UserCheck className="w-6 h-6 text-blue-500" />
                    {atendente} <span className="text-sm opacity-75">({clientesDoAtendente.length})</span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {clientesDoAtendente.map((cliente) => (
                      <div key={cliente.id} className={`rounded-lg shadow p-4 hover:shadow-md transition ${
                        darkMode ? 'bg-slate-700/50' : 'bg-slate-50'
                      }`}>
                        <div className="flex items-center justify-between mb-3">
                          <span className={`${statusColors[cliente.status] || 'bg-slate-500'} text-white text-xs font-bold px-2 py-1 rounded-full`}>
                            {cliente.status}
                          </span>
                          <div className="flex gap-1">
                            <button onClick={() => abrirModalEditar(cliente)} className="text-blue-500 hover:text-blue-600 p-1">
                              <Edit className="w-4 h-4" />
                            </button>
                            <button onClick={() => excluirCliente(cliente.id)} className="text-red-500 hover:text-red-600 p-1">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        
                        <h4 className={`text-base font-bold mb-2 truncate ${
                          darkMode ? 'text-white' : 'text-slate-800'
                        }`}>{cliente.nome}</h4>
                        
                        <div className={`space-y-1 text-xs mb-3 ${
                          darkMode ? 'text-slate-300' : 'text-slate-600'
                        }`}>
                          {cliente.modalidade && <p>📋 {cliente.modalidade}</p>}
                          {cliente.whatsapp && (
                            <p className="flex items-center gap-1">
                              <Phone className="w-3 h-3" /> {cliente.whatsapp}
                            </p>
                          )}
                        </div>
                        
                        {cliente.whatsapp && (
                          <div className="space-y-2">
                            <button
                              onClick={() => abrirChatWhatsApp(cliente)}
                              className="w-full bg-blue-500 text-white py-1.5 rounded-lg text-sm font-semibold hover:bg-blue-600 transition flex items-center justify-center gap-1"
                            >
                              <MessageCircle className="w-3 h-3" />
                              Chat CRM
                            </button>
                            <a
                              href={whatsappLink(cliente.whatsapp)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full bg-green-500 text-white py-1.5 rounded-lg text-sm font-semibold hover:bg-green-600 transition flex items-center justify-center gap-1"
                            >
                              <Phone className="w-3 h-3" />
                              WhatsApp Web
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {clientesFiltrados.length === 0 ? (
            <div className={`col-span-full rounded-xl shadow-lg p-12 text-center ${
              darkMode ? 'bg-slate-800/80 text-slate-400' : 'bg-white text-slate-500'
            }`}>
              Nenhum cliente encontrado
            </div>
          ) : (
            clientesFiltrados.map((cliente) => (
              <div key={cliente.id} className={`rounded-xl shadow-lg p-6 hover:shadow-xl transition ${
                darkMode ? 'bg-slate-800/80' : 'bg-white'
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <span className={`${statusColors[cliente.status] || 'bg-slate-500'} text-white text-xs font-bold px-3 py-1 rounded-full`}>
                    {cliente.status}
                  </span>
                  <div className="flex gap-2">
                    <button onClick={() => abrirModalEditar(cliente)} className="text-blue-500 hover:text-blue-600 p-1">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => excluirCliente(cliente.id)} className="text-red-500 hover:text-red-600 p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <h3 className={`text-lg font-bold mb-2 truncate ${
                  darkMode ? 'text-white' : 'text-slate-800'
                }`}>{cliente.nome}</h3>

                <div className={`space-y-2 text-sm mb-4 ${
                  darkMode ? 'text-slate-300' : 'text-slate-600'
                }`}>
                  {cliente.modalidade && <p>📋 {cliente.modalidade}</p>}
                  {cliente.atendente && <p>👤 {cliente.atendente}</p>}
                  {cliente.email && (
                    <p className="flex items-center gap-1 truncate">
                      <Mail className="w-3 h-3" /> {cliente.email}
                    </p>
                  )}
                  {cliente.whatsapp && (
                    <p className="flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {cliente.whatsapp}
                    </p>
                  )}
                </div>

                {cliente.whatsapp && (
                  <div className="space-y-2">
                    <button
                      onClick={() => abrirChatWhatsApp(cliente)}
                      className="w-full bg-blue-500 text-white py-2 rounded-lg font-semibold hover:bg-blue-600 transition flex items-center justify-center gap-2"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Chat CRM
                    </button>
                    <a
                      href={whatsappLink(cliente.whatsapp)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full bg-green-500 text-white py-2 rounded-lg font-semibold hover:bg-green-600 transition flex items-center justify-center gap-2"
                    >
                      <Phone className="w-4 h-4" />
                      WhatsApp Web
                    </a>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {modalAberto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`rounded-xl shadow-2xl max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col ${
            darkMode ? 'bg-slate-800' : 'bg-white'
          }`}>
            <div className="sticky top-0 bg-gradient-to-r from-orange-500 to-blue-600 text-white p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h2 className="text-2xl font-bold">{clienteEditando ? 'Editar Cliente' : 'Novo Cliente'}</h2>
                
                {clienteEditando && atendentes.length > 0 && (
                  <div className="flex items-center gap-2 bg-white bg-opacity-20 rounded-lg px-3 py-1">
                    <UserCheck className="w-4 h-4" />
                    <select
                      value={atendenteTransferir}
                      onChange={(e) => setAtendenteTransferir(e.target.value)}
                      className="bg-transparent text-white border-none outline-none text-sm font-semibold"
                    >
                      <option value="" className="text-slate-800">Transferir para...</option>
                      {atendentes.filter(a => a !== clienteEditando.atendente).map((atendente) => (
                        <option key={atendente} value={atendente} className="text-slate-800">
                          {atendente}
                        </option>
                      ))}
                    </select>
                    {atendenteTransferir && (
                      <button
                        onClick={transferirCliente}
                        className="bg-white text-blue-600 px-3 py-1 rounded text-xs font-bold hover:bg-blue-50 transition"
                      >
                        Confirmar
                      </button>
                    )}
                  </div>
                )}
              </div>
              
              <button onClick={() => setModalAberto(false)} className="text-white hover:text-slate-200">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-hidden flex">
              <div className="flex-1 overflow-y-auto p-6">
                <form onSubmit={salvarCliente} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className={`block text-sm font-semibold mb-2 ${
                        darkMode ? 'text-slate-300' : 'text-slate-700'
                      }`}>Nome *</label>
                      <input type="text" required value={formData.nome}
                        onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                        className={`w-full px-4 py-3 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none ${
                          darkMode 
                            ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400 border'
                            : 'bg-white border border-slate-300 text-slate-800'
                        }`} />
                    </div>

                    <div>
                      <label className={`block text-sm font-semibold mb-2 ${
                        darkMode ? 'text-slate-300' : 'text-slate-700'
                      }`}>CPF</label>
                      <input type="text" value={formData.cpf}
                        onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                        className={`w-full px-4 py-3 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none ${
                          darkMode 
                            ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400 border'
                            : 'bg-white border border-slate-300 text-slate-800'
                        }`} />
                    </div>

                    <div>
                      <label className={`block text-sm font-semibold mb-2 ${
                        darkMode ? 'text-slate-300' : 'text-slate-700'
                      }`}>RG</label>
                      <input type="text" value={formData.rg}
                        onChange={(e) => setFormData({ ...formData, rg: e.target.value })}
                        className={`w-full px-4 py-3 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none ${
                          darkMode 
                            ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400 border'
                            : 'bg-white border border-slate-300 text-slate-800'
                        }`} />
                    </div>

                    <div>
                      <label className={`block text-sm font-semibold mb-2 ${
                        darkMode ? 'text-slate-300' : 'text-slate-700'
                      }`}>CNH</label>
                      <input type="text" value={formData.cnh}
                        onChange={(e) => setFormData({ ...formData, cnh: e.target.value })}
                        className={`w-full px-4 py-3 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none ${
                          darkMode 
                            ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400 border'
                            : 'bg-white border border-slate-300 text-slate-800'
                        }`} />
                    </div>

                    <div>
                      <label className={`block text-sm font-semibold mb-2 ${
                        darkMode ? 'text-slate-300' : 'text-slate-700'
                      }`}>Nascimento</label>
                      <input type="date" value={formData.nascimento}
                        onChange={(e) => setFormData({ ...formData, nascimento: e.target.value })}
                        className={`w-full px-4 py-3 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none ${
                          darkMode 
                            ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400 border'
                            : 'bg-white border border-slate-300 text-slate-800'
                        }`} />
                    </div>

                    <div>
                      <label className={`block text-sm font-semibold mb-2 ${
                        darkMode ? 'text-slate-300' : 'text-slate-700'
                      }`}>WhatsApp</label>
                      <input type="text" value={formData.whatsapp}
                        onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                        className={`w-full px-4 py-3 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none ${
                          darkMode 
                            ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400 border'
                            : 'bg-white border border-slate-300 text-slate-800'
                        }`}
                        placeholder="(00) 00000-0000" />
                    </div>

                    <div>
                      <label className={`block text-sm font-semibold mb-2 ${
                        darkMode ? 'text-slate-300' : 'text-slate-700'
                      }`}>Telefone</label>
                      <input type="text" value={formData.telefone}
                        onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                        className={`w-full px-4 py-3 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none ${
                          darkMode 
                            ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400 border'
                            : 'bg-white border border-slate-300 text-slate-800'
                        }`} />
                    </div>

                    <div>
                      <label className={`block text-sm font-semibold mb-2 ${
                        darkMode ? 'text-slate-300' : 'text-slate-700'
                      }`}>E-mail</label>
                      <input type="email" value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className={`w-full px-4 py-3 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none ${
                          darkMode 
                            ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400 border'
                            : 'bg-white border border-slate-300 text-slate-800'
                        }`} />
                    </div>

                    <div>
                      <label className={`block text-sm font-semibold mb-2 ${
                        darkMode ? 'text-slate-300' : 'text-slate-700'
                      }`}>CEP</label>
                      <input type="text" value={formData.cep}
                        onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
                        className={`w-full px-4 py-3 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none ${
                          darkMode 
                            ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400 border'
                            : 'bg-white border border-slate-300 text-slate-800'
                        }`}
                        placeholder="00000-000" />
                    </div>

                    <div className="md:col-span-2">
                      <label className={`block text-sm font-semibold mb-2 ${
                        darkMode ? 'text-slate-300' : 'text-slate-700'
                      }`}>Endereço</label>
                      <input type="text" value={formData.endereco}
                        onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                        className={`w-full px-4 py-3 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none ${
                          darkMode 
                            ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400 border'
                            : 'bg-white border border-slate-300 text-slate-800'
                        }`} />
                    </div>

                    <div>
                      <label className={`block text-sm font-semibold mb-2 ${
                        darkMode ? 'text-slate-300' : 'text-slate-700'
                      }`}>Número</label>
                      <input type="text" value={formData.numero}
                        onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                        className={`w-full px-4 py-3 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none ${
                          darkMode 
                            ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400 border'
                            : 'bg-white border border-slate-300 text-slate-800'
                        }`} />
                    </div>

                    <div>
                      <label className={`block text-sm font-semibold mb-2 ${
                        darkMode ? 'text-slate-300' : 'text-slate-700'
                      }`}>Complemento</label>
                      <input type="text" value={formData.complemento}
                        onChange={(e) => setFormData({ ...formData, complemento: e.target.value })}
                        className={`w-full px-4 py-3 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none ${
                          darkMode 
                            ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400 border'
                            : 'bg-white border border-slate-300 text-slate-800'
                        }`} />
                    </div>

                    <div>
                      <label className={`block text-sm font-semibold mb-2 ${
                        darkMode ? 'text-slate-300' : 'text-slate-700'
                      }`}>Bairro</label>
                      <input type="text" value={formData.bairro}
                        onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
                        className={`w-full px-4 py-3 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none ${
                          darkMode 
                            ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400 border'
                            : 'bg-white border border-slate-300 text-slate-800'
                        }`} />
                    </div>

                    <div>
                      <label className={`block text-sm font-semibold mb-2 ${
                        darkMode ? 'text-slate-300' : 'text-slate-700'
                      }`}>Cidade</label>
                      <input type="text" value={formData.cidade}
                        onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                        className={`w-full px-4 py-3 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none ${
                          darkMode 
                            ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400 border'
                            : 'bg-white border border-slate-300 text-slate-800'
                        }`} />
                    </div>

                    <div>
                      <label className={`block text-sm font-semibold mb-2 ${
                        darkMode ? 'text-slate-300' : 'text-slate-700'
                      }`}>Estado (UF)</label>
                      <input type="text" value={formData.estado} maxLength={2}
                        onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                        className={`w-full px-4 py-3 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none ${
                          darkMode 
                            ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400 border'
                            : 'bg-white border border-slate-300 text-slate-800'
                        }`}
                        placeholder="Ex: SP" />
                    </div>

                    <div>
                      <label className={`block text-sm font-semibold mb-2 ${
                        darkMode ? 'text-slate-300' : 'text-slate-700'
                      }`}>Status *</label>
                      <select required value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        className={`w-full px-4 py-3 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none ${
                          darkMode 
                            ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400 border'
                            : 'bg-white border border-slate-300 text-slate-800'
                        }`}>
                        {statusOptions.filter((s) => s !== 'Todos').map((status) => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className={`block text-sm font-semibold mb-2 ${
                        darkMode ? 'text-slate-300' : 'text-slate-700'
                      }`}>Modalidade</label>
                      <select value={formData.modalidade}
                        onChange={(e) => setFormData({ ...formData, modalidade: e.target.value })}
                        className={`w-full px-4 py-3 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none ${
                          darkMode 
                            ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400 border'
                            : 'bg-white border border-slate-300 text-slate-800'
                        }`}>
                        <option value="">Selecione</option>
                        {modalidadeOptions.map((mod) => (
                          <option key={mod} value={mod}>{mod}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className={`block text-sm font-semibold mb-2 ${
                        darkMode ? 'text-slate-300' : 'text-slate-700'
                      }`}>Origem</label>
                      <select value={formData.origem}
                        onChange={(e) => setFormData({ ...formData, origem: e.target.value })}
                        className={`w-full px-4 py-3 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none ${
                          darkMode 
                            ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400 border'
                            : 'bg-white border border-slate-300 text-slate-800'
                        }`}>
                        {origemOptions.map((origem) => (
                          <option key={origem} value={origem}>{origem}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className={`block text-sm font-semibold mb-2 ${
                        darkMode ? 'text-slate-300' : 'text-slate-700'
                      }`}>Atendente</label>
                      <input type="text" value={formData.atendente}
                        onChange={(e) => setFormData({ ...formData, atendente: e.target.value })}
                        className={`w-full px-4 py-3 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none ${
                          darkMode 
                            ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400 border'
                            : 'bg-white border border-slate-300 text-slate-800'
                        }`} />
                    </div>

                    <div className={`md:col-span-2 mt-4 pt-4 ${
                      darkMode ? 'border-t border-slate-700' : 'border-t border-slate-200'
                    }`}>
                      <h3 className={`text-lg font-bold mb-3 ${
                        darkMode ? 'text-white' : 'text-slate-800'
                      }`}>🏦 Dados Bancários</h3>
                    </div>

                    <div>
                      <label className={`block text-sm font-semibold mb-2 ${
                        darkMode ? 'text-slate-300' : 'text-slate-700'
                      }`}>Banco</label>
                      <input type="text" value={formData.banco}
                        onChange={(e) => setFormData({ ...formData, banco: e.target.value })}
                        className={`w-full px-4 py-3 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none ${
                          darkMode 
                            ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400 border'
                            : 'bg-white border border-slate-300 text-slate-800'
                        }`} />
                    </div>

                    <div>
                      <label className={`block text-sm font-semibold mb-2 ${
                        darkMode ? 'text-slate-300' : 'text-slate-700'
                      }`}>Agência</label>
                      <input type="text" value={formData.agencia}
                        onChange={(e) => setFormData({ ...formData, agencia: e.target.value })}
                        className={`w-full px-4 py-3 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none ${
                          darkMode 
                            ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400 border'
                            : 'bg-white border border-slate-300 text-slate-800'
                        }`} />
                    </div>

                    <div>
                      <label className={`block text-sm font-semibold mb-2 ${
                        darkMode ? 'text-slate-300' : 'text-slate-700'
                      }`}>Tipo de Conta</label>
                      <select value={formData.tipoConta}
                        onChange={(e) => setFormData({ ...formData, tipoConta: e.target.value })}
                        className={`w-full px-4 py-3 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none ${
                          darkMode 
                            ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400 border'
                            : 'bg-white border border-slate-300 text-slate-800'
                        }`}>
                        {tipoContaOptions.map((tipo) => (
                          <option key={tipo} value={tipo}>{tipo}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className={`block text-sm font-semibold mb-2 ${
                        darkMode ? 'text-slate-300' : 'text-slate-700'
                      }`}>Número da Conta</label>
                      <input type="text" value={formData.numeroConta}
                        onChange={(e) => setFormData({ ...formData, numeroConta: e.target.value })}
                        className={`w-full px-4 py-3 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none ${
                          darkMode 
                            ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400 border'
                            : 'bg-white border border-slate-300 text-slate-800'
                        }`} />
                    </div>

                    <div className="md:col-span-2">
                      <label className={`block text-sm font-semibold mb-2 ${
                        darkMode ? 'text-slate-300' : 'text-slate-700'
                      }`}>Valor Solicitado</label>
                      <input type="text" value={formData.valorSolicitado}
                        onChange={(e) => setFormData({ ...formData, valorSolicitado: e.target.value })}
                        className={`w-full px-4 py-3 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none ${
                          darkMode 
                            ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400 border'
                            : 'bg-white border border-slate-300 text-slate-800'
                        }`}
                        placeholder="R$ 0,00" />
                    </div>

                    <div className={`md:col-span-2 mt-4 pt-4 ${
                      darkMode ? 'border-t border-slate-700' : 'border-t border-slate-200'
                    }`}>
                      <h3 className={`text-lg font-bold mb-3 ${
                        darkMode ? 'text-white' : 'text-slate-800'
                      }`}>🔐 Senhas do Cliente</h3>
                    </div>

                    <div>
                      <label className={`block text-sm font-semibold mb-2 ${
                        darkMode ? 'text-slate-300' : 'text-slate-700'
                      }`}>Login GOV.BR (CPF)</label>
                      <input type="text" value={formData.loginGovBR}
                        onChange={(e) => setFormData({ ...formData, loginGovBR: e.target.value })}
                        className={`w-full px-4 py-3 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none ${
                          darkMode 
                            ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400 border'
                            : 'bg-white border border-slate-300 text-slate-800'
                        }`} />
                    </div>

                    <div>
                      <label className={`block text-sm font-semibold mb-2 ${
                        darkMode ? 'text-slate-300' : 'text-slate-700'
                      }`}>Senha GOV.BR</label>
                      <input type="password" value={formData.senhaGovBR}
                        onChange={(e) => setFormData({ ...formData, senhaGovBR: e.target.value })}
                        className={`w-full px-4 py-3 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none ${
                          darkMode 
                            ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400 border'
                            : 'bg-white border border-slate-300 text-slate-800'
                        }`} />
                    </div>

                    <div>
                      <label className={`block text-sm font-semibold mb-2 ${
                        darkMode ? 'text-slate-300' : 'text-slate-700'
                      }`}>Matrícula SIAPE</label>
                      <input type="text" value={formData.matriculaSIAPE}
                        onChange={(e) => setFormData({ ...formData, matriculaSIAPE: e.target.value })}
                        className={`w-full px-4 py-3 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none ${
                          darkMode 
                            ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400 border'
                            : 'bg-white border border-slate-300 text-slate-800'
                        }`} />
                    </div>

                    <div>
                      <label className={`block text-sm font-semibold mb-2 ${
                        darkMode ? 'text-slate-300' : 'text-slate-700'
                      }`}>Senha SIAPE</label>
                      <input type="password" value={formData.senhaSIAPE}
                        onChange={(e) => setFormData({ ...formData, senhaSIAPE: e.target.value })}
                        className={`w-full px-4 py-3 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none ${
                          darkMode 
                            ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400 border'
                            : 'bg-white border border-slate-300 text-slate-800'
                        }`} />
                    </div>

                    <div>
                      <label className={`block text-sm font-semibold mb-2 ${
                        darkMode ? 'text-slate-300' : 'text-slate-700'
                      }`}>Matrícula Prefeitura</label>
                      <input type="text" value={formData.matriculaPrefeitura}
                        onChange={(e) => setFormData({ ...formData, matriculaPrefeitura: e.target.value })}
                        className={`w-full px-4 py-3 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none ${
                          darkMode 
                            ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400 border'
                            : 'bg-white border border-slate-300 text-slate-800'
                        }`} />
                    </div>

                    <div>
                      <label className={`block text-sm font-semibold mb-2 ${
                        darkMode ? 'text-slate-300' : 'text-slate-700'
                      }`}>Senha Prefeitura</label>
                      <input type="password" value={formData.senhaPrefeitura}
                        onChange={(e) => setFormData({ ...formData, senhaPrefeitura: e.target.value })}
                        className={`w-full px-4 py-3 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none ${
                          darkMode 
                            ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400 border'
                            : 'bg-white border border-slate-300 text-slate-800'
                        }`} />
                    </div>

                    <div>
                      <label className={`block text-sm font-semibold mb-2 ${
                        darkMode ? 'text-slate-300' : 'text-slate-700'
                      }`}>Senha App Banco</label>
                      <input type="password" value={formData.senhaAppBanco}
                        onChange={(e) => setFormData({ ...formData, senhaAppBanco: e.target.value })}
                        className={`w-full px-4 py-3 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none ${
                          darkMode 
                            ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400 border'
                            : 'bg-white border border-slate-300 text-slate-800'
                        }`} />
                    </div>

                    <div>
                      <label className={`block text-sm font-semibold mb-2 ${
                        darkMode ? 'text-slate-300' : 'text-slate-700'
                      }`}>Senha INSS (Meu INSS)</label>
                      <input type="password" value={formData.senhaINSS}
                        onChange={(e) => setFormData({ ...formData, senhaINSS: e.target.value })}
                        className={`w-full px-4 py-3 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none ${
                          darkMode 
                            ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400 border'
                            : 'bg-white border border-slate-300 text-slate-800'
                        }`} />
                    </div>

                    <div className="md:col-span-2">
                      <label className={`block text-sm font-semibold mb-2 ${
                        darkMode ? 'text-slate-300' : 'text-slate-700'
                      }`}>Observações</label>
                      <textarea value={formData.observacoes} rows={3}
                        onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                        className={`w-full px-4 py-3 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none ${
                          darkMode 
                            ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400 border'
                            : 'bg-white border border-slate-300 text-slate-800'
                        }`} />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setModalAberto(false)}
                      className={`flex-1 py-3 rounded-lg font-semibold transition ${
                        darkMode 
                          ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                          : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                      }`}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 bg-gradient-to-r from-orange-500 to-blue-600 text-white py-3 rounded-lg font-semibold hover:from-orange-600 hover:to-blue-700 transition shadow-lg disabled:opacity-50"
                    >
                      {loading ? 'Salvando...' : 'Salvar'}
                    </button>
                  </div>
                </form>
              </div>

              {clienteEditando && (
                <div className={`w-96 border-l flex flex-col ${
                  darkMode ? 'bg-slate-700' : 'bg-slate-50'
                }`}>
                  <div className="bg-green-600 text-white p-4 flex items-center gap-3">
                    <Phone className="w-6 h-6" />
                    <div>
                      <h3 className="font-bold">Chat WhatsApp</h3>
                      <p className="text-xs opacity-90">{clienteEditando.whatsapp || 'Sem WhatsApp'}</p>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {mensagens.length === 0 ? (
                      <div className={`text-center text-sm mt-8 ${
                        darkMode ? 'text-slate-400' : 'text-slate-500'
                      }`}>
                        Nenhuma mensagem ainda
                      </div>
                    ) : (
                      mensagens.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex ${msg.remetente === 'atendente' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[75%] rounded-lg px-4 py-2 ${
                              msg.remetente === 'atendente'
                                ? 'bg-green-500 text-white'
                                : darkMode
                                ? 'bg-slate-600 text-white border border-slate-500'
                                : 'bg-white text-slate-800 border border-slate-200'
                            }`}
                          >
                            <p className="text-sm">{msg.texto}</p>
                            <p className="text-xs opacity-75 mt-1">
                              {msg.criadoEm?.toDate ? 
                                new Date(msg.criadoEm.toDate()).toLocaleTimeString('pt-BR', { 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                }) 
                                : 'Agora'
                              }
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  <div className={`p-4 border-t ${
                    darkMode 
                      ? 'bg-slate-800 border-slate-600' 
                      : 'bg-white border-slate-200'
                  }`}>
                    <div className="flex gap-2">
                      <button className={`hover:text-slate-500 ${
                        darkMode ? 'text-slate-400' : 'text-slate-500'
                      }`}>
                        <Paperclip className="w-5 h-5" />
                      </button>
                      <input
                        type="text"
                        value={novaMensagem}
                        onChange={(e) => setNovaMensagem(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && enviarMensagem()}
                        placeholder="Digite sua mensagem..."
                        className={`flex-1 px-3 py-2 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none text-sm ${
                          darkMode 
                            ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400 border'
                            : 'bg-white border border-slate-300 text-slate-800'
                        }`}
                      />
                      <button
                        onClick={enviarMensagem}
                        className="bg-green-500 text-white p-2 rounded-lg hover:bg-green-600 transition"
                      >
                        <Send className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

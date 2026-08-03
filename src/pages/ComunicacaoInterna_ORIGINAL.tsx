import { useState, useEffect, useRef } from 'react'
import { 
  MessageCircle, X, ArrowRight, Send, User, ChevronLeft, ChevronRight,
  Download, FileText, Paperclip, Search, Users, UserPlus, CheckCircle, Save,
  Smile, Image as ImageIcon, Camera, Mic, StopCircle, Play, Pause,
  Bell, Copy, Edit, Trash2, Eye, Clock, Upload, Plus, Mail
} from 'lucide-react'
import * as XLSX from 'xlsx'

// Tipos
interface Conversa {
  id: string
  nome: string
  cargo: string
  departamento: string
  email: string
  telefone: string
  ultimaMensagem: string
  naoLidas: number
  hora: string
  status: 'online' | 'offline' | 'ausente'
}

interface Mensagem {
  id: string
  texto: string
  remetente: 'funcionario' | 'eu'
  hora: string
  imagem?: string
  nomeArquivo?: string
  audio?: string
}

// Dados mock - Funcionários
const conversasMock: Conversa[] = [
  { id: '1', nome: 'Carlos Silva', cargo: 'Gerente de Vendas', departamento: 'Comercial', email: 'carlos@empresa.com', telefone: '(11) 98765-4321', ultimaMensagem: 'Reunião confirmada para às 14h', naoLidas: 2, hora: '10:30', status: 'online' },
  { id: '2', nome: 'Ana Paula Costa', cargo: 'Analista de RH', departamento: 'Recursos Humanos', email: 'ana@empresa.com', telefone: '(11) 99876-5432', ultimaMensagem: 'Documentos enviados!', naoLidas: 0, hora: '09:15', status: 'online' },
  { id: '3', nome: 'Pedro Oliveira', cargo: 'Desenvolvedor Sênior', departamento: 'TI', email: 'pedro@empresa.com', telefone: '(11) 97654-3210', ultimaMensagem: 'Sistema atualizado', naoLidas: 1, hora: '08:45', status: 'ausente' },
  { id: '4', nome: 'Maria Santos', cargo: 'Diretora Financeira', departamento: 'Financeiro', email: 'maria@empresa.com', telefone: '(11) 98888-7777', ultimaMensagem: 'Preciso do relatório urgente', naoLidas: 5, hora: '11:20', status: 'online' },
  { id: '5', nome: 'João Mendes', cargo: 'Coordenador de Marketing', departamento: 'Marketing', email: 'joao@empresa.com', telefone: '(11) 96666-5555', ultimaMensagem: 'Campanha aprovada!', naoLidas: 0, hora: '07:30', status: 'offline' }
]

const mensagensMock: Record<string, Mensagem[]> = {
  '1': [
    { id: 'm1', texto: 'Bom dia! Podemos agendar a reunião?', remetente: 'funcionario', hora: '10:15' },
    { id: 'm2', texto: 'Bom dia Carlos! Claro, que tal às 14h?', remetente: 'eu', hora: '10:20' },
    { id: 'm3', texto: 'Perfeito! Reunião confirmada para às 14h', remetente: 'funcionario', hora: '10:30' }
  ],
  '2': [
    { id: 'm4', texto: 'Você recebeu os documentos de admissão?', remetente: 'funcionario', hora: '09:10' },
    { id: 'm5', texto: 'Recebi sim! Vou analisar agora', remetente: 'eu', hora: '09:12' },
    { id: 'm6', texto: 'Documentos enviados!', remetente: 'funcionario', hora: '09:15' }
  ],
  '3': [
    { id: 'm7', texto: 'Sistema atualizado', remetente: 'funcionario', hora: '08:45' }
  ],
  '4': [
    { id: 'm8', texto: 'Preciso do relatório urgente', remetente: 'funcionario', hora: '11:20' }
  ]
}

const departamentos = ['Comercial', 'Financeiro', 'RH', 'TI', 'Marketing', 'Operacional', 'Administrativo']
const cargos = ['Gerente', 'Coordenador', 'Analista', 'Assistente', 'Diretor', 'Supervisor', 'Desenvolvedor', 'Designer']

// Emojis mais usados no WhatsApp
const emojis = [
  '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃',
  '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙',
  '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔',
  '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥',
  '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮',
  '🤧', '🥵', '🥶', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐',
  '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉',
  '👆', '👇', '☝️', '✋', '🤚', '🖐️', '🖖', '👋', '🤝', '🙏',
  '💪', '🦾', '🦿', '🦵', '🦶', '👂', '👃', '🧠', '🦷', '🦴',
  '👀', '👁️', '👅', '👄', '💋', '❤️', '🧡', '💛', '💚', '💙',
  '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗',
  '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️',
  '🔯', '🕎', '☯️', '☦️', '🛐', '⚛️', '🔱', '⚡', '🔥', '💥',
  '✨', '🌟', '⭐', '💫', '☄️', '💦', '💧', '🌊', '🎉', '🎊',
  '🎈', '🎁', '🏆', '🥇', '🥈', '🥉', '⚽', '🏀', '🏈', '⚾'
]

// Templates de Email
interface Template {
  id: string
  titulo: string
  tipo: 'Vendas' | 'Suporte' | 'Marketing' | 'Financeiro' | 'RH' | 'Geral'
  assunto: string
  corpo: string
  tags: string[]
  criadoPor: string
  dataCriacao: string
  vezesUsado: number
}

const templatesMock: Template[] = [
  {
    id: '1',
    titulo: 'Boas-vindas Novo Funcionário',
    tipo: 'RH',
    assunto: 'Bem-vindo(a) à [Nome da Empresa]!',
    corpo: 'Olá [Nome],\n\nÉ com grande satisfação que damos as boas-vindas à equipe!\n\nEstamos felizes em tê-lo(a) conosco. Nossa equipe está à disposição para ajudá-lo(a) nesta nova jornada.\n\nAtenciosamente,\nRH',
    tags: ['boas-vindas', 'onboarding', 'rh'],
    criadoPor: 'RH',
    dataCriacao: '2024-01-15',
    vezesUsado: 12
  },
  {
    id: '2',
    titulo: 'Reunião de Equipe',
    tipo: 'Geral',
    assunto: 'Reunião de Equipe - [Data]',
    corpo: 'Olá [Nome],\n\nConvocamos você para reunião de equipe.\n\nData: [Data]\nHorário: [Horário]\nLocal: [Local]\n\nAguardamos você!\n\nAtenciosamente,\n[Gestor]',
    tags: ['reunião', 'equipe'],
    criadoPor: 'Gerência',
    dataCriacao: '2024-01-10',
    vezesUsado: 35
  }
]

// Comunicados
interface Comunicado {
  id: string
  titulo: string
  mensagem: string
  autor: string
  dataPublicacao: string
  visualizacoes: number
  prioridade: 'Alta' | 'Normal' | 'Baixa'
}

const comunicadosMock: Comunicado[] = [
  {
    id: '1',
    titulo: 'Nova Política de Home Office',
    mensagem: 'A partir de fevereiro, colaboradores poderão trabalhar remotamente 2 dias por semana. Consulte o RH para mais detalhes sobre as novas diretrizes.',
    autor: 'Diretoria',
    dataPublicacao: '2024-01-25',
    visualizacoes: 67,
    prioridade: 'Alta'
  },
  {
    id: '2',
    titulo: 'Aniversariantes do Mês',
    mensagem: 'Parabéns aos aniversariantes de fevereiro: Maria (05/02), Pedro (12/02) e Fernanda (20/02)! 🎉',
    autor: 'RH',
    dataPublicacao: '2024-01-28',
    visualizacoes: 45,
    prioridade: 'Normal'
  }
]

export default function ComunicacaoInterna() {
  const [abaAtiva, setAbaAtiva] = useState<'templates' | 'chat' | 'comunicados'>('chat')
  const [modalOpen, setModalOpen] = useState(false)
  const [conversas, setConversas] = useState<Conversa[]>(() => {
    // Carregar conversas salvas do localStorage
    const salvas = localStorage.getItem('nexus_comunicacao_interna')
    return salvas ? JSON.parse(salvas) : conversasMock
  })
  const [conversaSelecionada, setConversaSelecionada] = useState<Conversa | null>(null)
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [novaMensagem, setNovaMensagem] = useState('')
  const [painelAberto, setPainelAberto] = useState(true)
  const [busca, setBusca] = useState('')
  const [showEmojis, setShowEmojis] = useState(false)
  const [imagemPreview, setImagemPreview] = useState<string | null>(null)
  const [gravandoAudio, setGravandoAudio] = useState(false)
  const [audioPreview, setAudioPreview] = useState<string | null>(null)
  const [imagemModal, setImagemModal] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  
  // Form funcionário
  const [formFuncionario, setFormFuncionario] = useState({
    nome: '',
    cpf: '',
    email: '',
    telefone: '',
    cargo: '',
    departamento: '',
    dataAdmissao: '',
    salario: '',
    situacao: 'Ativo',
    observacoes: ''
  })

  // Salvar conversas no localStorage sempre que mudar
  useEffect(() => {
    localStorage.setItem('nexus_comunicacao_interna', JSON.stringify(conversas))
  }, [conversas])

  // Fechar com ESC
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setModalOpen(false)
        setShowEmojis(false)
        setImagemModal(null)
      }
    }
    if (modalOpen) {
      document.addEventListener('keydown', handleEsc)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = 'unset'
    }
  }, [modalOpen])

  // Carregar mensagens e ficha do funcionário
  useEffect(() => {
    if (conversaSelecionada) {
      setMensagens(mensagensMock[conversaSelecionada.id] || [])
      
      // Tentar carregar ficha salva
      const fichasSalvas = JSON.parse(localStorage.getItem('nexus_fichas_funcionarios') || '{}')
      const fichaSalva = fichasSalvas[conversaSelecionada.id]
      
      if (fichaSalva) {
        // Carregar ficha salva
        setFormFuncionario(fichaSalva)
        if (fichaSalva.mensagens) {
          setMensagens(fichaSalva.mensagens)
        }
      } else {
        // Dados iniciais
        setFormFuncionario({
          nome: conversaSelecionada.nome,
          cpf: '123.456.789-00',
          email: conversaSelecionada.email,
          telefone: conversaSelecionada.telefone,
          cargo: conversaSelecionada.cargo,
          departamento: conversaSelecionada.departamento,
          dataAdmissao: '01/01/2024',
          salario: 'R$ 5.000,00',
          situacao: 'Ativo',
          observacoes: 'Funcionário exemplar'
        })
      }
    }
  }, [conversaSelecionada])

  const enviarMensagem = () => {
    if ((!novaMensagem.trim() && !imagemPreview) || !conversaSelecionada) return
    
    const nova: Mensagem = {
      id: 'm' + Date.now(),
      texto: novaMensagem.trim(),
      remetente: 'eu',
      hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      imagem: imagemPreview || undefined,
      nomeArquivo: imagemPreview ? 'imagem.jpg' : undefined
    }
    
    setMensagens([...mensagens, nova])
    setNovaMensagem('')
    setImagemPreview(null)
    
    // Atualizar última mensagem na conversa
    const textoUltima = imagemPreview ? '📷 Imagem' : novaMensagem.trim()
    setConversas(conversas.map(c => 
      c.id === conversaSelecionada.id 
        ? { ...c, ultimaMensagem: textoUltima, hora: nova.hora }
        : c
    ))
  }

  const handleImagemUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    // Verificar se é imagem
    if (!file.type.startsWith('image/')) {
      alert('⚠️ Por favor, selecione apenas imagens!')
      return
    }
    
    // Converter para base64
    const reader = new FileReader()
    reader.onload = () => {
      setImagemPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const adicionarEmoji = (emoji: string) => {
    setNovaMensagem(novaMensagem + emoji)
    setShowEmojis(false)
  }

  const iniciarGravacao = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const audioUrl = URL.createObjectURL(audioBlob)
        setAudioPreview(audioUrl)
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setGravandoAudio(true)
    } catch (err) {
      alert('⚠️ Erro ao acessar microfone. Verifique as permissões.')
      console.error(err)
    }
  }

  const pararGravacao = () => {
    if (mediaRecorderRef.current && gravandoAudio) {
      mediaRecorderRef.current.stop()
      setGravandoAudio(false)
    }
  }

  const enviarAudio = () => {
    if (!audioPreview || !conversaSelecionada) return

    const nova: Mensagem = {
      id: 'm' + Date.now(),
      texto: '',
      remetente: 'eu',
      hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      audio: audioPreview
    }

    setMensagens([...mensagens, nova])
    setAudioPreview(null)

    setConversas(conversas.map(c => 
      c.id === conversaSelecionada.id 
        ? { ...c, ultimaMensagem: '🎤 Áudio', hora: nova.hora }
        : c
    ))
  }

  const salvarFuncionario = () => {
    if (!conversaSelecionada || !formFuncionario.nome.trim()) {
      alert('⚠️ Preencha ao menos o nome do funcionário!')
      return
    }

    // Atualizar conversa com dados do funcionário
    const conversaAtualizada = {
      ...conversaSelecionada,
      nome: formFuncionario.nome.trim(),
      email: formFuncionario.email,
      telefone: formFuncionario.telefone,
      cargo: formFuncionario.cargo,
      departamento: formFuncionario.departamento
    }

    // Atualizar lista de conversas
    setConversas(conversas.map(c => 
      c.id === conversaSelecionada.id ? conversaAtualizada : c
    ))

    // Salvar ficha completa no localStorage
    const fichasFuncionarios = JSON.parse(localStorage.getItem('nexus_fichas_funcionarios') || '{}')
    fichasFuncionarios[conversaSelecionada.id] = {
      ...formFuncionario,
      salvoEm: new Date().toISOString(),
      conversaId: conversaSelecionada.id,
      mensagens: mensagens
    }
    localStorage.setItem('nexus_fichas_funcionarios', JSON.stringify(fichasFuncionarios))

    // Fazer backup geral
    const backup = {
      conversas: conversas.map(c => 
        c.id === conversaSelecionada.id ? conversaAtualizada : c
      ),
      fichas: fichasFuncionarios,
      backupEm: new Date().toISOString()
    }
    localStorage.setItem('nexus_backup_comunicacao_interna', JSON.stringify(backup))

    alert('✅ Funcionário salvo com sucesso!\n📦 Backup automático realizado!')
    
    // Atualizar conversa selecionada
    setConversaSelecionada(conversaAtualizada)
    
    // Fechar painel automaticamente
    setPainelAberto(false)
  }

  const exportarFuncionarios = () => {
    const dados = conversas.map(c => ({
      'Nome': c.nome,
      'Cargo': c.cargo,
      'Departamento': c.departamento,
      'Email': c.email,
      'Telefone': c.telefone,
      'Status': c.status,
      'Última Mensagem': c.ultimaMensagem,
      'Horário': c.hora
    }))
    const ws = XLSX.utils.json_to_sheet(dados)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Funcionários')
    XLSX.writeFile(wb, `Funcionarios_Comunicacao_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.xlsx`)
    alert('✅ Exportado com sucesso!')
  }

  const conversasFiltradas = conversas.filter(c => 
    c.nome.toLowerCase().includes(busca.toLowerCase()) ||
    c.telefone.includes(busca)
  )

  return (
    <>
      {/* Botão para abrir */}
      <div className="h-full flex items-center justify-center bg-slate-900">
        <button
          onClick={() => setModalOpen(true)}
          className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-lg flex items-center gap-3 transition-all transform hover:scale-105 shadow-2xl"
        >
          <MessageCircle className="w-7 h-7" />
          Abrir Comunicação Interna
          <ArrowRight className="w-6 h-6" />
        </button>
      </div>

      {/* Modal Fullscreen */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900 flex flex-col">
          {/* Header */}
          <div className="p-4 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <MessageCircle className="w-7 h-7 text-blue-500" />
              Comunicação Interna - Chat Corporativo
            </h1>
            <button
              onClick={() => setModalOpen(false)}
              className="p-2 hover:bg-slate-700 rounded-lg transition text-slate-400 hover:text-white"
              title="Fechar (ESC)"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Abas */}
          <div className="px-4 pt-4 bg-slate-900">
            <div className="flex gap-2 border-b border-slate-700">
              <button
                onClick={() => setAbaAtiva('chat')}
                className={`px-6 py-3 font-semibold transition-all relative ${
                  abaAtiva === 'chat'
                    ? 'text-blue-400 border-b-2 border-blue-500'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" />
                  Chat Corporativo
                </div>
              </button>
              <button
                onClick={() => setAbaAtiva('templates')}
                className={`px-6 py-3 font-semibold transition-all relative ${
                  abaAtiva === 'templates'
                    ? 'text-blue-400 border-b-2 border-blue-500'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Mail className="w-5 h-5" />
                  Templates de Email
                </div>
              </button>
              <button
                onClick={() => setAbaAtiva('comunicados')}
                className={`px-6 py-3 font-semibold transition-all relative ${
                  abaAtiva === 'comunicados'
                    ? 'text-blue-400 border-b-2 border-blue-500'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Comunicados
                </div>
              </button>
            </div>
          </div>

          {/* Conteúdo das Abas */}
          {abaAtiva === 'chat' && (
          <div className="flex-1 flex overflow-hidden">
            {/* SIDEBAR - Lista de Conversas */}
            <div className="w-80 bg-slate-800 border-r border-slate-700 flex flex-col">
              {/* Busca */}
              <div className="p-3 border-b border-slate-700">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    placeholder="Buscar conversa..."
                    className="w-full pl-10 pr-3 py-2 text-sm rounded-lg bg-slate-700 text-white placeholder-slate-400"
                  />
                </div>
              </div>

              {/* Lista */}
              <div className="flex-1 overflow-y-auto">
                {conversasFiltradas.map(conv => (
                  <div
                    key={conv.id}
                    onClick={() => setConversaSelecionada(conv)}
                    className={`p-3 border-b border-slate-700 cursor-pointer transition ${
                      conversaSelecionada?.id === conv.id ? 'bg-slate-700' : 'hover:bg-slate-700/50'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                          {conv.nome[0]}
                        </div>
                        {/* Status indicator */}
                        <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-slate-800 ${
                          conv.status === 'online' ? 'bg-green-500' :
                          conv.status === 'ausente' ? 'bg-yellow-500' : 'bg-gray-500'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-semibold text-white text-sm truncate">{conv.nome}</h3>
                          {conv.naoLidas > 0 && (
                            <span className="bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                              {conv.naoLidas}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 truncate">{conv.cargo}</p>
                        <p className="text-xs text-slate-500 truncate">{conv.departamento}</p>
                        <p className="text-xs text-slate-400 truncate mt-1">{conv.ultimaMensagem}</p>
                        <p className="text-[10px] text-slate-500 mt-1">{conv.hora}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ÁREA CENTRAL - Mensagens */}
            <div className="flex-1 flex flex-col bg-slate-900">
              {!conversaSelecionada ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <MessageCircle className="w-20 h-20 mx-auto mb-4 text-slate-600" />
                    <h3 className="text-xl font-bold mb-2 text-white">Selecione uma conversa</h3>
                    <p className="text-slate-400">Escolha um cliente da lista</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Header Conversa */}
                  <div className="p-4 bg-slate-800 border-b border-slate-700">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                          {conversaSelecionada.nome[0]}
                        </div>
                        <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-slate-800 ${
                          conversaSelecionada.status === 'online' ? 'bg-green-500' :
                          conversaSelecionada.status === 'ausente' ? 'bg-yellow-500' : 'bg-gray-500'
                        }`} />
                      </div>
                      <div>
                        <h3 className="font-bold text-white">{conversaSelecionada.nome}</h3>
                        <p className="text-xs text-slate-400">{conversaSelecionada.cargo} - {conversaSelecionada.departamento}</p>
                        <p className="text-[10px] text-slate-500">
                          {conversaSelecionada.status === 'online' ? '🟢 Online' :
                           conversaSelecionada.status === 'ausente' ? '🟡 Ausente' : '⚫ Offline'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Mensagens */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {mensagens.map(msg => (
                      <div key={msg.id} className={`flex ${msg.remetente === 'eu' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[70%] rounded-lg px-4 py-2 ${
                          msg.remetente === 'eu' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-white'
                        }`}>
                          {msg.imagem && (
                            <img 
                              src={msg.imagem} 
                              alt={msg.nomeArquivo}
                              className="rounded-lg mb-2 max-w-full h-auto cursor-pointer hover:opacity-90 transition"
                              onClick={() => setImagemModal(msg.imagem!)}
                            />
                          )}
                          {msg.audio && (
                            <audio controls src={msg.audio} className="max-w-full" />
                          )}
                          {msg.texto && <p className="text-sm">{msg.texto}</p>}
                          <p className="text-[10px] opacity-70 mt-1">{msg.hora}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Input */}
                  <div className="p-4 bg-slate-800 border-t border-slate-700">
                    {/* Preview da imagem */}
                    {imagemPreview && (
                      <div className="mb-2 relative inline-block">
                        <img 
                          src={imagemPreview} 
                          alt="Preview" 
                          className="max-h-32 rounded-lg border-2 border-green-500"
                        />
                        <button
                          onClick={() => setImagemPreview(null)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {/* Preview do áudio */}
                    {audioPreview && (
                      <div className="mb-2 p-3 bg-slate-700 rounded-lg flex items-center gap-3">
                        <audio controls src={audioPreview} className="flex-1" />
                        <button
                          onClick={() => setAudioPreview(null)}
                          className="bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {/* Emojis */}
                    {showEmojis && (
                      <div className="mb-2 p-3 bg-slate-700 rounded-lg max-h-48 overflow-y-auto">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-slate-300 font-semibold">Emojis</span>
                          <button
                            onClick={() => setShowEmojis(false)}
                            className="text-slate-400 hover:text-white"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-10 gap-2">
                          {emojis.map((emoji, i) => (
                            <button
                              key={i}
                              onClick={() => adicionarEmoji(emoji)}
                              className="text-2xl hover:scale-125 transition-transform"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      {/* Botão Emoji */}
                      <button
                        onClick={() => setShowEmojis(!showEmojis)}
                        className="p-3 bg-slate-700 text-slate-300 hover:text-white rounded-lg hover:bg-slate-600 transition"
                        title="Emojis"
                      >
                        <Smile className="w-5 h-5" />
                      </button>

                      {/* Botão Anexar Imagem */}
                      <label className="p-3 bg-slate-700 text-slate-300 hover:text-white rounded-lg hover:bg-slate-600 transition cursor-pointer" title="Anexar imagem">
                        <ImageIcon className="w-5 h-5" />
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImagemUpload}
                          className="hidden"
                        />
                      </label>

                      {/* Botão Áudio */}
                      {!audioPreview && (
                        <button
                          onClick={gravandoAudio ? pararGravacao : iniciarGravacao}
                          className={`p-3 rounded-lg transition ${
                            gravandoAudio 
                              ? 'bg-red-500 text-white animate-pulse' 
                              : 'bg-slate-700 text-slate-300 hover:text-white hover:bg-slate-600'
                          }`}
                          title={gravandoAudio ? 'Parar gravação' : 'Gravar áudio'}
                        >
                          {gravandoAudio ? <StopCircle className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                        </button>
                      )}

                      {/* Input texto ou botão enviar áudio */}
                      {audioPreview ? (
                        <button
                          onClick={enviarAudio}
                          className="flex-1 px-6 bg-green-500 text-white rounded-lg hover:bg-green-600 transition flex items-center justify-center gap-2"
                        >
                          <Send className="w-5 h-5" />
                          Enviar Áudio
                        </button>
                      ) : (
                        <>
                          <input
                            type="text"
                            value={novaMensagem}
                            onChange={(e) => setNovaMensagem(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && enviarMensagem()}
                            placeholder="Digite sua mensagem..."
                            className="flex-1 px-4 py-3 rounded-lg bg-slate-700 text-white placeholder-slate-400 outline-none"
                            disabled={gravandoAudio}
                          />

                          <button
                            onClick={enviarMensagem}
                            disabled={(!novaMensagem.trim() && !imagemPreview) || gravandoAudio}
                            className="px-6 bg-green-500 text-white rounded-lg hover:bg-green-600 transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Send className="w-5 h-5" />
                            Enviar
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* PAINEL DIREITO - Formulário */}
            {conversaSelecionada && (
              <div className="relative flex">
                {/* ABINHA FIXA SEMPRE VISÍVEL */}
                <div 
                  className="w-12 bg-blue-600 flex flex-col items-center justify-center cursor-pointer hover:bg-blue-700 transition-all"
                  onClick={() => setPainelAberto(!painelAberto)}
                >
                  {/* Ícone User */}
                  <User className="w-6 h-6 text-white mb-2" />
                  
                  {/* Texto Vertical "FUNCIONÁRIO" */}
                  <div className="flex flex-col items-center gap-0.5">
                    {['F','U','N','C','I','O','N','Á','R','I','O'].map((letra, i) => (
                      <span key={i} className="text-white font-bold text-xs">
                        {letra}
                      </span>
                    ))}
                  </div>
                  
                  {/* Seta */}
                  <div className="mt-2 animate-bounce">
                    {painelAberto ? (
                      <ChevronRight className="w-5 h-5 text-white" />
                    ) : (
                      <ChevronLeft className="w-5 h-5 text-white" />
                    )}
                  </div>
                </div>

                {/* Painel deslizante */}
                <div className={`bg-slate-800 border-l border-slate-700 transition-all duration-300 h-full overflow-y-auto ${
                  painelAberto ? 'w-96' : 'w-0 overflow-hidden'
                }`}>
                  <div className="p-6 space-y-4">
                    {/* Header */}
                    <div className="border-b border-slate-700 pb-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                          <User className="w-5 h-5 text-blue-500" />
                          Dados do Funcionário
                        </h3>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={exportarFuncionarios}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition flex items-center gap-1.5 text-xs font-semibold"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Exportar
                          </button>
                          <button
                            onClick={() => setPainelAberto(false)}
                            className="p-1.5 hover:bg-slate-700 rounded-lg transition text-slate-400 hover:text-white"
                            title="Fechar painel"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-slate-400">Complete as informações do funcionário</p>
                    </div>

                    {/* Nome */}
                    <div>
                      <label className="block text-xs font-semibold mb-1 text-slate-300">Nome Completo *</label>
                      <input
                        type="text"
                        value={formFuncionario.nome}
                        onChange={(e) => setFormFuncionario({...formFuncionario, nome: e.target.value})}
                        className="w-full px-3 py-2 text-sm rounded-lg bg-slate-700 text-white"
                      />
                    </div>

                    {/* CPF */}
                    <div>
                      <label className="block text-xs font-semibold mb-1 text-slate-300">CPF</label>
                      <input
                        type="text"
                        value={formFuncionario.cpf}
                        onChange={(e) => setFormFuncionario({...formFuncionario, cpf: e.target.value})}
                        placeholder="000.000.000-00"
                        className="w-full px-3 py-2 text-sm rounded-lg bg-slate-700 text-white placeholder-slate-400"
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-xs font-semibold mb-1 text-slate-300">E-mail Corporativo</label>
                      <input
                        type="email"
                        value={formFuncionario.email}
                        onChange={(e) => setFormFuncionario({...formFuncionario, email: e.target.value})}
                        placeholder="funcionario@empresa.com"
                        className="w-full px-3 py-2 text-sm rounded-lg bg-slate-700 text-white placeholder-slate-400"
                      />
                    </div>

                    {/* Telefone */}
                    <div>
                      <label className="block text-xs font-semibold mb-1 text-slate-300">Telefone</label>
                      <input
                        type="text"
                        value={formFuncionario.telefone}
                        onChange={(e) => setFormFuncionario({...formFuncionario, telefone: e.target.value})}
                        placeholder="(00) 00000-0000"
                        className="w-full px-3 py-2 text-sm rounded-lg bg-slate-700 text-white placeholder-slate-400"
                      />
                    </div>

                    {/* Cargo */}
                    <div>
                      <label className="block text-xs font-semibold mb-1 text-slate-300">Cargo</label>
                      <select
                        value={formFuncionario.cargo}
                        onChange={(e) => setFormFuncionario({...formFuncionario, cargo: e.target.value})}
                        className="w-full px-3 py-2 text-sm rounded-lg bg-slate-700 text-white"
                      >
                        <option value="">Selecione...</option>
                        {cargos.map(cargo => (
                          <option key={cargo} value={cargo}>{cargo}</option>
                        ))}
                      </select>
                    </div>

                    {/* Departamento */}
                    <div>
                      <label className="block text-xs font-semibold mb-1 text-slate-300">Departamento</label>
                      <select
                        value={formFuncionario.departamento}
                        onChange={(e) => setFormFuncionario({...formFuncionario, departamento: e.target.value})}
                        className="w-full px-3 py-2 text-sm rounded-lg bg-slate-700 text-white"
                      >
                        <option value="">Selecione...</option>
                        {departamentos.map(dep => (
                          <option key={dep} value={dep}>{dep}</option>
                        ))}
                      </select>
                    </div>

                    {/* Data de Admissão */}
                    <div>
                      <label className="block text-xs font-semibold mb-1 text-slate-300">Data de Admissão</label>
                      <input
                        type="text"
                        value={formFuncionario.dataAdmissao}
                        onChange={(e) => setFormFuncionario({...formFuncionario, dataAdmissao: e.target.value})}
                        placeholder="DD/MM/AAAA"
                        className="w-full px-3 py-2 text-sm rounded-lg bg-slate-700 text-white placeholder-slate-400"
                      />
                    </div>

                    {/* Salário */}
                    <div>
                      <label className="block text-xs font-semibold mb-1 text-slate-300">Salário</label>
                      <input
                        type="text"
                        value={formFuncionario.salario}
                        onChange={(e) => setFormFuncionario({...formFuncionario, salario: e.target.value})}
                        placeholder="R$ 0,00"
                        className="w-full px-3 py-2 text-sm rounded-lg bg-slate-700 text-white placeholder-slate-400"
                      />
                    </div>

                    {/* Situação */}
                    <div>
                      <label className="block text-xs font-semibold mb-1 text-slate-300">Situação</label>
                      <select
                        value={formFuncionario.situacao}
                        onChange={(e) => setFormFuncionario({...formFuncionario, situacao: e.target.value})}
                        className="w-full px-3 py-2 text-sm rounded-lg bg-slate-700 text-white"
                      >
                        <option value="Ativo">Ativo</option>
                        <option value="Férias">Férias</option>
                        <option value="Afastado">Afastado</option>
                        <option value="Desligado">Desligado</option>
                      </select>
                    </div>

                    {/* Observações */}
                    <div>
                      <label className="block text-xs font-semibold mb-1 text-slate-300">Observações</label>
                      <textarea
                        value={formFuncionario.observacoes}
                        onChange={(e) => setFormFuncionario({...formFuncionario, observacoes: e.target.value})}
                        rows={3}
                        className="w-full px-3 py-2 text-sm rounded-lg bg-slate-700 text-white resize-none"
                      />
                    </div>

                    {/* Documentos */}
                    <div className="border-t border-slate-700 pt-4">
                      <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-purple-500" />
                        Documentos do Funcionário
                      </h4>
                      <div className="p-3 rounded-lg bg-slate-700/50 border border-slate-600 mb-2">
                        <label className="block cursor-pointer">
                          <div className="flex items-center justify-center gap-2 text-sm text-slate-300">
                            <Paperclip className="w-4 h-4" />
                            <span>Adicionar documento</span>
                          </div>
                          <input type="file" className="hidden" accept=".pdf,.jpg,.png" />
                        </label>
                        <p className="text-[10px] text-slate-500 mt-1 text-center">RG, CPF, CNH, Contrato, Holerite, etc (máx. 5MB)</p>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between p-2 rounded bg-slate-700/30 text-xs">
                          <div className="flex items-center gap-2">
                            <FileText className="w-3 h-3 text-blue-400" />
                            <span className="text-slate-300">RG_Funcionario.pdf</span>
                          </div>
                          <button className="text-green-400"><Download className="w-3 h-3" /></button>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded bg-slate-700/30 text-xs">
                          <div className="flex items-center gap-2">
                            <FileText className="w-3 h-3 text-blue-400" />
                            <span className="text-slate-300">Contrato_Trabalho.pdf</span>
                          </div>
                          <button className="text-green-400"><Download className="w-3 h-3" /></button>
                        </div>
                      </div>
                    </div>

                    {/* Botão Salvar */}
                    <button
                      onClick={salvarFuncionario}
                      className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition"
                    >
                      <Save className="w-5 h-5" />
                      Salvar Funcionário
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          )}

          {/* ABA TEMPLATES */}
          {abaAtiva === 'templates' && (
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {templatesMock.map((template) => (
                  <div key={template.id} className="bg-slate-800 border border-slate-700 rounded-xl p-6 hover:border-blue-500 transition-all">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-white font-semibold text-lg mb-2">{template.titulo}</h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium ${
                          template.tipo === 'RH' ? 'bg-purple-500/10 text-purple-400' :
                          template.tipo === 'Geral' ? 'bg-gray-500/10 text-gray-400' : 'bg-blue-500/10 text-blue-400'
                        }`}>
                          {template.tipo}
                        </span>
                      </div>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      <p className="text-slate-400 text-sm"><strong>Assunto:</strong> {template.assunto}</p>
                      <p className="text-slate-300 text-sm line-clamp-3">{template.corpo}</p>
                    </div>

                    <div className="flex flex-wrap gap-1 mb-4">
                      {template.tags.map((tag) => (
                        <span key={tag} className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded">
                          #{tag}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-400 mb-4">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {template.criadoPor}
                      </span>
                      <span className="flex items-center gap-1">
                        <Send className="w-3 h-3" />
                        {template.vezesUsado}x
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg flex items-center justify-center gap-2 text-sm transition-colors">
                        <Eye className="w-4 h-4" />
                        Ver
                      </button>
                      <button className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg transition-colors" title="Copiar">
                        <Copy className="w-4 h-4" />
                      </button>
                      <button className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded-lg transition-colors" title="Editar">
                        <Edit className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ABA COMUNICADOS */}
          {abaAtiva === 'comunicados' && (
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {comunicadosMock.map((comunicado) => (
                  <div key={comunicado.id} className={`bg-slate-800 border-2 rounded-xl p-6 transition-all ${
                    comunicado.prioridade === 'Alta' ? 'border-red-500/50' :
                    comunicado.prioridade === 'Normal' ? 'border-blue-500/50' : 'border-slate-700'
                  }`}>
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="text-white font-bold text-xl flex-1">{comunicado.titulo}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        comunicado.prioridade === 'Alta' ? 'bg-red-500/20 text-red-400' :
                        comunicado.prioridade === 'Normal' ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-500/20 text-gray-400'
                      }`}>
                        {comunicado.prioridade}
                      </span>
                    </div>

                    <p className="text-slate-300 mb-4 leading-relaxed">{comunicado.mensagem}</p>

                    <div className="flex items-center justify-between text-sm text-slate-400 pt-4 border-t border-slate-700">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          {comunicado.autor}
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          {comunicado.visualizacoes} visualizações
                        </span>
                      </div>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {comunicado.dataPublicacao}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {/* MODAL DE VISUALIZAÇÃO DE IMAGEM */}
      {imagemModal && (
        <div 
          className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setImagemModal(null)}
        >
          <button
            onClick={() => setImagemModal(null)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition"
          >
            <X className="w-6 h-6 text-white" />
          </button>
          <img 
            src={imagemModal} 
            alt="Visualização" 
            className="max-w-full max-h-full rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black/50 px-4 py-2 rounded-lg">
            Clique fora ou pressione ESC para fechar
          </div>
        </div>
      )}
    </>
  )
}

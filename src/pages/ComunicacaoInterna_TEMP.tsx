import { useState, useEffect, useRef } from 'react'
import { 
  MessageCircle, X, ArrowRight, Send, User, ChevronLeft, ChevronRight,
  Download, FileText, Paperclip, Search, Users, UserPlus, CheckCircle, Save,
  Smile, Image as ImageIcon, Camera, Mic, StopCircle, Play, Pause
} from 'lucide-react'
import * as XLSX from 'xlsx'

// Tipos
interface Conversa {
  id: string
  nome: string
  telefone: string
  ultimaMensagem: string
  naoLidas: number
  hora: string
}

interface Mensagem {
  id: string
  texto: string
  remetente: 'cliente' | 'atendente'
  hora: string
  imagem?: string
  nomeArquivo?: string
  audio?: string
}

// Dados mock
const conversasMock: Conversa[] = [
  { id: '1', nome: 'João Silva', telefone: '(11) 98765-4321', ultimaMensagem: 'Gostaria de saber sobre os serviços', naoLidas: 3, hora: '18:45' },
  { id: '2', nome: 'Maria Santos', telefone: '(11) 99876-5432', ultimaMensagem: 'Obrigada pelo atendimento!', naoLidas: 0, hora: '17:30' },
  { id: '3', nome: 'Pedro Oliveira', telefone: '(11) 97654-3210', ultimaMensagem: 'Olá, preciso de ajuda', naoLidas: 1, hora: '16:15' }
]

const mensagensMock: Record<string, Mensagem[]> = {
  '1': [
    { id: 'm1', texto: 'Olá, gostaria de saber sobre os serviços', remetente: 'cliente', hora: '18:40' },
    { id: 'm2', texto: 'Olá! Podemos ajudá-lo. Qual serviço te interessa?', remetente: 'atendente', hora: '18:42' },
    { id: 'm3', texto: 'Gostaria de saber sobre os serviços', remetente: 'cliente', hora: '18:45' }
  ],
  '2': [
    { id: 'm4', texto: 'Obrigada pelo atendimento!', remetente: 'cliente', hora: '17:30' },
    { id: 'm5', texto: 'Por nada! Estamos à disposição.', remetente: 'atendente', hora: '17:31' }
  ]
}

const nichosModalidades: Record<string, string[]> = {
  'Odontologia': ['Clareamento Dental', 'Implante Dentário', 'Ortodontia (Aparelho)', 'Limpeza/Profilaxia', 'Canal (Endodontia)'],
  'Corban/INSS': ['Aposentadoria por Idade', 'Empréstimo Consignado', 'Refinanciamento', 'Portabilidade', 'BPC/LOAS'],
  'Advocacia': ['Direito Civil', 'Direito Trabalhista', 'Direito Criminal', 'Direito de Família', 'Direito Previdenciário'],
  'Clínica Médica': ['Clínico Geral', 'Cardiologia', 'Dermatologia', 'Ortopedia', 'Pediatria'],
  'Psicologia': ['Terapia Individual', 'Terapia de Casal', 'Terapia Familiar', 'Avaliação Psicológica']
}

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

export default function ChatCenter() {
  const [modalOpen, setModalOpen] = useState(false)
  const [conversas, setConversas] = useState<Conversa[]>(() => {
    // Carregar conversas salvas do localStorage
    const salvas = localStorage.getItem('nexus_conversas')
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
  
  // Form cliente
  const [formCliente, setFormCliente] = useState({
    nome: '',
    cpf: '',
    telefone: '',
    whatsapp: '',
    email: '',
    empresa: '',
    nicho: '',
    modalidade: '',
    status: 'Lead',
    observacoes: ''
  })

  // Salvar conversas no localStorage sempre que mudar
  useEffect(() => {
    localStorage.setItem('nexus_conversas', JSON.stringify(conversas))
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

  // Carregar mensagens e ficha do cliente
  useEffect(() => {
    if (conversaSelecionada) {
      setMensagens(mensagensMock[conversaSelecionada.id] || [])
      
      // Tentar carregar ficha salva
      const fichasSalvas = JSON.parse(localStorage.getItem('nexus_fichas_clientes') || '{}')
      const fichaSalva = fichasSalvas[conversaSelecionada.id]
      
      if (fichaSalva) {
        // Carregar ficha salva
        setFormCliente(fichaSalva)
        if (fichaSalva.mensagens) {
          setMensagens(fichaSalva.mensagens)
        }
      } else {
        // Dados iniciais
        setFormCliente({
          nome: conversaSelecionada.nome,
          cpf: '123.456.789-00',
          telefone: '(11) 98765-4321',
          whatsapp: conversaSelecionada.telefone,
          email: 'cliente@email.com',
          empresa: 'Empresa XYZ',
          nicho: 'Corban/INSS',
          modalidade: 'Empréstimo Consignado',
          status: 'Lead',
          observacoes: 'Cliente interessado'
        })
      }
    }
  }, [conversaSelecionada])

  const enviarMensagem = () => {
    if ((!novaMensagem.trim() && !imagemPreview) || !conversaSelecionada) return
    
    const nova: Mensagem = {
      id: 'm' + Date.now(),
      texto: novaMensagem.trim(),
      remetente: 'atendente',
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
      remetente: 'atendente',
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

  const salvarCliente = () => {
    if (!conversaSelecionada || !formCliente.nome.trim()) {
      alert('⚠️ Preencha ao menos o nome do cliente!')
      return
    }

    // Atualizar conversa com dados do cliente
    const conversaAtualizada = {
      ...conversaSelecionada,
      nome: formCliente.nome.trim(),
      telefone: formCliente.whatsapp || formCliente.telefone
    }

    // Atualizar lista de conversas
    setConversas(conversas.map(c => 
      c.id === conversaSelecionada.id ? conversaAtualizada : c
    ))

    // Salvar ficha completa no localStorage
    const fichasClientes = JSON.parse(localStorage.getItem('nexus_fichas_clientes') || '{}')
    fichasClientes[conversaSelecionada.id] = {
      ...formCliente,
      salvoEm: new Date().toISOString(),
      conversaId: conversaSelecionada.id,
      mensagens: mensagens
    }
    localStorage.setItem('nexus_fichas_clientes', JSON.stringify(fichasClientes))

    // Fazer backup geral
    const backup = {
      conversas: conversas.map(c => 
        c.id === conversaSelecionada.id ? conversaAtualizada : c
      ),
      fichas: fichasClientes,
      backupEm: new Date().toISOString()
    }
    localStorage.setItem('nexus_backup', JSON.stringify(backup))

    alert('✅ Cliente salvo com sucesso!\n📦 Backup automático realizado!')
    
    // Atualizar conversa selecionada
    setConversaSelecionada(conversaAtualizada)
    
    // Fechar painel automaticamente
    setPainelAberto(false)
  }

  const exportarClientes = () => {
    const dados = conversas.map(c => ({
      'Nome': c.nome,
      'Telefone': c.telefone,
      'Última Mensagem': c.ultimaMensagem,
      'Horário': c.hora
    }))
    const ws = XLSX.utils.json_to_sheet(dados)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Clientes')
    XLSX.writeFile(wb, `Clientes_WhatsApp_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.xlsx`)
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
          className="px-8 py-4 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold text-lg flex items-center gap-3 transition-all transform hover:scale-105 shadow-2xl"
        >
          <MessageCircle className="w-7 h-7" />
          Abrir Nexus Atendimento
          <ArrowRight className="w-6 h-6" />
        </button>
      </div>

      {/* Modal Fullscreen */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900 flex flex-col">
          {/* Header */}
          <div className="p-4 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <MessageCircle className="w-7 h-7 text-green-500" />
              Nexus Atendimento WhatsApp
            </h1>
            <button
              onClick={() => setModalOpen(false)}
              className="p-2 hover:bg-slate-700 rounded-lg transition text-slate-400 hover:text-white"
              title="Fechar (ESC)"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Conteúdo do Chat */}
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
                      <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                        {conv.nome[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-semibold text-white text-sm truncate">{conv.nome}</h3>
                          {conv.naoLidas > 0 && (
                            <span className="bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                              {conv.naoLidas}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 truncate">{conv.telefone}</p>
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
                      <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white font-bold">
                        {conversaSelecionada.nome[0]}
                      </div>
                      <div>
                        <h3 className="font-bold text-white">{conversaSelecionada.nome}</h3>
                        <p className="text-xs text-slate-400">{conversaSelecionada.telefone}</p>
                      </div>
                    </div>
                  </div>

                  {/* Mensagens */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {mensagens.map(msg => (
                      <div key={msg.id} className={`flex ${msg.remetente === 'atendente' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[70%] rounded-lg px-4 py-2 ${
                          msg.remetente === 'atendente' ? 'bg-green-500 text-white' : 'bg-slate-700 text-white'
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
                  className="w-12 bg-green-500 flex flex-col items-center justify-center cursor-pointer hover:bg-green-600 transition-all"
                  onClick={() => setPainelAberto(!painelAberto)}
                >
                  {/* Ícone User */}
                  <User className="w-6 h-6 text-white mb-2" />
                  
                  {/* Texto Vertical "CLIENTE" */}
                  <div className="flex flex-col items-center gap-1">
                    {['C','L','I','E','N','T','E'].map((letra, i) => (
                      <span key={i} className="text-white font-bold text-sm">
                        {letra}
                      </span>
                    ))}
                  </div>
                  
                  {/* Seta */}
                  <div className="mt-4 animate-bounce">
                    {painelAberto ? (
                      <ChevronRight className="w-6 h-6 text-white" />
                    ) : (
                      <ChevronLeft className="w-6 h-6 text-white" />
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
                          Dados do Cliente
                        </h3>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={exportarClientes}
                            className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg transition flex items-center gap-1.5 text-xs font-semibold"
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
                      <p className="text-xs text-slate-400">Complete as informações do cliente</p>
                    </div>

                    {/* Nome */}
                    <div>
                      <label className="block text-xs font-semibold mb-1 text-slate-300">Nome Completo *</label>
                      <input
                        type="text"
                        value={formCliente.nome}
                        onChange={(e) => setFormCliente({...formCliente, nome: e.target.value})}
                        className="w-full px-3 py-2 text-sm rounded-lg bg-slate-700 text-white"
                      />
                    </div>

                    {/* CPF */}
                    <div>
                      <label className="block text-xs font-semibold mb-1 text-slate-300">CPF</label>
                      <input
                        type="text"
                        value={formCliente.cpf}
                        onChange={(e) => setFormCliente({...formCliente, cpf: e.target.value})}
                        placeholder="000.000.000-00"
                        className="w-full px-3 py-2 text-sm rounded-lg bg-slate-700 text-white placeholder-slate-400"
                      />
                    </div>

                    {/* Telefone */}
                    <div>
                      <label className="block text-xs font-semibold mb-1 text-slate-300">Telefone</label>
                      <input
                        type="text"
                        value={formCliente.telefone}
                        onChange={(e) => setFormCliente({...formCliente, telefone: e.target.value})}
                        placeholder="(00) 00000-0000"
                        className="w-full px-3 py-2 text-sm rounded-lg bg-slate-700 text-white placeholder-slate-400"
                      />
                    </div>

                    {/* WhatsApp */}
                    <div>
                      <label className="block text-xs font-semibold mb-1 text-slate-300">WhatsApp</label>
                      <input
                        type="text"
                        value={formCliente.whatsapp}
                        onChange={(e) => setFormCliente({...formCliente, whatsapp: e.target.value})}
                        placeholder="(00) 00000-0000"
                        className="w-full px-3 py-2 text-sm rounded-lg bg-slate-700 text-white placeholder-slate-400"
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-xs font-semibold mb-1 text-slate-300">E-mail</label>
                      <input
                        type="email"
                        value={formCliente.email}
                        onChange={(e) => setFormCliente({...formCliente, email: e.target.value})}
                        className="w-full px-3 py-2 text-sm rounded-lg bg-slate-700 text-white"
                      />
                    </div>

                    {/* Nicho */}
                    <div>
                      <label className="block text-xs font-semibold mb-1 text-slate-300">Nicho/Segmento</label>
                      <select
                        value={formCliente.nicho}
                        onChange={(e) => setFormCliente({...formCliente, nicho: e.target.value, modalidade: ''})}
                        className="w-full px-3 py-2 text-sm rounded-lg bg-slate-700 text-white"
                      >
                        <option value="">Selecione</option>
                        {Object.keys(nichosModalidades).map(n => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </div>

                    {/* Modalidade */}
                    {formCliente.nicho && (
                      <div>
                        <label className="block text-xs font-semibold mb-1 text-slate-300">Modalidade/Serviço</label>
                        <select
                          value={formCliente.modalidade}
                          onChange={(e) => setFormCliente({...formCliente, modalidade: e.target.value})}
                          className="w-full px-3 py-2 text-sm rounded-lg bg-slate-700 text-white"
                        >
                          <option value="">Selecione</option>
                          {nichosModalidades[formCliente.nicho].map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Status */}
                    <div>
                      <label className="block text-xs font-semibold mb-1 text-slate-300">Status</label>
                      <select
                        value={formCliente.status}
                        onChange={(e) => setFormCliente({...formCliente, status: e.target.value})}
                        className="w-full px-3 py-2 text-sm rounded-lg bg-slate-700 text-white"
                      >
                        <option value="Lead">Lead</option>
                        <option value="Contato Feito">Contato Feito</option>
                        <option value="Qualificado">Qualificado</option>
                        <option value="Cliente">Cliente</option>
                      </select>
                    </div>

                    {/* Observações */}
                    <div>
                      <label className="block text-xs font-semibold mb-1 text-slate-300">Observações</label>
                      <textarea
                        value={formCliente.observacoes}
                        onChange={(e) => setFormCliente({...formCliente, observacoes: e.target.value})}
                        rows={3}
                        className="w-full px-3 py-2 text-sm rounded-lg bg-slate-700 text-white resize-none"
                      />
                    </div>

                    {/* Documentos */}
                    <div className="border-t border-slate-700 pt-4">
                      <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-purple-500" />
                        Documentos
                      </h4>
                      <div className="p-3 rounded-lg bg-slate-700/50 border border-slate-600 mb-2">
                        <label className="block cursor-pointer">
                          <div className="flex items-center justify-center gap-2 text-sm text-slate-300">
                            <Paperclip className="w-4 h-4" />
                            <span>Adicionar documento</span>
                          </div>
                          <input type="file" className="hidden" accept=".pdf,.jpg,.png" />
                        </label>
                        <p className="text-[10px] text-slate-500 mt-1 text-center">PDF, JPG, PNG (máx. 5MB)</p>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded bg-slate-700/30 text-xs">
                        <div className="flex items-center gap-2">
                          <FileText className="w-3 h-3 text-blue-400" />
                          <span className="text-slate-300">RG_Cliente.pdf</span>
                        </div>
                        <button className="text-green-400"><Download className="w-3 h-3" /></button>
                      </div>
                    </div>

                    {/* Botão Salvar */}
                    <button
                      onClick={salvarCliente}
                      className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition font-semibold flex items-center justify-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      Salvar Cliente
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
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

import { useState, useEffect } from 'react'
import { 
  MessageSquare, 
  Send, 
  Phone, 
  Video, 
  MoreVertical,
  Search,
  X,
  User,
  Building2,
  Mail,
  MapPin,
  Calendar,
  DollarSign,
  FileText,
  Edit,
  Save,
  Trash2
} from 'lucide-react'
import { db } from '../firebase'
import { collection, addDoc, getDocs, updateDoc, doc, serverTimestamp } from 'firebase/firestore'

interface Mensagem {
  id: string
  texto: string
  horario: string
  remetente: 'cliente' | 'atendente'
  lida: boolean
}

interface Conversa {
  id: string
  clienteId: string
  nomeCliente: string
  telefone: string
  ultimaMensagem: string
  horarioUltimaMensagem: string
  naoLidas: number
  status: 'online' | 'offline'
  avatar?: string
}

interface Cliente {
  id: string
  nome: string
  cpf: string
  telefone: string
  email: string
  empresa: string
  endereco: string
  cidade: string
  estado: string
  dataNascimento: string
  historico: string
  observacoes: string
  funil: string
  responsavel: string
  modalidade: string
  status: string
  dataCadastro: Date
}

export default function NexusAtendimento() {
  const [conversas, setConversas] = useState<Conversa[]>([])
  const [conversaSelecionada, setConversaSelecionada] = useState<Conversa | null>(null)
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [novaMensagem, setNovaMensagem] = useState('')
  const [busca, setBusca] = useState('')
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [editando, setEditando] = useState(true) // Já começa editando!

  // Estados do formulário
  const [formNome, setFormNome] = useState('')
  const [formCPF, setFormCPF] = useState('')
  const [formTelefone, setFormTelefone] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formEmpresa, setFormEmpresa] = useState('')
  const [formEndereco, setFormEndereco] = useState('')
  const [formCidade, setFormCidade] = useState('')
  const [formEstado, setFormEstado] = useState('')
  const [formDataNascimento, setFormDataNascimento] = useState('')
  const [formHistorico, setFormHistorico] = useState('')
  const [formObservacoes, setFormObservacoes] = useState('')
  const [formFunil, setFormFunil] = useState('')
  const [formResponsavel, setFormResponsavel] = useState('')
  const [formModalidade, setFormModalidade] = useState('')
  const [formStatus, setFormStatus] = useState('')

  useEffect(() => {
    carregarConversas()
  }, [])

  const carregarConversas = () => {
    // Dados simulados - substituir por Firestore depois
    const conversasSimuladas: Conversa[] = [
      {
        id: '1',
        clienteId: 'c1',
        nomeCliente: 'João Silva',
        telefone: '(11) 99999-1111',
        ultimaMensagem: 'Gostaria de saber mais sobre os planos',
        horarioUltimaMensagem: '10:30',
        naoLidas: 2,
        status: 'online'
      },
      {
        id: '2',
        clienteId: 'c2',
        nomeCliente: 'Maria Santos',
        telefone: '(11) 99999-2222',
        ultimaMensagem: 'Quando posso agendar?',
        horarioUltimaMensagem: '09:15',
        naoLidas: 1,
        status: 'offline'
      },
      {
        id: '3',
        clienteId: 'c3',
        nomeCliente: 'Pedro Costa',
        telefone: '(11) 99999-3333',
        ultimaMensagem: 'Obrigado pelo atendimento!',
        horarioUltimaMensagem: 'Ontem',
        naoLidas: 0,
        status: 'offline'
      }
    ]
    setConversas(conversasSimuladas)
  }

  const carregarCliente = async (clienteId: string) => {
    // Simular carregamento do cliente
    const clienteSimulado: Cliente = {
      id: clienteId,
      nome: conversaSelecionada?.nomeCliente || '',
      cpf: '123.456.789-00',
      telefone: conversaSelecionada?.telefone || '',
      email: 'cliente@email.com',
      empresa: 'Empresa Exemplo Ltda',
      endereco: 'Rua Exemplo, 123',
      cidade: 'São Paulo',
      estado: 'SP',
      historico: 'Cliente desde 2025. Já realizou 3 compras.',
      observacoes: 'Cliente VIP. Sempre pontual nos pagamentos.',
      funil: 'Em Atendimento',
      responsavel: 'Ana Costa',
      modalidade: 'Plano Premium',
      status: 'Ativo',
      dataCadastro: new Date('2025-01-15')
    }
    
    setCliente(clienteSimulado)
    preencherFormulario(clienteSimulado)
  }

  const preencherFormulario = (cliente: Cliente) => {
    setFormNome(cliente.nome)
    setFormCPF(cliente.cpf)
    setFormTelefone(cliente.telefone)
    setFormEmail(cliente.email)
    setFormEmpresa(cliente.empresa)
    setFormEndereco(cliente.endereco)
    setFormCidade(cliente.cidade)
    setFormEstado(cliente.estado)
    setFormHistorico(cliente.historico)
    setFormObservacoes(cliente.observacoes)
    setFormFunil(cliente.funil)
    setFormResponsavel(cliente.responsavel)
    setFormModalidade(cliente.modalidade)
    setFormStatus(cliente.status)
  }

  const selecionarConversa = (conversa: Conversa) => {
    setConversaSelecionada(conversa)
    setMostrarFormulario(true)
    carregarCliente(conversa.clienteId)
    carregarMensagens(conversa.id)
  }

  const carregarMensagens = (conversaId: string) => {
    // Mensagens simuladas
    const mensagensSimuladas: Mensagem[] = [
      {
        id: '1',
        texto: 'Olá! Gostaria de saber mais sobre os planos',
        horario: '10:25',
        remetente: 'cliente',
        lida: true
      },
      {
        id: '2',
        texto: 'Olá! Claro, temos 3 planos disponíveis. Qual seu interesse?',
        horario: '10:26',
        remetente: 'atendente',
        lida: true
      },
      {
        id: '3',
        texto: 'Quero saber sobre o plano premium',
        horario: '10:30',
        remetente: 'cliente',
        lida: false
      }
    ]
    setMensagens(mensagensSimuladas)
  }

  const enviarMensagem = () => {
    if (!novaMensagem.trim()) return

    const novaMensagemObj: Mensagem = {
      id: Date.now().toString(),
      texto: novaMensagem,
      horario: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      remetente: 'atendente',
      lida: true
    }

    setMensagens([...mensagens, novaMensagemObj])
    setNovaMensagem('')
  }

  const salvarCliente = async () => {
    if (!cliente) return

    try {
      const clienteAtualizado: Cliente = {
        ...cliente,
        nome: formNome,
        cpf: formCPF,
        telefone: formTelefone,
        email: formEmail,
        empresa: formEmpresa,
        endereco: formEndereco,
        cidade: formCidade,
        estado: formEstado,
        historico: formHistorico,
        observacoes: formObservacoes,
        funil: formFunil,
        responsavel: formResponsavel,
        modalidade: formModalidade,
        status: formStatus
      }

      // Aqui você salvaria no Firestore
      // await updateDoc(doc(db, 'clientes', cliente.id), clienteAtualizado)

      setCliente(clienteAtualizado)
      setEditando(false)
      alert('✅ Cliente atualizado com sucesso!')
    } catch (error) {
      console.error('Erro ao salvar:', error)
      alert('❌ Erro ao salvar cliente')
    }
  }

  const conversasFiltradas = conversas.filter(c =>
    c.nomeCliente.toLowerCase().includes(busca.toLowerCase()) ||
    c.telefone.includes(busca)
  )

  return (
    <div className="h-screen bg-slate-900 flex">
      {/* Sidebar - Lista de Conversas */}
      <div className="w-96 bg-slate-800 border-r border-slate-700 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-700">
          <h1 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
            <MessageSquare className="w-6 h-6 text-green-400" />
            Nexus Atendimento
          </h1>
          
          {/* Busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar conversa..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full bg-slate-700 text-white pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>

        {/* Lista de Conversas */}
        <div className="flex-1 overflow-y-auto">
          {conversasFiltradas.map((conversa) => (
            <div
              key={conversa.id}
              onClick={() => selecionarConversa(conversa)}
              className={`p-4 border-b border-slate-700 cursor-pointer transition-colors hover:bg-slate-700 ${
                conversaSelecionada?.id === conversa.id ? 'bg-slate-700' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className="relative">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-white font-bold">
                    {conversa.nomeCliente.charAt(0)}
                  </div>
                  {conversa.status === 'online' && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-slate-800 rounded-full"></div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="text-white font-semibold truncate">{conversa.nomeCliente}</h3>
                    <span className="text-xs text-slate-400">{conversa.horarioUltimaMensagem}</span>
                  </div>
                  <p className="text-sm text-slate-400 truncate">{conversa.ultimaMensagem}</p>
                  <p className="text-xs text-slate-500 mt-1">{conversa.telefone}</p>
                </div>

                {/* Badge não lidas */}
                {conversa.naoLidas > 0 && (
                  <div className="bg-green-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                    {conversa.naoLidas}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Área Principal */}
      <div className="flex-1 flex">
        {!conversaSelecionada ? (
          <div className="flex-1 flex items-center justify-center bg-slate-900">
            <div className="text-center text-slate-500">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">Selecione uma conversa para iniciar</p>
            </div>
          </div>
        ) : (
          <>
            {/* Chat */}
            <div className="flex-1 flex flex-col">
              {/* Header do Chat */}
              <div className="bg-slate-800 border-b border-slate-700 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-white font-bold">
                    {conversaSelecionada.nomeCliente.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-white font-semibold">{conversaSelecionada.nomeCliente}</h2>
                    <p className="text-sm text-slate-400">{conversaSelecionada.telefone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors">
                    <Phone className="w-5 h-5" />
                  </button>
                  <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors">
                    <Video className="w-5 h-5" />
                  </button>
                  <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Mensagens */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-900">
                {mensagens.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.remetente === 'atendente' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                        msg.remetente === 'atendente'
                          ? 'bg-green-600 text-white'
                          : 'bg-slate-700 text-white'
                      }`}
                    >
                      <p className="text-sm">{msg.texto}</p>
                      <p className={`text-xs mt-1 ${
                        msg.remetente === 'atendente' ? 'text-green-200' : 'text-slate-400'
                      }`}>
                        {msg.horario}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Input de Mensagem */}
              <div className="bg-slate-800 border-t border-slate-700 p-4">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Digite sua mensagem..."
                    value={novaMensagem}
                    onChange={(e) => setNovaMensagem(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && enviarMensagem()}
                    className="flex-1 bg-slate-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <button
                    onClick={enviarMensagem}
                    className="bg-green-600 hover:bg-green-700 text-white p-3 rounded-lg transition-colors"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Painel de Informações do Cliente */}
            {mostrarFormulario && cliente && (
              <div className="w-96 bg-slate-800 border-l border-slate-700 overflow-y-auto">
                <div className="p-4">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold text-white">Dados do Cliente</h2>
                    <button
                      onClick={() => setMostrarFormulario(false)}
                      className="p-2 text-slate-400 hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Formulário */}
                  <div className="space-y-4">
                    {/* Dados Pessoais */}
                    <div>
                      <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Dados Pessoais
                      </h3>
                      
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs text-slate-400 block mb-1">Nome</label>
                          <input
                            type="text"
                            value={formNome}
                            onChange={(e) => setFormNome(e.target.value)}
                            className="w-full bg-slate-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                          />
                        </div>

                        <div>
                          <label className="text-xs text-slate-400 block mb-1">CPF</label>
                          <input
                            type="text"
                            value={formCPF}
                            onChange={(e) => setFormCPF(e.target.value)}
                            className="w-full bg-slate-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                          />
                        </div>

                        <div>
                          <label className="text-xs text-slate-400 block mb-1">Telefone</label>
                          <input
                            type="text"
                            value={formTelefone}
                            onChange={(e) => setFormTelefone(e.target.value)}
                            className="w-full bg-slate-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                          />
                        </div>

                        <div>
                          <label className="text-xs text-slate-400 block mb-1">Email</label>
                          <input
                            type="email"
                            value={formEmail}
                            onChange={(e) => setFormEmail(e.target.value)}
                            className="w-full bg-slate-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Empresa */}
                    <div>
                      <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        Empresa
                      </h3>
                      
                      <input
                        type="text"
                        value={formEmpresa}
                        onChange={(e) => setFormEmpresa(e.target.value)}
                        className="w-full bg-slate-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>

                    {/* Endereço */}
                    <div>
                      <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        Endereço
                      </h3>
                      
                      <div className="space-y-3">
                        <input
                          type="text"
                          placeholder="Endereço"
                          value={formEndereco}
                          onChange={(e) => setFormEndereco(e.target.value)}
                          className="w-full bg-slate-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                        
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            placeholder="Cidade"
                            value={formCidade}
                            onChange={(e) => setFormCidade(e.target.value)}
                            disabled={!editando}
                            className="w-full bg-slate-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                          />
                          <input
                            type="text"
                            placeholder="Estado"
                            value={formEstado}
                            onChange={(e) => setFormEstado(e.target.value)}
                            disabled={!editando}
                            className="w-full bg-slate-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Atendimento */}
                    <div>
                      <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Atendimento
                      </h3>
                      
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs text-slate-400 block mb-1">Funil</label>
                          <select
                            value={formFunil}
                            onChange={(e) => setFormFunil(e.target.value)}
                            className="w-full bg-slate-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                          >
                            <option value="Lead">Lead</option>
                            <option value="Em Atendimento">Em Atendimento</option>
                            <option value="Proposta">Proposta</option>
                            <option value="Negociação">Negociação</option>
                            <option value="Fechado">Fechado</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-xs text-slate-400 block mb-1">Responsável</label>
                          <input
                            type="text"
                            value={formResponsavel}
                            onChange={(e) => setFormResponsavel(e.target.value)}
                            className="w-full bg-slate-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                          />
                        </div>

                        <div>
                          <label className="text-xs text-slate-400 block mb-1">Modalidade</label>
                          <input
                            type="text"
                            value={formModalidade}
                            onChange={(e) => setFormModalidade(e.target.value)}
                            className="w-full bg-slate-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                          />
                        </div>

                        <div>
                          <label className="text-xs text-slate-400 block mb-1">Status</label>
                          <select
                            value={formStatus}
                            onChange={(e) => setFormStatus(e.target.value)}
                            className="w-full bg-slate-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                          >
                            <option value="Ativo">Ativo</option>
                            <option value="Inativo">Inativo</option>
                            <option value="Aguardando">Aguardando</option>
                            <option value="Cancelado">Cancelado</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Histórico */}
                    <div>
                      <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Histórico
                      </h3>
                      
                      <textarea
                        value={formHistorico}
                        onChange={(e) => setFormHistorico(e.target.value)}
                        disabled={!editando}
                        rows={3}
                        className="w-full bg-slate-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 resize-none"
                      />
                    </div>

                    {/* Observações */}
                    <div>
                      <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Observações
                      </h3>
                      
                      <textarea
                        value={formObservacoes}
                        onChange={(e) => setFormObservacoes(e.target.value)}
                        disabled={!editando}
                        rows={3}
                        className="w-full bg-slate-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 resize-none"
                      />
                    </div>

                    {/* Data de Cadastro */}
                    <div className="pt-4 border-t border-slate-700 mb-4">
                      <p className="text-xs text-slate-500">
                        Cliente desde: {cliente.dataCadastro.toLocaleDateString('pt-BR')}
                      </p>
                    </div>

                    {/* Botão Salvar Grande */}
                    <button
                      onClick={salvarCliente}
                      className="w-full bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all shadow-lg hover:shadow-xl"
                    >
                      <Save className="w-6 h-6" />
                      SALVAR ALTERAÇÕES
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

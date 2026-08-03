import { useState } from 'react'
import { 
  FileText, 
  Search, 
  Filter, 
  Plus,
  Building2,
  Calendar,
  DollarSign,
  User,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  FileCheck,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Download,
  Upload,
  Edit,
  Trash2,
  Eye,
  Send,
  Save,
  X,
  ChevronRight,
  Landmark,
  Shield,
  Briefcase,
  TrendingUp,
  Activity,
  BarChart3,
  Users,
  Settings
} from 'lucide-react'

// Tipos
type StatusDigitacao = 'Todos' | 'Rascunho' | 'Aguardando' | 'Em Digitação' | 'Digitado' | 'Aprovado' | 'Recusado'
type TipoOperacao = 'Consignado INSS' | 'Consignado SIAPE' | 'FGTS' | 'Cartão Consignado' | 'Refinanciamento' | 'Portabilidade' | 'Empréstimo Pessoal'
type BancoConvenio = 'C6' | 'Facta' | 'BMG' | 'Safra' | 'Pan' | 'Itaú' | 'Bradesco' | 'Santander' | 'Banco do Brasil' | 'Caixa'

interface Digitacao {
  id: string
  cliente: string
  cpf: string
  tipoOperacao: TipoOperacao
  banco: BancoConvenio
  valorSolicitado: number
  parcelas: number
  status: StatusDigitacao
  dataInclusao: string
  dataPrevista: string
  responsavel: string
  observacoes: string
  protocolo?: string
  taxa?: number
  valorAprovado?: number
}

export default function Digitacao() {
  const [filtroStatus, setFiltroStatus] = useState<StatusDigitacao>('Todos')
  const [busca, setBusca] = useState('')
  const [mostrarModalNova, setMostrarModalNova] = useState(false)
  const [digitacaoSelecionada, setDigitacaoSelecionada] = useState<Digitacao | null>(null)
  const [mostrarDetalhes, setMostrarDetalhes] = useState(false)

  // Dados simulados
  const digitacoes: Digitacao[] = [
    {
      id: '1',
      cliente: 'João Silva Santos',
      cpf: '123.456.789-00',
      tipoOperacao: 'Consignado INSS',
      banco: 'C6',
      valorSolicitado: 15000,
      parcelas: 84,
      status: 'Em Digitação',
      dataInclusao: '2024-01-15',
      dataPrevista: '2024-01-20',
      responsavel: 'Carlos Mendes',
      observacoes: 'Cliente aguardando urgente',
      protocolo: 'DIG-2024-001',
      taxa: 1.89
    },
    {
      id: '2',
      cliente: 'Maria Oliveira Costa',
      cpf: '987.654.321-00',
      tipoOperacao: 'FGTS',
      banco: 'Facta',
      valorSolicitado: 8500,
      parcelas: 12,
      status: 'Digitado',
      dataInclusao: '2024-01-14',
      dataPrevista: '2024-01-18',
      responsavel: 'Ana Paula',
      observacoes: '',
      protocolo: 'DIG-2024-002',
      taxa: 1.99,
      valorAprovado: 8500
    },
    {
      id: '3',
      cliente: 'Pedro Henrique Lima',
      cpf: '456.789.123-00',
      tipoOperacao: 'Cartão Consignado',
      banco: 'BMG',
      valorSolicitado: 3000,
      parcelas: 24,
      status: 'Aprovado',
      dataInclusao: '2024-01-13',
      dataPrevista: '2024-01-17',
      responsavel: 'Carlos Mendes',
      observacoes: 'Aprovado com limite reduzido',
      protocolo: 'DIG-2024-003',
      taxa: 2.15,
      valorAprovado: 2500
    },
    {
      id: '4',
      cliente: 'Ana Beatriz Souza',
      cpf: '321.654.987-00',
      tipoOperacao: 'Refinanciamento',
      banco: 'Pan',
      valorSolicitado: 25000,
      parcelas: 72,
      status: 'Aguardando',
      dataInclusao: '2024-01-16',
      dataPrevista: '2024-01-22',
      responsavel: 'Ana Paula',
      observacoes: 'Aguardando documentação complementar',
      protocolo: 'DIG-2024-004'
    },
    {
      id: '5',
      cliente: 'Carlos Eduardo Alves',
      cpf: '789.123.456-00',
      tipoOperacao: 'Consignado SIAPE',
      banco: 'Safra',
      valorSolicitado: 50000,
      parcelas: 96,
      status: 'Recusado',
      dataInclusao: '2024-01-12',
      dataPrevista: '2024-01-16',
      responsavel: 'Carlos Mendes',
      observacoes: 'Recusado - margem insuficiente',
      protocolo: 'DIG-2024-005'
    }
  ]

  // Filtros de status
  const statusFiltros: StatusDigitacao[] = [
    'Todos',
    'Rascunho',
    'Aguardando',
    'Em Digitação',
    'Digitado',
    'Aprovado',
    'Recusado'
  ]

  // Bancos/Convênios disponíveis
  const bancosDisponiveis: { nome: BancoConvenio; cor: string; icone: string }[] = [
    { nome: 'C6', cor: 'bg-gray-900', icone: '🏦' },
    { nome: 'Facta', cor: 'bg-blue-600', icone: '💼' },
    { nome: 'BMG', cor: 'bg-orange-600', icone: '🏢' },
    { nome: 'Safra', cor: 'bg-purple-600', icone: '💰' },
    { nome: 'Pan', cor: 'bg-blue-500', icone: '🏦' },
    { nome: 'Itaú', cor: 'bg-orange-500', icone: '🔶' },
    { nome: 'Bradesco', cor: 'bg-red-600', icone: '🔴' },
    { nome: 'Santander', cor: 'bg-red-500', icone: '⭕' },
    { nome: 'Banco do Brasil', cor: 'bg-yellow-500', icone: '🟡' },
    { nome: 'Caixa', cor: 'bg-blue-700', icone: '🔵' }
  ]

  // Cores por status
  const getStatusColor = (status: StatusDigitacao) => {
    const cores: Record<StatusDigitacao, string> = {
      'Todos': 'bg-gray-100 text-gray-700',
      'Rascunho': 'bg-gray-100 text-gray-700',
      'Aguardando': 'bg-yellow-100 text-yellow-700',
      'Em Digitação': 'bg-blue-100 text-blue-700',
      'Digitado': 'bg-purple-100 text-purple-700',
      'Aprovado': 'bg-green-100 text-green-700',
      'Recusado': 'bg-red-100 text-red-700'
    }
    return cores[status]
  }

  // Filtrar digitações
  const digitacoesFiltradas = digitacoes.filter(dig => {
    const matchStatus = filtroStatus === 'Todos' || dig.status === filtroStatus
    const matchBusca =
      dig.cliente.toLowerCase().includes(busca.toLowerCase()) ||
      dig.cpf.includes(busca) ||
      dig.protocolo?.includes(busca) ||
      dig.banco.toLowerCase().includes(busca.toLowerCase())
    return matchStatus && matchBusca
  })

  // Estatísticas
  const stats = {
    total: digitacoes.length,
    aguardando: digitacoes.filter(d => d.status === 'Aguardando').length,
    emDigitacao: digitacoes.filter(d => d.status === 'Em Digitação').length,
    digitados: digitacoes.filter(d => d.status === 'Digitado').length,
    aprovados: digitacoes.filter(d => d.status === 'Aprovado').length,
    recusados: digitacoes.filter(d => d.status === 'Recusado').length
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <FileText className="w-8 h-8 text-green-400" />
              Digitação Automática
            </h1>
            <p className="text-slate-400 mt-1">
              Gerencie digitações em bancos e convênios
            </p>
          </div>
          <button
            onClick={() => setMostrarModalNova(true)}
            className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 shadow-lg transition-all"
          >
            <Plus className="w-5 h-5" />
            Nova Digitação
          </button>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm">Total</span>
              <Activity className="w-4 h-4 text-slate-400" />
            </div>
            <p className="text-2xl font-bold text-white">{stats.total}</p>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm border border-yellow-500/30 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-yellow-400 text-sm">Aguardando</span>
              <Clock className="w-4 h-4 text-yellow-400" />
            </div>
            <p className="text-2xl font-bold text-yellow-400">{stats.aguardando}</p>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm border border-blue-500/30 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-blue-400 text-sm">Em Digitação</span>
              <Edit className="w-4 h-4 text-blue-400" />
            </div>
            <p className="text-2xl font-bold text-blue-400">{stats.emDigitacao}</p>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm border border-purple-500/30 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-purple-400 text-sm">Digitados</span>
              <FileCheck className="w-4 h-4 text-purple-400" />
            </div>
            <p className="text-2xl font-bold text-purple-400">{stats.digitados}</p>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm border border-green-500/30 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-green-400 text-sm">Aprovados</span>
              <CheckCircle className="w-4 h-4 text-green-400" />
            </div>
            <p className="text-2xl font-bold text-green-400">{stats.aprovados}</p>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm border border-red-500/30 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-red-400 text-sm">Recusados</span>
              <XCircle className="w-4 h-4 text-red-400" />
            </div>
            <p className="text-2xl font-bold text-red-400">{stats.recusados}</p>
          </div>
        </div>

        {/* Bancos/Convênios */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-4">
          <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
            <Landmark className="w-4 h-4 text-green-400" />
            Filtros por Banco/Convênio
          </h3>
          <div className="flex gap-2 flex-wrap">
            {bancosDisponiveis.map((banco) => (
              <button
                key={banco.nome}
                className={`${banco.cor} text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-80 transition-all flex items-center gap-2`}
              >
                <span>{banco.icone}</span>
                {banco.nome}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Filtros e Busca */}
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Busca */}
          <div className="flex-1 relative">
            <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por cliente, CPF, protocolo ou banco..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* Filtros de Status */}
          <div className="flex gap-2 flex-wrap">
            {statusFiltros.map((status) => (
              <button
                key={status}
                onClick={() => setFiltroStatus(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filtroStatus === status
                    ? 'bg-green-500 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabela de Digitações */}
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-900/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Protocolo
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  CPF
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Operação
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Banco
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Valor
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Parcelas
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Data
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {digitacoesFiltradas.map((dig) => (
                <tr key={dig.id} className="hover:bg-slate-700/30 transition-colors">
                  <td className="px-6 py-4">
                    <span className="text-green-400 font-mono text-sm">
                      {dig.protocolo || '---'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-slate-400" />
                      <span className="text-white font-medium">{dig.cliente}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-300 font-mono text-sm">
                    {dig.cpf}
                  </td>
                  <td className="px-6 py-4 text-slate-300 text-sm">
                    {dig.tipoOperacao}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300">
                      {dig.banco}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-white font-semibold">
                    R$ {dig.valorSolicitado.toLocaleString('pt-BR')}
                  </td>
                  <td className="px-6 py-4 text-slate-300 text-center">
                    {dig.parcelas}x
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(dig.status)}`}>
                      {dig.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-400 text-sm">
                    {new Date(dig.dataInclusao).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setDigitacaoSelecionada(dig)
                          setMostrarDetalhes(true)
                        }}
                        className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                        title="Ver detalhes"
                      >
                        <Eye className="w-4 h-4 text-blue-400" />
                      </button>
                      <button
                        className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit className="w-4 h-4 text-yellow-400" />
                      </button>
                      <button
                        className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {digitacoesFiltradas.length === 0 && (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">Nenhuma digitação encontrada</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

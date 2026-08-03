import { useState } from 'react'
import { 
  FileText, 
  Search, 
  Filter, 
  Plus, 
  Download,
  Eye,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Calendar,
  RefreshCw,
  Save,
  Upload,
  Building
} from 'lucide-react'
import { collection, addDoc } from 'firebase/firestore'
import { db } from '../../firebase'

type StatusContrato = 'Ativo' | 'Pendente' | 'Vencido' | 'Cancelado'
type TipoContrato = 
  | 'Prestação de Serviços' 
  | 'Locação' 
  | 'Fornecedor'
  | 'Cliente'
  | 'Confidencialidade (NDA)'
  | 'Trabalho CLT'
  | 'Trabalho PJ'
  | 'Estágio'
  | 'Experiência'
  | 'Parceria'
  | 'Convênio'
  | 'Franquia'

interface Contrato {
  id: string
  codigo: string
  tipo: TipoContrato
  cliente: string
  valor: number
  dataInicio: string
  dataVencimento: string
  renovacaoAutomatica: boolean
  status: StatusContrato
  observacoes?: string
  anexoPDF?: string
  diasParaVencer?: number
}

export default function ContratosERP() {
  const [searchTerm, setSearchTerm] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<StatusContrato | 'Todos'>('Todos')
  const [filtroTipo, setFiltroTipo] = useState<TipoContrato | 'Todos'>('Todos')
  const [mostrarFiltros, setMostrarFiltros] = useState(false)
  const [mostrarModal, setMostrarModal] = useState(false)
  const [contratoSelecionado, setContratoSelecionado] = useState<Contrato | null>(null)
  const [mostrarModalNovo, setMostrarModalNovo] = useState(false)
  const [novoContratoForm, setNovoContratoForm] = useState({
    tipo: 'Prestação de Serviços' as TipoContrato,
    cliente: '',
    valor: '',
    dataInicio: '',
    dataVencimento: '',
    renovacaoAutomatica: false,
    observacoes: '',
    arquivoPDF: null as File | null
  })

  // Dados simulados
  const contratos: Contrato[] = [
    {
      id: '1',
      codigo: 'CONT-2024-001',
      tipo: 'Prestação de Serviços',
      cliente: 'Clínica Dente Perfeito',
      valor: 5000.00,
      dataInicio: '2024-01-01',
      dataVencimento: '2024-12-31',
      renovacaoAutomatica: true,
      status: 'Ativo',
      anexoPDF: 'contrato-001.pdf',
      diasParaVencer: 245,
      observacoes: 'Contrato anual com renovação automática'
    },
    {
      id: '2',
      codigo: 'CONT-2024-002',
      tipo: 'Locação',
      cliente: 'Imobiliária Prime',
      valor: 3500.00,
      dataInicio: '2023-06-01',
      dataVencimento: '2024-05-31',
      renovacaoAutomatica: false,
      status: 'Vencido',
      anexoPDF: 'contrato-002.pdf',
      diasParaVencer: -60,
      observacoes: 'Aluguel do imóvel comercial - vencido'
    },
    {
      id: '3',
      codigo: 'CONT-2024-003',
      tipo: 'Fornecedor',
      cliente: 'Dental Cremer Ltda',
      valor: 15000.00,
      dataInicio: '2024-01-15',
      dataVencimento: '2025-01-15',
      renovacaoAutomatica: true,
      status: 'Ativo',
      anexoPDF: 'contrato-003.pdf',
      diasParaVencer: 290
    },
    {
      id: '4',
      codigo: 'CONT-2024-004',
      tipo: 'Cliente',
      cliente: 'João da Silva',
      valor: 2500.00,
      dataInicio: '2024-02-01',
      dataVencimento: '2024-08-01',
      renovacaoAutomatica: false,
      status: 'Ativo',
      anexoPDF: 'contrato-004.pdf',
      diasParaVencer: 90,
      observacoes: 'Tratamento ortodôntico'
    },
    {
      id: '5',
      codigo: 'CONT-2024-005',
      tipo: 'Trabalho CLT',
      cliente: 'Maria Santos - Recepcionista',
      valor: 2800.00,
      dataInicio: '2023-03-01',
      dataVencimento: '2025-03-01',
      renovacaoAutomatica: false,
      status: 'Ativo',
      anexoPDF: 'contrato-005.pdf',
      diasParaVencer: 365
    },
    {
      id: '6',
      codigo: 'CONT-2024-006',
      tipo: 'Confidencialidade (NDA)',
      cliente: 'Tech Solutions Inc.',
      valor: 0,
      dataInicio: '2024-01-10',
      dataVencimento: '2026-01-10',
      renovacaoAutomatica: false,
      status: 'Ativo',
      anexoPDF: 'contrato-006.pdf',
      diasParaVencer: 610
    },
    {
      id: '7',
      codigo: 'CONT-2024-007',
      tipo: 'Estágio',
      cliente: 'Pedro Costa - Estagiário',
      valor: 1200.00,
      dataInicio: '2024-01-20',
      dataVencimento: '2024-07-20',
      renovacaoAutomatica: false,
      status: 'Ativo',
      anexoPDF: 'contrato-007.pdf',
      diasParaVencer: 110
    },
    {
      id: '8',
      codigo: 'CONT-2024-008',
      tipo: 'Parceria',
      cliente: 'Laboratório Dental Express',
      valor: 0,
      dataInicio: '2024-01-05',
      dataVencimento: '2024-12-31',
      renovacaoAutomatica: true,
      status: 'Ativo',
      anexoPDF: 'contrato-008.pdf',
      diasParaVencer: 245
    },
    {
      id: '9',
      codigo: 'CONT-2024-009',
      tipo: 'Convênio',
      cliente: 'Unimed Regional',
      valor: 0,
      dataInicio: '2023-01-01',
      dataVencimento: '2024-12-31',
      renovacaoAutomatica: true,
      status: 'Ativo',
      anexoPDF: 'contrato-009.pdf',
      diasParaVencer: 245
    },
    {
      id: '10',
      codigo: 'CONT-2024-010',
      tipo: 'Prestação de Serviços',
      cliente: 'Empresa XYZ',
      valor: 8000.00,
      dataInicio: '2024-03-01',
      dataVencimento: '2024-06-01',
      renovacaoAutomatica: false,
      status: 'Pendente',
      observacoes: 'Aguardando assinatura'
    }
  ]

  // Filtros
  const contratosFiltrados = contratos.filter((contrato) => {
    const matchSearch = 
      contrato.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contrato.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contrato.tipo.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchStatus = filtroStatus === 'Todos' || contrato.status === filtroStatus
    const matchTipo = filtroTipo === 'Todos' || contrato.tipo === filtroTipo

    return matchSearch && matchStatus && matchTipo
  })

  // KPIs
  const totalContratos = contratos.length
  const contratosAtivos = contratos.filter(c => c.status === 'Ativo').length
  const contratosVencendo = contratos.filter(c => 
    c.status === 'Ativo' && c.diasParaVencer && c.diasParaVencer <= 30
  ).length
  const valorTotal = contratos
    .filter(c => c.status === 'Ativo')
    .reduce((sum, c) => sum + c.valor, 0)

  const getStatusColor = (status: StatusContrato) => {
    switch (status) {
      case 'Ativo': return 'bg-green-500/10 text-green-400 border-green-500/20'
      case 'Pendente': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
      case 'Vencido': return 'bg-red-500/10 text-red-400 border-red-500/20'
      case 'Cancelado': return 'bg-gray-500/10 text-gray-400 border-gray-500/20'
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20'
    }
  }

  const getStatusIcon = (status: StatusContrato) => {
    switch (status) {
      case 'Ativo': return <CheckCircle className="w-4 h-4" />
      case 'Pendente': return <Clock className="w-4 h-4" />
      case 'Vencido': return <XCircle className="w-4 h-4" />
      case 'Cancelado': return <XCircle className="w-4 h-4" />
      default: return <CheckCircle className="w-4 h-4" />
    }
  }

  const handleVerDetalhes = (contrato: Contrato) => {
    setContratoSelecionado(contrato)
    setMostrarModal(true)
  }

  const salvarContrato = async () => {
    try {
      if (!novoContratoForm.cliente || !novoContratoForm.dataInicio || !novoContratoForm.dataVencimento) {
        alert('⚠️ Preencha todos os campos obrigatórios: Empresa/Cliente, Data Início e Data Término')
        return
      }

      const valor = Number(novoContratoForm.valor) || 0
      
      // Gerar código único
      const anoAtual = new Date().getFullYear()
      const proximoNumero = contratos.length + 1
      const codigo = `CONT-${anoAtual}-${String(proximoNumero).padStart(3, '0')}`

      // Calcular dias para vencer
      const dataVenc = new Date(novoContratoForm.dataVencimento)
      const hoje = new Date()
      const diasParaVencer = Math.floor((dataVenc.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))

      const contratoData = {
        codigo,
        tipo: novoContratoForm.tipo,
        cliente: novoContratoForm.cliente,
        valor,
        dataInicio: novoContratoForm.dataInicio,
        dataVencimento: novoContratoForm.dataVencimento,
        renovacaoAutomatica: novoContratoForm.renovacaoAutomatica,
        status: diasParaVencer < 0 ? 'Vencido' : 'Ativo' as StatusContrato,
        observacoes: novoContratoForm.observacoes || '',
        diasParaVencer,
        anexoPDF: novoContratoForm.arquivoPDF ? novoContratoForm.arquivoPDF.name : '',
        dataCriacao: new Date().toISOString()
      }

      await addDoc(collection(db, 'contratos'), contratoData)
      
      alert('✅ Contrato cadastrado com sucesso!')
      setMostrarModalNovo(false)
      setNovoContratoForm({
        tipo: 'Prestação de Serviços',
        cliente: '',
        valor: '',
        dataInicio: '',
        dataVencimento: '',
        renovacaoAutomatica: false,
        observacoes: '',
        arquivoPDF: null
      })
    } catch (error) {
      console.error('Erro ao salvar contrato:', error)
      alert('❌ Erro ao cadastrar contrato. Tente novamente.')
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <FileText className="w-8 h-8 text-purple-400" />
            Contratos
          </h1>
          <p className="text-slate-400 mt-1">Gestão completa de contratos e templates</p>
        </div>
        <button 
          onClick={() => setMostrarModalNovo(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Novo Contrato
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Total de Contratos</p>
              <p className="text-2xl font-bold text-white mt-1">{totalContratos}</p>
            </div>
            <div className="bg-purple-500/10 p-3 rounded-lg">
              <FileText className="w-6 h-6 text-purple-400" />
            </div>
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Contratos Ativos</p>
              <p className="text-2xl font-bold text-white mt-1">{contratosAtivos}</p>
            </div>
            <div className="bg-green-500/10 p-3 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Vencendo em 30 dias</p>
              <p className="text-2xl font-bold text-white mt-1">{contratosVencendo}</p>
            </div>
            <div className="bg-yellow-500/10 p-3 rounded-lg">
              <AlertCircle className="w-6 h-6 text-yellow-400" />
            </div>
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Valor Total Mensal</p>
              <p className="text-2xl font-bold text-white mt-1">
                R$ {valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-blue-500/10 p-3 rounded-lg">
              <Calendar className="w-6 h-6 text-blue-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Alertas */}
      {contratosVencendo > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-yellow-400 font-medium">Atenção: Contratos Vencendo</p>
            <p className="text-yellow-400/80 text-sm mt-1">
              Você tem {contratosVencendo} contrato(s) vencendo nos próximos 30 dias
            </p>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por código, cliente ou tipo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
            />
          </div>

          <button
            onClick={() => setMostrarFiltros(!mostrarFiltros)}
            className="bg-slate-900 border border-slate-700 hover:border-purple-500 text-white px-4 py-2.5 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Filter className="w-5 h-5" />
            Filtros
          </button>
        </div>

        {mostrarFiltros && (
          <div className="mt-4 pt-4 border-t border-slate-700">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Status</label>
                <select
                  value={filtroStatus}
                  onChange={(e) => setFiltroStatus(e.target.value as StatusContrato | 'Todos')}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="Todos">Todos</option>
                  <option value="Ativo">Ativo</option>
                  <option value="Pendente">Pendente</option>
                  <option value="Vencido">Vencido</option>
                  <option value="Cancelado">Cancelado</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Tipo</label>
                <select
                  value={filtroTipo}
                  onChange={(e) => setFiltroTipo(e.target.value as TipoContrato | 'Todos')}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="Todos">Todos</option>
                  <option value="Prestação de Serviços">Prestação de Serviços</option>
                  <option value="Locação">Locação</option>
                  <option value="Fornecedor">Fornecedor</option>
                  <option value="Cliente">Cliente</option>
                  <option value="Confidencialidade (NDA)">Confidencialidade (NDA)</option>
                  <option value="Trabalho CLT">Trabalho CLT</option>
                  <option value="Trabalho PJ">Trabalho PJ</option>
                  <option value="Estágio">Estágio</option>
                  <option value="Experiência">Experiência</option>
                  <option value="Parceria">Parceria</option>
                  <option value="Convênio">Convênio</option>
                  <option value="Franquia">Franquia</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tabela */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-900 border-b border-slate-700">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Código</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Tipo</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Cliente</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Valor</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Início</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Vencimento</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Renovação</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Status</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {contratosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-400">
                    Nenhum contrato encontrado
                  </td>
                </tr>
              ) : (
                contratosFiltrados.map((contrato) => (
                  <tr key={contrato.id} className="hover:bg-slate-700/50 transition-colors">
                    <td className="px-6 py-4 text-white font-medium">{contrato.codigo}</td>
                    <td className="px-6 py-4 text-slate-300">{contrato.tipo}</td>
                    <td className="px-6 py-4 text-slate-300">{contrato.cliente}</td>
                    <td className="px-6 py-4 text-white font-semibold">
                      {contrato.valor > 0 ? `R$ ${contrato.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                    </td>
                    <td className="px-6 py-4 text-slate-300">
                      {new Date(contrato.dataInicio).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-slate-300">
                          {new Date(contrato.dataVencimento).toLocaleDateString('pt-BR')}
                        </div>
                        {contrato.diasParaVencer !== undefined && contrato.diasParaVencer > 0 && contrato.diasParaVencer <= 30 && (
                          <div className="text-yellow-400 text-xs mt-1">
                            Vence em {contrato.diasParaVencer} dias
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {contrato.renovacaoAutomatica ? (
                        <span className="inline-flex items-center gap-1 text-green-400 text-xs">
                          <RefreshCw className="w-3 h-3" />
                          Automática
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">Manual</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(contrato.status)}`}>
                        {getStatusIcon(contrato.status)}
                        {contrato.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleVerDetalhes(contrato)}
                          className="text-purple-400 hover:text-purple-300 transition-colors"
                          title="Ver detalhes"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        {contrato.anexoPDF && (
                          <button
                            className="text-green-400 hover:text-green-300 transition-colors"
                            title="Baixar PDF"
                          >
                            <Download className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Detalhes */}
      {mostrarModal && contratoSelecionado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-700">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">Detalhes do Contrato</h2>
                <button
                  onClick={() => setMostrarModal(false)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-slate-400 text-sm">Código</p>
                  <p className="text-white font-medium mt-1">{contratoSelecionado.codigo}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Status</p>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border mt-1 ${getStatusColor(contratoSelecionado.status)}`}>
                    {getStatusIcon(contratoSelecionado.status)}
                    {contratoSelecionado.status}
                  </span>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Tipo</p>
                  <p className="text-white font-medium mt-1">{contratoSelecionado.tipo}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Cliente</p>
                  <p className="text-white font-medium mt-1">{contratoSelecionado.cliente}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Data Início</p>
                  <p className="text-white font-medium mt-1">
                    {new Date(contratoSelecionado.dataInicio).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Data Vencimento</p>
                  <p className="text-white font-medium mt-1">
                    {new Date(contratoSelecionado.dataVencimento).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Renovação Automática</p>
                  <p className="text-white font-medium mt-1 flex items-center gap-2">
                    {contratoSelecionado.renovacaoAutomatica ? (
                      <>
                        <RefreshCw className="w-4 h-4 text-green-400" />
                        <span className="text-green-400">Sim</span>
                      </>
                    ) : (
                      <span className="text-slate-400">Não</span>
                    )}
                  </p>
                </div>
                {contratoSelecionado.diasParaVencer !== undefined && (
                  <div>
                    <p className="text-slate-400 text-sm">Dias para Vencer</p>
                    <p className={`font-medium mt-1 ${
                      contratoSelecionado.diasParaVencer < 0 ? 'text-red-400' :
                      contratoSelecionado.diasParaVencer <= 30 ? 'text-yellow-400' :
                      'text-green-400'
                    }`}>
                      {contratoSelecionado.diasParaVencer < 0 
                        ? `Vencido há ${Math.abs(contratoSelecionado.diasParaVencer)} dias`
                        : `${contratoSelecionado.diasParaVencer} dias`
                      }
                    </p>
                  </div>
                )}
                {contratoSelecionado.anexoPDF && (
                  <div>
                    <p className="text-slate-400 text-sm">Anexo PDF</p>
                    <p className="text-white font-medium mt-1">{contratoSelecionado.anexoPDF}</p>
                  </div>
                )}
                {contratoSelecionado.observacoes && (
                  <div className="col-span-2">
                    <p className="text-slate-400 text-sm">Observações</p>
                    <p className="text-white font-medium mt-1">{contratoSelecionado.observacoes}</p>
                  </div>
                )}
              </div>

              {contratoSelecionado.valor > 0 && (
                <div className="border-t border-slate-700 pt-4">
                  <div className="flex items-center justify-between">
                    <p className="text-slate-300 text-lg">Valor Mensal</p>
                    <p className="text-2xl font-bold text-white">
                      R$ {contratoSelecionado.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-lg transition-colors">
                  Editar Contrato
                </button>
                {contratoSelecionado.anexoPDF && (
                  <button className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg flex items-center justify-center gap-2 transition-colors">
                    <Download className="w-5 h-5" />
                    Baixar PDF
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NOVO CONTRATO */}
      {mostrarModalNovo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-700 sticky top-0 bg-slate-800 z-10">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <FileText className="w-7 h-7 text-purple-400" />
                  Novo Contrato
                </h2>
                <button onClick={() => setMostrarModalNovo(false)} className="text-slate-400 hover:text-white text-2xl">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Tipo e Empresa */}
              <div>
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Building className="w-5 h-5 text-purple-400" />
                  Dados do Contrato
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Tipo de Contrato *</label>
                    <select
                      value={novoContratoForm.tipo}
                      onChange={(e) => setNovoContratoForm({...novoContratoForm, tipo: e.target.value as TipoContrato})}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-purple-500"
                    >
                      <option value="Prestação de Serviços">Prestação de Serviços</option>
                      <option value="Locação">Locação</option>
                      <option value="Fornecedor">Fornecedor</option>
                      <option value="Cliente">Cliente</option>
                      <option value="Confidencialidade (NDA)">Confidencialidade (NDA)</option>
                      <option value="Trabalho CLT">Trabalho CLT</option>
                      <option value="Trabalho PJ">Trabalho PJ</option>
                      <option value="Estágio">Estágio</option>
                      <option value="Experiência">Experiência</option>
                      <option value="Parceria">Parceria</option>
                      <option value="Convênio">Convênio</option>
                      <option value="Franquia">Franquia</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Empresa/Cliente *</label>
                    <input
                      type="text"
                      value={novoContratoForm.cliente}
                      onChange={(e) => setNovoContratoForm({...novoContratoForm, cliente: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
                      placeholder="Nome da empresa ou cliente"
                    />
                  </div>
                </div>
              </div>

              {/* Valores e Datas */}
              <div>
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-purple-400" />
                  Período e Valor
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Valor Mensal</label>
                    <input
                      type="number"
                      step="0.01"
                      value={novoContratoForm.valor}
                      onChange={(e) => setNovoContratoForm({...novoContratoForm, valor: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
                      placeholder="0,00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Data Início *</label>
                    <input
                      type="date"
                      value={novoContratoForm.dataInicio}
                      onChange={(e) => setNovoContratoForm({...novoContratoForm, dataInicio: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Data Término *</label>
                    <input
                      type="date"
                      value={novoContratoForm.dataVencimento}
                      onChange={(e) => setNovoContratoForm({...novoContratoForm, dataVencimento: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
              </div>

              {/* Renovação e Observações */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <input
                    type="checkbox"
                    id="renovacao"
                    checked={novoContratoForm.renovacaoAutomatica}
                    onChange={(e) => setNovoContratoForm({...novoContratoForm, renovacaoAutomatica: e.target.checked})}
                    className="w-4 h-4 text-purple-600 bg-slate-900 border-slate-700 rounded focus:ring-purple-500"
                  />
                  <label htmlFor="renovacao" className="text-slate-300 font-medium flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-purple-400" />
                    Renovação Automática
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Observações</label>
                  <textarea
                    value={novoContratoForm.observacoes}
                    onChange={(e) => setNovoContratoForm({...novoContratoForm, observacoes: e.target.value})}
                    rows={3}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 resize-none"
                    placeholder="Informações adicionais sobre o contrato..."
                  />
                </div>
              </div>

              {/* Upload PDF */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Arquivo PDF</label>
                <div className="flex items-center gap-4">
                  <label className="flex-1 flex items-center justify-center gap-2 bg-slate-900 border-2 border-dashed border-slate-700 rounded-lg px-4 py-6 cursor-pointer hover:border-purple-500 transition-colors">
                    <Upload className="w-5 h-5 text-slate-400" />
                    <span className="text-slate-400">
                      {novoContratoForm.arquivoPDF ? novoContratoForm.arquivoPDF.name : 'Clique para selecionar arquivo PDF'}
                    </span>
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => setNovoContratoForm({...novoContratoForm, arquivoPDF: e.target.files?.[0] || null})}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Botões */}
            <div className="p-6 border-t border-slate-700 sticky bottom-0 bg-slate-800 flex gap-3">
              <button
                onClick={() => setMostrarModalNovo(false)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={salvarContrato}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Save className="w-5 h-5" />
                Salvar Contrato
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

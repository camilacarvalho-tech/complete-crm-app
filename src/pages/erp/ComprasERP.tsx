import { useState } from 'react'
import { 
  Package, 
  Search, 
  Filter, 
  Plus, 
  FileText, 
  CheckCircle, 
  Clock, 
  XCircle,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Truck,
  Download,
  Eye,
  Save
} from 'lucide-react'
import { collection, addDoc } from 'firebase/firestore'
import { db } from '../../firebase'

type StatusCompra = 'Solicitada' | 'Cotação' | 'Aprovada' | 'Pedido Enviado' | 'Recebida' | 'Cancelada'

interface Compra {
  id: string
  codigo: string
  solicitante: string
  fornecedor: string
  produtos: string[]
  quantidade: number
  valorUnitario: number
  valorTotal: number
  dataSolicitacao: string
  dataEntrega?: string
  status: StatusCompra
  notaFiscal?: string
  observacoes?: string
}

export default function ComprasERP() {
  const [searchTerm, setSearchTerm] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<StatusCompra | 'Todos'>('Todos')
  const [mostrarFiltros, setMostrarFiltros] = useState(false)
  const [mostrarModal, setMostrarModal] = useState(false)
  const [compraSelecionada, setCompraSelecionada] = useState<Compra | null>(null)
  const [mostrarModalNova, setMostrarModalNova] = useState(false)
  const [novaCompraForm, setNovaCompraForm] = useState({
    solicitante: '',
    fornecedor: '',
    produtos: '',
    quantidade: '',
    valorUnitario: '',
    dataEntrega: '',
    observacoes: ''
  })

  // Dados simulados
  const compras: Compra[] = [
    {
      id: '1',
      codigo: 'COMP-2024-001',
      solicitante: 'Dr. Carlos Silva',
      fornecedor: 'Dental Cremer',
      produtos: ['Anestésico 3%, Luva descartável P/M/G'],
      quantidade: 150,
      valorUnitario: 12.50,
      valorTotal: 1875.00,
      dataSolicitacao: '2024-01-15',
      dataEntrega: '2024-01-22',
      status: 'Recebida',
      notaFiscal: 'NFE-12345',
      observacoes: 'Entrega realizada no prazo'
    },
    {
      id: '2',
      codigo: 'COMP-2024-002',
      solicitante: 'Gerente Administrativo',
      fornecedor: 'Papelaria Delta',
      produtos: ['Papel A4, Canetas, Pastas'],
      quantidade: 200,
      valorUnitario: 8.90,
      valorTotal: 1780.00,
      dataSolicitacao: '2024-01-20',
      dataEntrega: '2024-01-27',
      status: 'Pedido Enviado',
      observacoes: 'Aguardando entrega'
    },
    {
      id: '3',
      codigo: 'COMP-2024-003',
      solicitante: 'Dra. Ana Paula',
      fornecedor: 'Medsystem',
      produtos: ['Equipamento radiográfico'],
      quantidade: 1,
      valorUnitario: 45000.00,
      valorTotal: 45000.00,
      dataSolicitacao: '2024-01-18',
      status: 'Cotação',
      observacoes: 'Aguardando aprovação orçamento'
    },
    {
      id: '4',
      codigo: 'COMP-2024-004',
      solicitante: 'Gerente Estoque',
      fornecedor: 'Royal Canin',
      produtos: ['Ração Premium 15kg'],
      quantidade: 50,
      valorUnitario: 185.00,
      valorTotal: 9250.00,
      dataSolicitacao: '2024-01-25',
      status: 'Solicitada',
      observacoes: 'Reposição estoque'
    },
    {
      id: '5',
      codigo: 'COMP-2024-005',
      solicitante: 'Farmacêutico',
      fornecedor: 'Vetnil',
      produtos: ['Vacina V10, Vermífugos'],
      quantidade: 100,
      valorUnitario: 32.00,
      valorTotal: 3200.00,
      dataSolicitacao: '2024-01-22',
      dataEntrega: '2024-01-29',
      status: 'Aprovada',
      observacoes: 'Pedido aprovado, aguardando envio'
    },
    {
      id: '6',
      codigo: 'COMP-2024-006',
      solicitante: 'Dr. Pedro Santos',
      fornecedor: 'Dental Cremer',
      produtos: ['Resina composta A2'],
      quantidade: 25,
      valorUnitario: 89.90,
      valorTotal: 2247.50,
      dataSolicitacao: '2024-01-10',
      status: 'Cancelada',
      observacoes: 'Cancelado - produto indisponível'
    },
    {
      id: '7',
      codigo: 'COMP-2024-007',
      solicitante: 'Gerente Clínica',
      fornecedor: 'CEMIG',
      produtos: ['Energia elétrica'],
      quantidade: 1,
      valorUnitario: 2500.00,
      valorTotal: 2500.00,
      dataSolicitacao: '2024-01-05',
      dataEntrega: '2024-01-05',
      status: 'Recebida',
      notaFiscal: 'Fatura 789/24'
    },
    {
      id: '8',
      codigo: 'COMP-2024-008',
      solicitante: 'Dr. João Oliveira',
      fornecedor: 'Posto Ipiranga',
      produtos: ['Combustível veículo empresa'],
      quantidade: 200,
      valorUnitario: 5.80,
      valorTotal: 1160.00,
      dataSolicitacao: '2024-01-28',
      status: 'Pedido Enviado',
      observacoes: 'Abastecimento mensal'
    },
  ]

  // Filtros
  const comprasFiltradas = compras.filter((compra) => {
    const matchSearch = 
      compra.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      compra.fornecedor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      compra.solicitante.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchStatus = filtroStatus === 'Todos' || compra.status === filtroStatus

    return matchSearch && matchStatus
  })

  // KPIs
  const totalCompras = compras.length
  const totalGasto = compras
    .filter(c => c.status === 'Recebida')
    .reduce((sum, c) => sum + c.valorTotal, 0)
  const comprasPendentes = compras.filter(c => 
    ['Solicitada', 'Cotação', 'Aprovada', 'Pedido Enviado'].includes(c.status)
  ).length
  const valorPendente = compras
    .filter(c => ['Solicitada', 'Cotação', 'Aprovada', 'Pedido Enviado'].includes(c.status))
    .reduce((sum, c) => sum + c.valorTotal, 0)

  const getStatusColor = (status: StatusCompra) => {
    switch (status) {
      case 'Recebida': return 'bg-green-500/10 text-green-400 border-green-500/20'
      case 'Pedido Enviado': return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
      case 'Aprovada': return 'bg-purple-500/10 text-purple-400 border-purple-500/20'
      case 'Cotação': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
      case 'Solicitada': return 'bg-gray-500/10 text-gray-400 border-gray-500/20'
      case 'Cancelada': return 'bg-red-500/10 text-red-400 border-red-500/20'
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20'
    }
  }

  const getStatusIcon = (status: StatusCompra) => {
    switch (status) {
      case 'Recebida': return <CheckCircle className="w-4 h-4" />
      case 'Pedido Enviado': return <Truck className="w-4 h-4" />
      case 'Aprovada': return <CheckCircle className="w-4 h-4" />
      case 'Cotação': return <FileText className="w-4 h-4" />
      case 'Solicitada': return <Clock className="w-4 h-4" />
      case 'Cancelada': return <XCircle className="w-4 h-4" />
      default: return <Clock className="w-4 h-4" />
    }
  }

  const handleVerDetalhes = (compra: Compra) => {
    setCompraSelecionada(compra)
    setMostrarModal(true)
  }

  const salvarCompra = async () => {
    try {
      if (!novaCompraForm.solicitante || !novaCompraForm.fornecedor || !novaCompraForm.produtos || !novaCompraForm.quantidade) {
        alert('⚠️ Preencha todos os campos obrigatórios: Solicitante, Fornecedor, Produtos e Quantidade')
        return
      }

      const quantidade = Number(novaCompraForm.quantidade) || 0
      const valorUnitario = Number(novaCompraForm.valorUnitario) || 0
      const valorTotal = quantidade * valorUnitario

      // Gerar código único
      const anoAtual = new Date().getFullYear()
      const proximoNumero = compras.length + 1
      const codigo = `COMP-${anoAtual}-${String(proximoNumero).padStart(3, '0')}`

      const compraData = {
        codigo,
        solicitante: novaCompraForm.solicitante,
        fornecedor: novaCompraForm.fornecedor,
        produtos: novaCompraForm.produtos.split(',').map(p => p.trim()),
        quantidade,
        valorUnitario,
        valorTotal,
        dataSolicitacao: new Date().toISOString().split('T')[0],
        dataEntrega: novaCompraForm.dataEntrega || null,
        status: 'Solicitada' as StatusCompra,
        observacoes: novaCompraForm.observacoes || '',
        dataCriacao: new Date().toISOString()
      }

      await addDoc(collection(db, 'compras'), compraData)
      
      alert('✅ Compra cadastrada com sucesso!')
      setMostrarModalNova(false)
      setNovaCompraForm({
        solicitante: '',
        fornecedor: '',
        produtos: '',
        quantidade: '',
        valorUnitario: '',
        dataEntrega: '',
        observacoes: ''
      })
    } catch (error) {
      console.error('Erro ao salvar compra:', error)
      alert('❌ Erro ao salvar compra. Tente novamente.')
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Package className="w-8 h-8 text-purple-400" />
            Compras
          </h1>
          <p className="text-slate-400 mt-1">Gestão completa do fluxo de compras</p>
        </div>
        <button 
          onClick={() => setMostrarModalNova(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nova Compra
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Total de Compras</p>
              <p className="text-2xl font-bold text-white mt-1">{totalCompras}</p>
            </div>
            <div className="bg-purple-500/10 p-3 rounded-lg">
              <ShoppingCart className="w-6 h-6 text-purple-400" />
            </div>
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Total Gasto</p>
              <p className="text-2xl font-bold text-white mt-1">
                R$ {totalGasto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-green-500/10 p-3 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Compras Pendentes</p>
              <p className="text-2xl font-bold text-white mt-1">{comprasPendentes}</p>
            </div>
            <div className="bg-yellow-500/10 p-3 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-400" />
            </div>
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Valor Pendente</p>
              <p className="text-2xl font-bold text-white mt-1">
                R$ {valorPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-blue-500/10 p-3 rounded-lg">
              <TrendingUp className="w-6 h-6 text-blue-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por código, fornecedor ou solicitante..."
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Status</label>
                <select
                  value={filtroStatus}
                  onChange={(e) => setFiltroStatus(e.target.value as StatusCompra | 'Todos')}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="Todos">Todos</option>
                  <option value="Solicitada">Solicitada</option>
                  <option value="Cotação">Cotação</option>
                  <option value="Aprovada">Aprovada</option>
                  <option value="Pedido Enviado">Pedido Enviado</option>
                  <option value="Recebida">Recebida</option>
                  <option value="Cancelada">Cancelada</option>
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
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Solicitante</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Fornecedor</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Produtos</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Qtd.</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Valor Total</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Data</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Status</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {comprasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-400">
                    Nenhuma compra encontrada
                  </td>
                </tr>
              ) : (
                comprasFiltradas.map((compra) => (
                  <tr key={compra.id} className="hover:bg-slate-700/50 transition-colors">
                    <td className="px-6 py-4 text-white font-medium">{compra.codigo}</td>
                    <td className="px-6 py-4 text-slate-300">{compra.solicitante}</td>
                    <td className="px-6 py-4 text-slate-300">{compra.fornecedor}</td>
                    <td className="px-6 py-4 text-slate-300 max-w-xs truncate" title={compra.produtos.join(', ')}>
                      {compra.produtos.join(', ')}
                    </td>
                    <td className="px-6 py-4 text-slate-300">{compra.quantidade}</td>
                    <td className="px-6 py-4 text-white font-semibold">
                      R$ {compra.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-slate-300">
                      {new Date(compra.dataSolicitacao).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(compra.status)}`}>
                        {getStatusIcon(compra.status)}
                        {compra.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleVerDetalhes(compra)}
                          className="text-purple-400 hover:text-purple-300 transition-colors"
                          title="Ver detalhes"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        {compra.notaFiscal && (
                          <button
                            className="text-green-400 hover:text-green-300 transition-colors"
                            title="Baixar Nota Fiscal"
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

      {/* MODAL NOVA COMPRA */}
      {mostrarModalNova && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-700 sticky top-0 bg-slate-800 z-10">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <ShoppingCart className="w-7 h-7 text-purple-400" />
                  Nova Solicitação de Compra
                </h2>
                <button onClick={() => setMostrarModalNova(false)} className="text-slate-400 hover:text-white text-2xl">
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Solicitante e Fornecedor */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Solicitante *</label>
                  <input
                    type="text"
                    value={novaCompraForm.solicitante}
                    onChange={(e) => setNovaCompraForm({...novaCompraForm, solicitante: e.target.value})}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
                    placeholder="Nome do solicitante"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Fornecedor *</label>
                  <select
                    value={novaCompraForm.fornecedor}
                    onChange={(e) => setNovaCompraForm({...novaCompraForm, fornecedor: e.target.value})}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="">Selecione</option>
                    <option value="Dental Cremer">Dental Cremer</option>
                    <option value="Vetnil">Vetnil</option>
                    <option value="Royal Canin">Royal Canin</option>
                    <option value="Papelaria Delta">Papelaria Delta</option>
                    <option value="Medsystem">Medsystem</option>
                    <option value="TechSolutions">TechSolutions</option>
                  </select>
                </div>
              </div>

              {/* Produtos */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Produtos/Serviços *</label>
                <textarea
                  value={novaCompraForm.produtos}
                  onChange={(e) => setNovaCompraForm({...novaCompraForm, produtos: e.target.value})}
                  rows={3}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 resize-none"
                  placeholder="Descreva os produtos ou serviços a serem comprados"
                />
              </div>

              {/* Quantidade e Valores */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Quantidade *</label>
                  <input
                    type="number"
                    value={novaCompraForm.quantidade}
                    onChange={(e) => setNovaCompraForm({...novaCompraForm, quantidade: e.target.value})}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Valor Unitário</label>
                  <input
                    type="number"
                    step="0.01"
                    value={novaCompraForm.valorUnitario}
                    onChange={(e) => setNovaCompraForm({...novaCompraForm, valorUnitario: e.target.value})}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
                    placeholder="0,00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Valor Total</label>
                  <input
                    type="text"
                    value={`R$ ${((parseFloat(novaCompraForm.quantidade) || 0) * (parseFloat(novaCompraForm.valorUnitario) || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    disabled
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-purple-400 font-bold"
                  />
                </div>
              </div>

              {/* Data de Entrega */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Data de Entrega Prevista</label>
                <input
                  type="date"
                  value={novaCompraForm.dataEntrega}
                  onChange={(e) => setNovaCompraForm({...novaCompraForm, dataEntrega: e.target.value})}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Observações */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Observações</label>
                <textarea
                  value={novaCompraForm.observacoes}
                  onChange={(e) => setNovaCompraForm({...novaCompraForm, observacoes: e.target.value})}
                  rows={3}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 resize-none"
                  placeholder="Informações adicionais sobre a compra..."
                />
              </div>
            </div>

            {/* Footer do Modal */}
            <div className="p-6 border-t border-slate-700 sticky bottom-0 bg-slate-800 flex gap-3">
              <button
                onClick={() => setMostrarModalNova(false)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={salvarCompra}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Save className="w-5 h-5" />
                Criar Solicitação
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detalhes */}
      {mostrarModal && compraSelecionada && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-700">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">Detalhes da Compra</h2>
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
                  <p className="text-white font-medium mt-1">{compraSelecionada.codigo}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Status</p>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border mt-1 ${getStatusColor(compraSelecionada.status)}`}>
                    {getStatusIcon(compraSelecionada.status)}
                    {compraSelecionada.status}
                  </span>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Solicitante</p>
                  <p className="text-white font-medium mt-1">{compraSelecionada.solicitante}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Fornecedor</p>
                  <p className="text-white font-medium mt-1">{compraSelecionada.fornecedor}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Data Solicitação</p>
                  <p className="text-white font-medium mt-1">
                    {new Date(compraSelecionada.dataSolicitacao).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                {compraSelecionada.dataEntrega && (
                  <div>
                    <p className="text-slate-400 text-sm">Data Entrega</p>
                    <p className="text-white font-medium mt-1">
                      {new Date(compraSelecionada.dataEntrega).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-slate-400 text-sm">Quantidade</p>
                  <p className="text-white font-medium mt-1">{compraSelecionada.quantidade} unidades</p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Valor Unitário</p>
                  <p className="text-white font-medium mt-1">
                    R$ {compraSelecionada.valorUnitario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-slate-400 text-sm">Produtos</p>
                  <p className="text-white font-medium mt-1">{compraSelecionada.produtos.join(', ')}</p>
                </div>
                {compraSelecionada.notaFiscal && (
                  <div>
                    <p className="text-slate-400 text-sm">Nota Fiscal</p>
                    <p className="text-white font-medium mt-1">{compraSelecionada.notaFiscal}</p>
                  </div>
                )}
                {compraSelecionada.observacoes && (
                  <div className="col-span-2">
                    <p className="text-slate-400 text-sm">Observações</p>
                    <p className="text-white font-medium mt-1">{compraSelecionada.observacoes}</p>
                  </div>
                )}
              </div>

              <div className="border-t border-slate-700 pt-4">
                <div className="flex items-center justify-between">
                  <p className="text-slate-300 text-lg">Valor Total</p>
                  <p className="text-2xl font-bold text-white">
                    R$ {compraSelecionada.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-lg transition-colors">
                  Atualizar Status
                </button>
                {compraSelecionada.notaFiscal && (
                  <button className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg flex items-center justify-center gap-2 transition-colors">
                    <Download className="w-5 h-5" />
                    Baixar NF
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

import { useState } from 'react'
import { 
  ShoppingBag, 
  Search, 
  Filter, 
  Plus, 
  TrendingUp,
  DollarSign,
  Users,
  Percent,
  CheckCircle,
  XCircle,
  Eye,
  Download,
  Save
} from 'lucide-react'
import { collection, addDoc } from 'firebase/firestore'
import { db } from '../../firebase'

type StatusVenda = 'Concluída' | 'Pendente' | 'Cancelada'
type FormaPagamento = 'PIX' | 'Dinheiro' | 'Cartão Débito' | 'Cartão Crédito' | 'Boleto' | 'Parcelado'

interface Venda {
  id: string
  codigo: string
  cliente: string
  vendedor: string
  produtos: string[]
  quantidade: number
  valorProdutos: number
  desconto: number
  valorTotal: number
  comissao: number
  formaPagamento: FormaPagamento
  dataVenda: string
  status: StatusVenda
  observacoes?: string
}

export default function VendasERP() {
  const [searchTerm, setSearchTerm] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<StatusVenda | 'Todos'>('Todos')
  const [mostrarFiltros, setMostrarFiltros] = useState(false)
  const [mostrarModal, setMostrarModal] = useState(false)
  const [vendaSelecionada, setVendaSelecionada] = useState<Venda | null>(null)
  const [mostrarModalNova, setMostrarModalNova] = useState(false)
  const [novaVendaForm, setNovaVendaForm] = useState({
    cliente: '',
    vendedor: '',
    produtos: '',
    quantidade: '',
    valorProdutos: '',
    desconto: '',
    formaPagamento: 'PIX' as FormaPagamento,
    observacoes: ''
  })

  // Dados simulados
  const vendas: Venda[] = [
    {
      id: '1',
      codigo: 'VND-2024-001',
      cliente: 'Maria Santos',
      vendedor: 'Carlos Silva',
      produtos: ['Tratamento Canal', 'Restauração'],
      quantidade: 2,
      valorProdutos: 1800.00,
      desconto: 100.00,
      valorTotal: 1700.00,
      comissao: 170.00,
      formaPagamento: 'PIX',
      dataVenda: '2024-01-15',
      status: 'Concluída',
      observacoes: 'Cliente pagou à vista'
    },
    {
      id: '2',
      codigo: 'VND-2024-002',
      cliente: 'João Oliveira',
      vendedor: 'Ana Paula',
      produtos: ['Clareamento Dental'],
      quantidade: 1,
      valorProdutos: 800.00,
      desconto: 0,
      valorTotal: 800.00,
      comissao: 80.00,
      formaPagamento: 'Cartão Crédito',
      dataVenda: '2024-01-18',
      status: 'Concluída'
    },
    {
      id: '3',
      codigo: 'VND-2024-003',
      cliente: 'Pedro Costa',
      vendedor: 'Carlos Silva',
      produtos: ['Consulta Veterinária', 'Vacina V10'],
      quantidade: 2,
      valorProdutos: 250.00,
      desconto: 25.00,
      valorTotal: 225.00,
      comissao: 22.50,
      formaPagamento: 'Dinheiro',
      dataVenda: '2024-01-20',
      status: 'Concluída'
    },
    {
      id: '4',
      codigo: 'VND-2024-004',
      cliente: 'Fernanda Lima',
      vendedor: 'Ana Paula',
      produtos: ['Ração Premium 15kg', 'Brinquedos'],
      quantidade: 5,
      valorProdutos: 950.00,
      desconto: 50.00,
      valorTotal: 900.00,
      comissao: 90.00,
      formaPagamento: 'Parcelado',
      dataVenda: '2024-01-22',
      status: 'Pendente',
      observacoes: '3x de R$ 300,00'
    },
    {
      id: '5',
      codigo: 'VND-2024-005',
      cliente: 'Ricardo Alves',
      vendedor: 'Carlos Silva',
      produtos: ['Implante Dentário'],
      quantidade: 1,
      valorProdutos: 3500.00,
      desconto: 0,
      valorTotal: 3500.00,
      comissao: 350.00,
      formaPagamento: 'Cartão Crédito',
      dataVenda: '2024-01-25',
      status: 'Concluída'
    },
    {
      id: '6',
      codigo: 'VND-2024-006',
      cliente: 'Juliana Mendes',
      vendedor: 'Ana Paula',
      produtos: ['Consulta', 'Exames Laboratoriais'],
      quantidade: 3,
      valorProdutos: 450.00,
      desconto: 0,
      valorTotal: 450.00,
      comissao: 45.00,
      formaPagamento: 'PIX',
      dataVenda: '2024-01-10',
      status: 'Cancelada',
      observacoes: 'Cliente desistiu do procedimento'
    },
    {
      id: '7',
      codigo: 'VND-2024-007',
      cliente: 'Roberto Silva',
      vendedor: 'Carlos Silva',
      produtos: ['Limpeza Dental', 'Aplicação Flúor'],
      quantidade: 2,
      valorProdutos: 350.00,
      desconto: 0,
      valorTotal: 350.00,
      comissao: 35.00,
      formaPagamento: 'Cartão Débito',
      dataVenda: '2024-01-28',
      status: 'Concluída'
    },
    {
      id: '8',
      codigo: 'VND-2024-008',
      cliente: 'Camila Rodrigues',
      vendedor: 'Ana Paula',
      produtos: ['Banho e Tosa', 'Hidratação'],
      quantidade: 2,
      valorProdutos: 180.00,
      desconto: 20.00,
      valorTotal: 160.00,
      comissao: 16.00,
      formaPagamento: 'Dinheiro',
      dataVenda: '2024-01-30',
      status: 'Concluída'
    },
  ]

  // Filtros
  const vendasFiltradas = vendas.filter((venda) => {
    const matchSearch = 
      venda.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      venda.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
      venda.vendedor.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchStatus = filtroStatus === 'Todos' || venda.status === filtroStatus

    return matchSearch && matchStatus
  })

  // KPIs
  const totalVendas = vendas.filter(v => v.status === 'Concluída').length
  const faturamentoTotal = vendas
    .filter(v => v.status === 'Concluída')
    .reduce((sum, v) => sum + v.valorTotal, 0)
  const ticketMedio = totalVendas > 0 ? faturamentoTotal / totalVendas : 0
  const comissaoTotal = vendas
    .filter(v => v.status === 'Concluída')
    .reduce((sum, v) => sum + v.comissao, 0)

  const getStatusColor = (status: StatusVenda) => {
    switch (status) {
      case 'Concluída': return 'bg-green-500/10 text-green-400 border-green-500/20'
      case 'Pendente': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
      case 'Cancelada': return 'bg-red-500/10 text-red-400 border-red-500/20'
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20'
    }
  }

  const getStatusIcon = (status: StatusVenda) => {
    switch (status) {
      case 'Concluída': return <CheckCircle className="w-4 h-4" />
      case 'Pendente': return <DollarSign className="w-4 h-4" />
      case 'Cancelada': return <XCircle className="w-4 h-4" />
      default: return <CheckCircle className="w-4 h-4" />
    }
  }

  const handleVerDetalhes = (venda: Venda) => {
    setVendaSelecionada(venda)
    setMostrarModal(true)
  }

  const salvarVenda = async () => {
    try {
      if (!novaVendaForm.cliente || !novaVendaForm.vendedor || !novaVendaForm.produtos || !novaVendaForm.valorProdutos) {
        alert('⚠️ Preencha todos os campos obrigatórios: Cliente, Vendedor, Produtos e Valor')
        return
      }

      const valorProdutos = Number(novaVendaForm.valorProdutos) || 0
      const desconto = Number(novaVendaForm.desconto) || 0
      const quantidade = Number(novaVendaForm.quantidade) || 1
      const valorTotal = valorProdutos - desconto
      const comissao = valorTotal * 0.1 // 10% de comissão

      // Gerar código único
      const anoAtual = new Date().getFullYear()
      const proximoNumero = vendas.length + 1
      const codigo = `VND-${anoAtual}-${String(proximoNumero).padStart(3, '0')}`

      const vendaData = {
        codigo,
        cliente: novaVendaForm.cliente,
        vendedor: novaVendaForm.vendedor,
        produtos: novaVendaForm.produtos.split(',').map(p => p.trim()),
        quantidade,
        valorProdutos,
        desconto,
        valorTotal,
        comissao,
        formaPagamento: novaVendaForm.formaPagamento,
        dataVenda: new Date().toISOString().split('T')[0],
        status: 'Concluída' as StatusVenda,
        observacoes: novaVendaForm.observacoes || '',
        dataCriacao: new Date().toISOString()
      }

      await addDoc(collection(db, 'vendas'), vendaData)
      
      alert('✅ Venda registrada com sucesso!')
      setMostrarModalNova(false)
      setNovaVendaForm({
        cliente: '',
        vendedor: '',
        produtos: '',
        quantidade: '',
        valorProdutos: '',
        desconto: '',
        formaPagamento: 'PIX',
        observacoes: ''
      })
    } catch (error) {
      console.error('Erro ao salvar venda:', error)
      alert('❌ Erro ao registrar venda. Tente novamente.')
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <ShoppingBag className="w-8 h-8 text-purple-400" />
            Vendas
          </h1>
          <p className="text-slate-400 mt-1">Gestão de vendas e comissões</p>
        </div>
        <button 
          onClick={() => setMostrarModalNova(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nova Venda
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Total de Vendas</p>
              <p className="text-2xl font-bold text-white mt-1">{totalVendas}</p>
            </div>
            <div className="bg-purple-500/10 p-3 rounded-lg">
              <ShoppingBag className="w-6 h-6 text-purple-400" />
            </div>
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Faturamento Total</p>
              <p className="text-2xl font-bold text-white mt-1">
                R$ {faturamentoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
              <p className="text-slate-400 text-sm">Ticket Médio</p>
              <p className="text-2xl font-bold text-white mt-1">
                R$ {ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-blue-500/10 p-3 rounded-lg">
              <TrendingUp className="w-6 h-6 text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Comissão Total</p>
              <p className="text-2xl font-bold text-white mt-1">
                R$ {comissaoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-yellow-500/10 p-3 rounded-lg">
              <Percent className="w-6 h-6 text-yellow-400" />
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
              placeholder="Buscar por código, cliente ou vendedor..."
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
                  onChange={(e) => setFiltroStatus(e.target.value as StatusVenda | 'Todos')}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="Todos">Todos</option>
                  <option value="Concluída">Concluída</option>
                  <option value="Pendente">Pendente</option>
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
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Cliente</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Vendedor</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Valor Total</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Comissão</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Pagamento</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Data</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Status</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {vendasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-400">
                    Nenhuma venda encontrada
                  </td>
                </tr>
              ) : (
                vendasFiltradas.map((venda) => (
                  <tr key={venda.id} className="hover:bg-slate-700/50 transition-colors">
                    <td className="px-6 py-4 text-white font-medium">{venda.codigo}</td>
                    <td className="px-6 py-4 text-slate-300">{venda.cliente}</td>
                    <td className="px-6 py-4 text-slate-300">{venda.vendedor}</td>
                    <td className="px-6 py-4 text-white font-semibold">
                      R$ {venda.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-green-400 font-medium">
                      R$ {venda.comissao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-slate-300">{venda.formaPagamento}</td>
                    <td className="px-6 py-4 text-slate-300">
                      {new Date(venda.dataVenda).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(venda.status)}`}>
                        {getStatusIcon(venda.status)}
                        {venda.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleVerDetalhes(venda)}
                        className="text-purple-400 hover:text-purple-300 transition-colors"
                        title="Ver detalhes"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL NOVA VENDA */}
      {mostrarModalNova && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-700 sticky top-0 bg-slate-800 z-10">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <ShoppingBag className="w-7 h-7 text-purple-400" />
                  Nova Venda
                </h2>
                <button onClick={() => setMostrarModalNova(false)} className="text-slate-400 hover:text-white text-2xl">×</button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Cliente *</label>
                  <input type="text" value={novaVendaForm.cliente} onChange={(e) => setNovaVendaForm({...novaVendaForm, cliente: e.target.value})}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
                    placeholder="Nome do cliente" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Vendedor *</label>
                  <select value={novaVendaForm.vendedor} onChange={(e) => setNovaVendaForm({...novaVendaForm, vendedor: e.target.value})}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-purple-500">
                    <option value="">Selecione</option>
                    <option value="Carlos Silva">Carlos Silva</option>
                    <option value="Ana Paula">Ana Paula</option>
                    <option value="João Oliveira">João Oliveira</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Produtos/Serviços *</label>
                <textarea value={novaVendaForm.produtos} onChange={(e) => setNovaVendaForm({...novaVendaForm, produtos: e.target.value})}
                  rows={3} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 resize-none"
                  placeholder="Descreva os produtos ou serviços vendidos" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Quantidade</label>
                  <input type="number" value={novaVendaForm.quantidade} onChange={(e) => setNovaVendaForm({...novaVendaForm, quantidade: e.target.value})}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
                    placeholder="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Valor Produtos *</label>
                  <input type="number" step="0.01" value={novaVendaForm.valorProdutos} onChange={(e) => setNovaVendaForm({...novaVendaForm, valorProdutos: e.target.value})}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
                    placeholder="0,00" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Desconto</label>
                  <input type="number" step="0.01" value={novaVendaForm.desconto} onChange={(e) => setNovaVendaForm({...novaVendaForm, desconto: e.target.value})}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
                    placeholder="0,00" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Forma de Pagamento *</label>
                  <select value={novaVendaForm.formaPagamento} onChange={(e) => setNovaVendaForm({...novaVendaForm, formaPagamento: e.target.value as FormaPagamento})}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-purple-500">
                    <option value="PIX">PIX</option>
                    <option value="Dinheiro">Dinheiro</option>
                    <option value="Cartão Débito">Cartão Débito</option>
                    <option value="Cartão Crédito">Cartão Crédito</option>
                    <option value="Boleto">Boleto</option>
                    <option value="Parcelado">Parcelado</option>
                  </select>
                </div>
              </div>

              <div className="p-4 bg-slate-900 rounded-lg border border-slate-700">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-slate-400 text-sm">Valor Total</p>
                    <p className="text-2xl font-bold text-white mt-1">
                      R$ {((parseFloat(novaVendaForm.valorProdutos) || 0) - (parseFloat(novaVendaForm.desconto) || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm">Comissão (10%)</p>
                    <p className="text-2xl font-bold text-green-400 mt-1">
                      R$ {(((parseFloat(novaVendaForm.valorProdutos) || 0) - (parseFloat(novaVendaForm.desconto) || 0)) * 0.1).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Observações</label>
                <textarea value={novaVendaForm.observacoes} onChange={(e) => setNovaVendaForm({...novaVendaForm, observacoes: e.target.value})}
                  rows={3} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 resize-none"
                  placeholder="Informações adicionais sobre a venda..." />
              </div>
            </div>

            <div className="p-6 border-t border-slate-700 sticky bottom-0 bg-slate-800 flex gap-3">
              <button onClick={() => setMostrarModalNova(false)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-lg font-medium transition-colors">Cancelar</button>
              <button onClick={salvarVenda}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2">
                <Save className="w-5 h-5" />Registrar Venda
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detalhes */}
      {mostrarModal && vendaSelecionada && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-700">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">Detalhes da Venda</h2>
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
                  <p className="text-white font-medium mt-1">{vendaSelecionada.codigo}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Status</p>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border mt-1 ${getStatusColor(vendaSelecionada.status)}`}>
                    {getStatusIcon(vendaSelecionada.status)}
                    {vendaSelecionada.status}
                  </span>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Cliente</p>
                  <p className="text-white font-medium mt-1">{vendaSelecionada.cliente}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Vendedor</p>
                  <p className="text-white font-medium mt-1">{vendaSelecionada.vendedor}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Data da Venda</p>
                  <p className="text-white font-medium mt-1">
                    {new Date(vendaSelecionada.dataVenda).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Forma de Pagamento</p>
                  <p className="text-white font-medium mt-1">{vendaSelecionada.formaPagamento}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-slate-400 text-sm">Produtos</p>
                  <p className="text-white font-medium mt-1">{vendaSelecionada.produtos.join(', ')}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Quantidade</p>
                  <p className="text-white font-medium mt-1">{vendaSelecionada.quantidade} unidades</p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Valor Produtos</p>
                  <p className="text-white font-medium mt-1">
                    R$ {vendaSelecionada.valorProdutos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Desconto</p>
                  <p className="text-red-400 font-medium mt-1">
                    - R$ {vendaSelecionada.desconto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Comissão (10%)</p>
                  <p className="text-green-400 font-medium mt-1">
                    R$ {vendaSelecionada.comissao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                {vendaSelecionada.observacoes && (
                  <div className="col-span-2">
                    <p className="text-slate-400 text-sm">Observações</p>
                    <p className="text-white font-medium mt-1">{vendaSelecionada.observacoes}</p>
                  </div>
                )}
              </div>

              <div className="border-t border-slate-700 pt-4">
                <div className="flex items-center justify-between">
                  <p className="text-slate-300 text-lg">Valor Total</p>
                  <p className="text-2xl font-bold text-white">
                    R$ {vendaSelecionada.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-lg transition-colors">
                  Editar Venda
                </button>
                <button className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg flex items-center justify-center gap-2 transition-colors">
                  <Download className="w-5 h-5" />
                  Gerar Recibo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

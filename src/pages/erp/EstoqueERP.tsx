import { useState } from 'react'
import { 
  Package, 
  Search, 
  Filter, 
  Plus, 
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  DollarSign,
  ArrowDownCircle,
  ArrowUpCircle,
  RefreshCw,
  Eye,
  Edit,
  Trash2,
  Download,
  Upload,
  Save,
  X,
  Tag,
  Calendar,
  MapPin,
  Truck,
  Box
} from 'lucide-react'
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore'
import { db } from '../../firebase'

type TipoMovimentacao = 'Entrada' | 'Saída' | 'Transferência' | 'Ajuste'
type CategoriaEstoque = 'Medicamentos' | 'EPI' | 'Limpeza' | 'Descartáveis' | 'Equipamentos' | 'Materiais' | 'Outros'

interface Produto {
  id: string
  codigo: string
  nome: string
  categoria: CategoriaEstoque
  estoque: number
  minimo: number
  maximo: number
  lote?: string
  validade?: string
  valorCompra: number
  valorVenda: number
  fornecedor: string
  localizacao: string
}

export default function EstoqueERP() {
  const [busca, setBusca] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState<CategoriaEstoque | 'Todos'>('Todos')
  const [mostrarFiltros, setMostrarFiltros] = useState(false)
  const [mostrarModalNovo, setMostrarModalNovo] = useState(false)
  const [mostrarModalMovimentacao, setMostrarModalMovimentacao] = useState(false)
  const [tipoMovimentacao, setTipoMovimentacao] = useState<TipoMovimentacao>('Entrada')
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null)
  
  const [novoProdutoForm, setNovoProdutoForm] = useState({
    codigo: '',
    nome: '',
    categoria: 'Medicamentos' as CategoriaEstoque,
    estoque: '',
    minimo: '',
    maximo: '',
    lote: '',
    validade: '',
    valorCompra: '',
    valorVenda: '',
    fornecedor: '',
    localizacao: ''
  })

  const [movimentacaoForm, setMovimentacaoForm] = useState({
    produtoId: '',
    quantidade: '',
    lote: '',
    validade: '',
    motivo: '',
    responsavel: ''
  })

  const produtos: Produto[] = [
    { id: '1', codigo: 'MED001', nome: 'Anestésico Lidocaína 2%', categoria: 'Medicamentos', estoque: 50, minimo: 20, maximo: 100, lote: 'L123456', validade: '2026-12-31', valorCompra: 15, valorVenda: 25, fornecedor: 'Farma Distribuidora', localizacao: 'Prateleira A1' },
    { id: '2', codigo: 'EPI002', nome: 'Luvas Descartáveis (cx 100un)', categoria: 'EPI', estoque: 5, minimo: 10, maximo: 50, lote: 'L456789', validade: '2027-06-30', valorCompra: 45, valorVenda: 70, fornecedor: 'MedSupply', localizacao: 'Prateleira B2' },
    { id: '3', codigo: 'LMP003', nome: 'Papel Toalha (pacote)', categoria: 'Limpeza', estoque: 30, minimo: 15, maximo: 60, valorCompra: 8, valorVenda: 12, fornecedor: 'Clean Pro', localizacao: 'Depósito C' },
    { id: '4', codigo: 'DESC004', nome: 'Seringa 3ml Descartável', categoria: 'Descartáveis', estoque: 2, minimo: 50, maximo: 200, lote: 'L789012', validade: '2026-08-15', valorCompra: 0.5, valorVenda: 1, fornecedor: 'MedTech', localizacao: 'Prateleira A3' },
    { id: '5', codigo: 'EQP005', nome: 'Termômetro Digital', categoria: 'Equipamentos', estoque: 15, minimo: 5, maximo: 20, valorCompra: 25, valorVenda: 45, fornecedor: 'TechMed', localizacao: 'Armário D1' },
    { id: '6', codigo: 'MAT006', nome: 'Gazes Estéreis (pacote)', categoria: 'Materiais', estoque: 45, minimo: 30, maximo: 100, lote: 'L345678', validade: '2025-12-31', valorCompra: 12, valorVenda: 20, fornecedor: 'MedSupply', localizacao: 'Prateleira A2' },
  ]

  const produtosFiltrados = produtos.filter(p => {
    const matchBusca = p.nome.toLowerCase().includes(busca.toLowerCase()) || p.codigo.toLowerCase().includes(busca.toLowerCase())
    const matchCategoria = filtroCategoria === 'Todos' || p.categoria === filtroCategoria
    return matchBusca && matchCategoria
  })

  const abaixoMinimo = produtos.filter(p => p.estoque < p.minimo).length
  const vencendo = produtos.filter(p => {
    if (!p.validade) return false
    const dias = Math.floor((new Date(p.validade).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    return dias <= 90 && dias > 0
  }).length
  const valorTotal = produtos.reduce((sum, p) => sum + (p.estoque * p.valorCompra), 0)

  const formatarMoeda = (valor: number) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  const formatarData = (data: string | undefined) => data ? new Date(data).toLocaleDateString('pt-BR') : '-'

  const abrirMovimentacao = (tipo: TipoMovimentacao, produto?: Produto) => {
    setTipoMovimentacao(tipo)
    setProdutoSelecionado(produto || null)
    setMostrarModalMovimentacao(true)
  }

  const salvarProduto = async () => {
    try {
      if (!novoProdutoForm.nome || !novoProdutoForm.codigo) {
        alert('⚠️ Preencha os campos obrigatórios: Código e Nome')
        return
      }

      const produtoData = {
        codigo: novoProdutoForm.codigo,
        nome: novoProdutoForm.nome,
        categoria: novoProdutoForm.categoria,
        estoque: Number(novoProdutoForm.estoque) || 0,
        minimo: Number(novoProdutoForm.minimo) || 0,
        maximo: Number(novoProdutoForm.maximo) || 0,
        lote: novoProdutoForm.lote,
        validade: novoProdutoForm.validade,
        valorCompra: Number(novoProdutoForm.valorCompra) || 0,
        valorVenda: Number(novoProdutoForm.valorVenda) || 0,
        fornecedor: novoProdutoForm.fornecedor,
        localizacao: novoProdutoForm.localizacao,
        dataCadastro: new Date().toISOString()
      }

      await addDoc(collection(db, 'estoque'), produtoData)
      
      alert('✅ Produto cadastrado com sucesso!')
      setMostrarModalNovo(false)
      setNovoProdutoForm({
        codigo: '',
        nome: '',
        categoria: 'Medicamentos',
        estoque: '',
        minimo: '',
        maximo: '',
        lote: '',
        validade: '',
        valorCompra: '',
        valorVenda: '',
        fornecedor: '',
        localizacao: ''
      })
    } catch (error) {
      console.error('Erro ao salvar produto:', error)
      alert('❌ Erro ao salvar produto. Tente novamente.')
    }
  }

  const salvarMovimentacao = async () => {
    try {
      if (!movimentacaoForm.quantidade) {
        alert('⚠️ Informe a quantidade')
        return
      }

      const movimentacao = {
        produtoId: produtoSelecionado?.id || '',
        produto: produtoSelecionado?.nome || '',
        tipo: tipoMovimentacao,
        quantidade: Number(movimentacaoForm.quantidade),
        lote: movimentacaoForm.lote,
        validade: movimentacaoForm.validade,
        motivo: movimentacaoForm.motivo,
        responsavel: movimentacaoForm.responsavel || 'Sistema',
        data: new Date().toISOString()
      }

      await addDoc(collection(db, 'movimentacoes_estoque'), movimentacao)
      
      alert(`✅ ${tipoMovimentacao} registrada com sucesso!`)
      setMostrarModalMovimentacao(false)
      setMovimentacaoForm({
        produtoId: '',
        quantidade: '',
        lote: '',
        validade: '',
        motivo: '',
        responsavel: ''
      })
    } catch (error) {
      console.error('Erro ao salvar movimentação:', error)
      alert('❌ Erro ao salvar movimentação. Tente novamente.')
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Package className="w-8 h-8 text-blue-400" />
            Estoque
          </h1>
          <p className="text-slate-400 mt-1">Controle completo de estoque com lotes e validade</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => abrirMovimentacao('Entrada')}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <ArrowDownCircle className="w-5 h-5" />
            Entrada
          </button>
          <button 
            onClick={() => abrirMovimentacao('Saída')}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <ArrowUpCircle className="w-5 h-5" />
            Saída
          </button>
          <button 
            onClick={() => setMostrarModalNovo(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Novo Produto
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Total Produtos</p>
              <p className="text-2xl font-bold text-white mt-1">{produtos.length}</p>
            </div>
            <div className="bg-blue-500/10 p-3 rounded-lg">
              <Package className="w-6 h-6 text-blue-400" />
            </div>
          </div>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Valor Total</p>
              <p className="text-2xl font-bold text-white mt-1">{formatarMoeda(valorTotal)}</p>
            </div>
            <div className="bg-purple-500/10 p-3 rounded-lg">
              <DollarSign className="w-6 h-6 text-purple-400" />
            </div>
          </div>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Abaixo do Mínimo</p>
              <p className="text-2xl font-bold text-red-400 mt-1">{abaixoMinimo}</p>
            </div>
            <div className="bg-red-500/10 p-3 rounded-lg">
              <TrendingDown className="w-6 h-6 text-red-400" />
            </div>
          </div>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Vencendo (90d)</p>
              <p className="text-2xl font-bold text-yellow-400 mt-1">{vencendo}</p>
            </div>
            <div className="bg-yellow-500/10 p-3 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-yellow-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Filtros e Busca */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input type="text" placeholder="Buscar por nome ou código..." value={busca} onChange={(e) => setBusca(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500" />
          </div>
          <select value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value as CategoriaEstoque | 'Todos')}
            className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500">
            <option value="Todos">Todas Categorias</option>
            <option value="Medicamentos">Medicamentos</option>
            <option value="EPI">EPI</option>
            <option value="Limpeza">Limpeza</option>
            <option value="Descartáveis">Descartáveis</option>
            <option value="Equipamentos">Equipamentos</option>
            <option value="Materiais">Materiais</option>
            <option value="Outros">Outros</option>
          </select>
          <button className="bg-slate-900 border border-slate-700 hover:border-blue-500 text-white px-4 py-2.5 rounded-lg flex items-center gap-2">
            <Download className="w-5 h-5" /> Exportar
          </button>
        </div>
      </div>

      {/* Tabela de Produtos */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-900 border-b border-slate-700">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Código</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Produto</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Categoria</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Estoque</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Lote/Validade</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Valores</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {produtosFiltrados.map((produto) => {
                const abaixoMin = produto.estoque < produto.minimo
                const vencendoEm = produto.validade ? Math.floor((new Date(produto.validade).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null
                const alertaValidade = vencendoEm !== null && vencendoEm <= 90 && vencendoEm > 0
                
                return (
                  <tr key={produto.id} className={`hover:bg-slate-700/50 transition-colors ${abaixoMin || alertaValidade ? 'bg-yellow-900/10' : ''}`}>
                    <td className="px-6 py-4 text-white font-medium">{produto.codigo}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-blue-400" />
                        <span className="text-white font-medium">{produto.nome}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-blue-500/10 text-blue-400">
                        {produto.categoria}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold text-white">{produto.estoque} un.</div>
                      <div className="text-xs text-slate-400">Mín: {produto.minimo} / Máx: {produto.maximo}</div>
                    </td>
                    <td className="px-6 py-4">
                      {produto.lote ? (
                        <div>
                          <div className="text-xs text-slate-300">Lote: {produto.lote}</div>
                          <div className={`text-xs ${alertaValidade ? 'text-yellow-400 font-bold' : 'text-slate-400'}`}>
                            Val: {formatarData(produto.validade)}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs text-slate-300">Compra: {formatarMoeda(produto.valorCompra)}</div>
                      <div className="text-xs text-slate-300">Venda: {formatarMoeda(produto.valorVenda)}</div>
                    </td>
                    <td className="px-6 py-4">
                      {abaixoMin && (
                        <div className="flex items-center gap-1 text-xs text-red-400 font-medium">
                          <TrendingDown className="w-3 h-3" />
                          Abaixo Mínimo
                        </div>
                      )}
                      {alertaValidade && (
                        <div className="flex items-center gap-1 text-xs text-yellow-400 font-medium mt-1">
                          <AlertTriangle className="w-3 h-3" />
                          Vence em {vencendoEm}d
                        </div>
                      )}
                      {!abaixoMin && !alertaValidade && (
                        <span className="text-xs text-green-400 font-medium">✓ OK</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL NOVO PRODUTO */}
      {mostrarModalNovo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-700 sticky top-0 bg-slate-800 z-10">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Package className="w-7 h-7 text-blue-400" />
                  Cadastrar Novo Produto
                </h2>
                <button onClick={() => setMostrarModalNovo(false)} className="text-slate-400 hover:text-white text-2xl">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Identificação */}
              <div>
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Tag className="w-5 h-5 text-blue-400" />
                  Identificação
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Código *</label>
                    <input
                      type="text"
                      value={novoProdutoForm.codigo}
                      onChange={(e) => setNovoProdutoForm({...novoProdutoForm, codigo: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                      placeholder="EX: MED001"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Categoria *</label>
                    <select
                      value={novoProdutoForm.categoria}
                      onChange={(e) => setNovoProdutoForm({...novoProdutoForm, categoria: e.target.value as CategoriaEstoque})}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="Medicamentos">Medicamentos</option>
                      <option value="EPI">EPI</option>
                      <option value="Limpeza">Limpeza</option>
                      <option value="Descartáveis">Descartáveis</option>
                      <option value="Equipamentos">Equipamentos</option>
                      <option value="Materiais">Materiais</option>
                      <option value="Outros">Outros</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-300 mb-2">Nome do Produto *</label>
                    <input
                      type="text"
                      value={novoProdutoForm.nome}
                      onChange={(e) => setNovoProdutoForm({...novoProdutoForm, nome: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                      placeholder="Nome completo do produto"
                    />
                  </div>
                </div>
              </div>

              {/* Quantidades */}
              <div>
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Box className="w-5 h-5 text-blue-400" />
                  Quantidades
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Quantidade Inicial</label>
                    <input
                      type="number"
                      value={novoProdutoForm.estoque}
                      onChange={(e) => setNovoProdutoForm({...novoProdutoForm, estoque: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Estoque Mínimo</label>
                    <input
                      type="number"
                      value={novoProdutoForm.minimo}
                      onChange={(e) => setNovoProdutoForm({...novoProdutoForm, minimo: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Estoque Máximo</label>
                    <input
                      type="number"
                      value={novoProdutoForm.maximo}
                      onChange={(e) => setNovoProdutoForm({...novoProdutoForm, maximo: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              {/* Lote e Validade */}
              <div>
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-400" />
                  Lote e Validade
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Lote</label>
                    <input
                      type="text"
                      value={novoProdutoForm.lote}
                      onChange={(e) => setNovoProdutoForm({...novoProdutoForm, lote: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                      placeholder="Ex: L123456"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Validade</label>
                    <input
                      type="date"
                      value={novoProdutoForm.validade}
                      onChange={(e) => setNovoProdutoForm({...novoProdutoForm, validade: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Valores */}
              <div>
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-blue-400" />
                  Valores
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Valor de Compra</label>
                    <input
                      type="number"
                      step="0.01"
                      value={novoProdutoForm.valorCompra}
                      onChange={(e) => setNovoProdutoForm({...novoProdutoForm, valorCompra: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                      placeholder="0,00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Valor de Venda</label>
                    <input
                      type="number"
                      step="0.01"
                      value={novoProdutoForm.valorVenda}
                      onChange={(e) => setNovoProdutoForm({...novoProdutoForm, valorVenda: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                      placeholder="0,00"
                    />
                  </div>
                </div>
              </div>

              {/* Fornecedor e Localização */}
              <div>
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-blue-400" />
                  Fornecedor e Localização
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Fornecedor</label>
                    <input
                      type="text"
                      value={novoProdutoForm.fornecedor}
                      onChange={(e) => setNovoProdutoForm({...novoProdutoForm, fornecedor: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                      placeholder="Nome do fornecedor"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Localização no Estoque</label>
                    <input
                      type="text"
                      value={novoProdutoForm.localizacao}
                      onChange={(e) => setNovoProdutoForm({...novoProdutoForm, localizacao: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                      placeholder="Ex: Prateleira A1"
                    />
                  </div>
                </div>
              </div>

              {/* Botões */}
              <div className="flex gap-3 pt-4 border-t border-slate-700">
                <button
                  onClick={() => setMostrarModalNovo(false)}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={salvarProduto}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                  <Save className="w-5 h-5" />
                  Salvar Produto
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL MOVIMENTAÇÃO */}
      {mostrarModalMovimentacao && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-lg max-w-2xl w-full">
            <div className="p-6 border-b border-slate-700">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  {tipoMovimentacao === 'Entrada' ? (
                    <ArrowDownCircle className="w-7 h-7 text-green-400" />
                  ) : (
                    <ArrowUpCircle className="w-7 h-7 text-red-400" />
                  )}
                  {tipoMovimentacao} de Estoque
                </h2>
                <button onClick={() => setMostrarModalMovimentacao(false)} className="text-slate-400 hover:text-white text-2xl">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {produtoSelecionado && (
                <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
                  <div className="text-sm text-slate-400">Produto:</div>
                  <div className="text-lg font-bold text-white">{produtoSelecionado.nome}</div>
                  <div className="text-sm text-slate-400 mt-1">
                    Estoque atual: <span className="text-white font-semibold">{produtoSelecionado.estoque} unidades</span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Quantidade *</label>
                <input
                  type="number"
                  value={movimentacaoForm.quantidade}
                  onChange={(e) => setMovimentacaoForm({...movimentacaoForm, quantidade: e.target.value})}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                  placeholder="Quantidade"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Lote</label>
                  <input
                    type="text"
                    value={movimentacaoForm.lote}
                    onChange={(e) => setMovimentacaoForm({...movimentacaoForm, lote: e.target.value})}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                    placeholder="Lote"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Validade</label>
                  <input
                    type="date"
                    value={movimentacaoForm.validade}
                    onChange={(e) => setMovimentacaoForm({...movimentacaoForm, validade: e.target.value})}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Motivo</label>
                <textarea
                  value={movimentacaoForm.motivo}
                  onChange={(e) => setMovimentacaoForm({...movimentacaoForm, motivo: e.target.value})}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 min-h-[80px]"
                  placeholder="Motivo da movimentação"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Responsável</label>
                <input
                  type="text"
                  value={movimentacaoForm.responsavel}
                  onChange={(e) => setMovimentacaoForm({...movimentacaoForm, responsavel: e.target.value})}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                  placeholder="Nome do responsável"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-700">
                <button
                  onClick={() => setMostrarModalMovimentacao(false)}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={salvarMovimentacao}
                  className={`flex-1 ${
                    tipoMovimentacao === 'Entrada' 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-red-600 hover:bg-red-700'
                  } text-white px-6 py-3 rounded-lg flex items-center justify-center gap-2 transition-colors`}
                >
                  <Save className="w-5 h-5" />
                  Confirmar {tipoMovimentacao}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

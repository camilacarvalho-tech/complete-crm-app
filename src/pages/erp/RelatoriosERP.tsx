import { useState } from 'react'
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Users,
  ShoppingCart,
  Package,
  FileText,
  Calendar,
  Download,
  Filter,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  PieChart,
  Target
} from 'lucide-react'

type PeriodoRelatorio = 'hoje' | 'semana' | 'mes' | 'trimestre' | 'ano' | 'personalizado'

interface MetricaKPI {
  titulo: string
  valor: string
  variacao: number
  icone: React.ReactNode
  cor: string
}

export default function RelatoriosERP() {
  const [periodoSelecionado, setPeriodoSelecionado] = useState<PeriodoRelatorio>('mes')
  const [mostrarFiltros, setMostrarFiltros] = useState(false)
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')

  // KPIs Principais
  const kpisFinanceiros: MetricaKPI[] = [
    {
      titulo: 'Receita Total',
      valor: 'R$ 487.350,00',
      variacao: 12.5,
      icone: <DollarSign className="w-6 h-6" />,
      cor: 'green'
    },
    {
      titulo: 'Despesas Total',
      valor: 'R$ 312.480,00',
      variacao: -5.2,
      icone: <TrendingDown className="w-6 h-6" />,
      cor: 'red'
    },
    {
      titulo: 'Lucro Líquido',
      valor: 'R$ 174.870,00',
      variacao: 18.3,
      icone: <TrendingUp className="w-6 h-6" />,
      cor: 'blue'
    },
    {
      titulo: 'Margem Lucro',
      valor: '35.9%',
      variacao: 3.1,
      icone: <Target className="w-6 h-6" />,
      cor: 'purple'
    }
  ]

  const kpisOperacionais: MetricaKPI[] = [
    {
      titulo: 'Vendas Realizadas',
      valor: '1.247',
      variacao: 8.7,
      icone: <ShoppingCart className="w-6 h-6" />,
      cor: 'green'
    },
    {
      titulo: 'Ticket Médio',
      valor: 'R$ 390,80',
      variacao: 4.2,
      icone: <Activity className="w-6 h-6" />,
      cor: 'blue'
    },
    {
      titulo: 'Novos Clientes',
      valor: '342',
      variacao: 15.6,
      icone: <Users className="w-6 h-6" />,
      cor: 'purple'
    },
    {
      titulo: 'Produtos Vendidos',
      valor: '4.892',
      variacao: 6.3,
      icone: <Package className="w-6 h-6" />,
      cor: 'orange'
    }
  ]

  const topProdutos = [
    { nome: 'Produto A', vendas: 1245, receita: 'R$ 124.500,00', crescimento: 15.2 },
    { nome: 'Produto B', vendas: 987, receita: 'R$ 98.700,00', crescimento: 8.5 },
    { nome: 'Produto C', vendas: 856, receita: 'R$ 85.600,00', crescimento: -2.3 },
    { nome: 'Produto D', vendas: 723, receita: 'R$ 72.300,00', crescimento: 12.8 },
    { nome: 'Produto E', vendas: 654, receita: 'R$ 65.400,00', crescimento: 5.1 }
  ]

  const vendasPorMes = [
    { mes: 'Jan', valor: 42000 },
    { mes: 'Fev', valor: 45000 },
    { mes: 'Mar', valor: 52000 },
    { mes: 'Abr', valor: 48000 },
    { mes: 'Mai', valor: 55000 },
    { mes: 'Jun', valor: 61000 },
    { mes: 'Jul', valor: 58000 },
    { mes: 'Ago', valor: 63000 },
    { mes: 'Set', valor: 59000 },
    { mes: 'Out', valor: 67000 },
    { mes: 'Nov', valor: 72000 },
    { mes: 'Dez', valor: 68000 }
  ]

  const maxVenda = Math.max(...vendasPorMes.map(v => v.valor))

  const getCorVariacao = (variacao: number) => {
    if (variacao > 0) return 'text-green-400'
    if (variacao < 0) return 'text-red-400'
    return 'text-slate-400'
  }

  const getCorKPI = (cor: string) => {
    const cores: Record<string, string> = {
      green: 'bg-green-500/10 text-green-400',
      red: 'bg-red-500/10 text-red-400',
      blue: 'bg-blue-500/10 text-blue-400',
      purple: 'bg-purple-500/10 text-purple-400',
      orange: 'bg-orange-500/10 text-orange-400'
    }
    return cores[cor] || 'bg-slate-500/10 text-slate-400'
  }

  const exportarRelatorio = () => {
    alert('📊 Exportando relatório completo em Excel...\n\nO arquivo será baixado em instantes.')
  }

  const exportarPDF = () => {
    alert('📄 Gerando relatório em PDF...\n\nO arquivo será baixado em instantes.')
  }

  return (
    <div className="p-6 space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-blue-400" />
            Business Intelligence
          </h1>
          <p className="text-slate-400 mt-1">Relatórios gerenciais e indicadores estratégicos</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setMostrarFiltros(!mostrarFiltros)}
            className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2.5 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Filter className="w-5 h-5" />
            Filtros
          </button>
          <button 
            onClick={exportarPDF}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Download className="w-5 h-5" />
            PDF
          </button>
          <button 
            onClick={exportarRelatorio}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Download className="w-5 h-5" />
            Excel
          </button>
        </div>
      </div>

      {/* Filtros */}
      {mostrarFiltros && (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-300 mb-2">Período</label>
              <div className="flex gap-2">
                {(['hoje', 'semana', 'mes', 'trimestre', 'ano'] as PeriodoRelatorio[]).map(periodo => (
                  <button
                    key={periodo}
                    onClick={() => setPeriodoSelecionado(periodo)}
                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      periodoSelecionado === periodo
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {periodo.charAt(0).toUpperCase() + periodo.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Data Início</label>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Data Fim</label>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* KPIs Financeiros */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <DollarSign className="w-6 h-6 text-green-400" />
          Indicadores Financeiros
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {kpisFinanceiros.map((kpi, index) => (
            <div key={index} className="bg-slate-800 border border-slate-700 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${getCorKPI(kpi.cor)}`}>
                  {kpi.icone}
                </div>
                <div className={`flex items-center gap-1 text-sm font-medium ${getCorVariacao(kpi.variacao)}`}>
                  {kpi.variacao > 0 ? (
                    <ArrowUpRight className="w-4 h-4" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4" />
                  )}
                  {Math.abs(kpi.variacao)}%
                </div>
              </div>
              <p className="text-slate-400 text-sm mb-1">{kpi.titulo}</p>
              <p className="text-2xl font-bold text-white">{kpi.valor}</p>
            </div>
          ))}
        </div>
      </div>

      {/* KPIs Operacionais */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Activity className="w-6 h-6 text-blue-400" />
          Indicadores Operacionais
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {kpisOperacionais.map((kpi, index) => (
            <div key={index} className="bg-slate-800 border border-slate-700 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${getCorKPI(kpi.cor)}`}>
                  {kpi.icone}
                </div>
                <div className={`flex items-center gap-1 text-sm font-medium ${getCorVariacao(kpi.variacao)}`}>
                  {kpi.variacao > 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                  {Math.abs(kpi.variacao)}%
                </div>
              </div>
              <p className="text-slate-400 text-sm mb-1">{kpi.titulo}</p>
              <p className="text-2xl font-bold text-white">{kpi.valor}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Gráfico de Vendas */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-blue-400" />
          Evolução de Vendas (Mensal)
        </h2>
        <div className="space-y-4">
          {vendasPorMes.map((item) => (
            <div key={item.mes}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-300 font-medium">{item.mes}</span>
                <span className="text-white font-bold">
                  R$ {item.valor.toLocaleString('pt-BR')}
                </span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${(item.valor / maxVenda) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Produtos */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
        <div className="p-6 border-b border-slate-700">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <PieChart className="w-6 h-6 text-purple-400" />
            Top 5 Produtos Mais Vendidos
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-900 border-b border-slate-700">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Posição</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Produto</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Vendas</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Receita</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Crescimento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {topProdutos.map((produto, index) => (
                <tr key={index} className="hover:bg-slate-700/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500/10 text-blue-400 font-bold">
                      {index + 1}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-white font-medium">{produto.nome}</td>
                  <td className="px-6 py-4 text-slate-300">{produto.vendas.toLocaleString('pt-BR')}</td>
                  <td className="px-6 py-4 text-white font-semibold">{produto.receita}</td>
                  <td className="px-6 py-4">
                    <div className={`flex items-center gap-1 ${getCorVariacao(produto.crescimento)}`}>
                      {produto.crescimento > 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                      <span className="font-medium">{Math.abs(produto.crescimento)}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

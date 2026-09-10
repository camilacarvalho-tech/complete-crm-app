/**
 * MONITOR CODE — Sistema de Inteligência para Operação de Crédito
 * Módulo completo integrado ao Nexus CRM
 * © 2026 CODE Tecnologia Empresarial
 */

import { useState } from 'react'
import {
  TrendingUp,
  DollarSign,
  Users,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  BarChart3,
  PieChart,
  Activity,
  Target,
  Percent,
  Building2,
  Calculator,
  Search,
  Filter,
} from 'lucide-react'

// Dados mockados para demonstração
const DADOS_MOCK = {
  resumo: {
    volumeMes: 2400000,
    propostasAtivas: 327,
    taxaAprovacao: 89,
    comissoesMes: 48500,
    metaMes: 3000000,
    ticketMedio: 7340,
  },
  propostas: [
    {
      id: '1',
      cliente: 'João da Silva',
      cpf: '123.456.789-00',
      produto: 'Consignado INSS',
      valor: 15000,
      parcelas: 84,
      taxa: 1.89,
      status: 'Em análise',
      dataEntrada: '2026-08-20',
      score: 85,
    },
    {
      id: '2',
      cliente: 'Maria Santos',
      cpf: '987.654.321-00',
      produto: 'Saque FGTS',
      valor: 8500,
      parcelas: 1,
      taxa: 0,
      status: 'Aprovado',
      dataEntrada: '2026-08-22',
      score: 92,
    },
    {
      id: '3',
      cliente: 'Carlos Oliveira',
      cpf: '456.789.123-00',
      produto: 'Consignado Privado',
      valor: 25000,
      parcelas: 60,
      taxa: 2.15,
      status: 'Documentação',
      dataEntrada: '2026-08-23',
      score: 78,
    },
  ],
  produtosPerformance: [
    { produto: 'Consignado INSS', volume: 850000, propostas: 124, aprovacao: 92 },
    { produto: 'FGTS', volume: 420000, propostas: 86, aprovacao: 95 },
    { produto: 'Consignado Privado', volume: 680000, propostas: 67, aprovacao: 85 },
    { produto: 'Veículos', volume: 450000, propostas: 50, aprovacao: 78 },
  ],
}

type AbaSelecionada = 'dashboard' | 'propostas' | 'simulador' | 'clientes' | 'relatorios'

function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)
}

function formatarPercentual(valor: number): string {
  return `${valor.toFixed(1)}%`
}

function CardKPI({
  titulo,
  valor,
  icone: Icone,
  cor,
  subtitulo,
}: {
  titulo: string
  valor: string | number
  icone: any
  cor: string
  subtitulo?: string
}) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div className="text-sm font-medium text-slate-600 dark:text-slate-400">{titulo}</div>
        <div className={`p-2 rounded-lg ${cor}`}>
          <Icone className="w-5 h-5 text-white" />
        </div>
      </div>
      <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">{valor}</div>
      {subtitulo && <div className="text-xs text-slate-500">{subtitulo}</div>}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const cores: Record<string, string> = {
    'Em análise': 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',
    'Aprovado': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
    'Documentação': 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
    'Rejeitado': 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300',
    'Pago': 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300',
  }

  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cores[status] || cores['Em análise']}`}>
      {status}
    </span>
  )
}

function DashboardTab() {
  const { resumo, produtosPerformance } = DADOS_MOCK
  const progressoMeta = (resumo.volumeMes / resumo.metaMes) * 100

  return (
    <div className="space-y-6">
      {/* KPIs Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <CardKPI
          titulo="Volume do Mês"
          valor={formatarMoeda(resumo.volumeMes)}
          icone={DollarSign}
          cor="bg-gradient-to-br from-[#00D9B4] to-[#00D9FF]"
          subtitulo={`Meta: ${formatarMoeda(resumo.metaMes)}`}
        />
        <CardKPI
          titulo="Propostas Ativas"
          valor={resumo.propostasAtivas}
          icone={FileText}
          cor="bg-gradient-to-br from-blue-500 to-blue-600"
        />
        <CardKPI
          titulo="Taxa Aprovação"
          valor={`${resumo.taxaAprovacao}%`}
          icone={CheckCircle}
          cor="bg-gradient-to-br from-emerald-500 to-emerald-600"
        />
        <CardKPI
          titulo="Comissões"
          valor={formatarMoeda(resumo.comissoesMes)}
          icone={Target}
          cor="bg-gradient-to-br from-amber-500 to-amber-600"
        />
        <CardKPI
          titulo="Ticket Médio"
          valor={formatarMoeda(resumo.ticketMedio)}
          icone={TrendingUp}
          cor="bg-gradient-to-br from-purple-500 to-purple-600"
        />
        <CardKPI
          titulo="Meta do Mês"
          valor={`${progressoMeta.toFixed(0)}%`}
          icone={Activity}
          cor="bg-gradient-to-br from-pink-500 to-pink-600"
          subtitulo="Atingido"
        />
      </div>

      {/* Progresso da Meta */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Progresso da Meta</h3>
          <span className="text-sm text-slate-600 dark:text-slate-400">
            {formatarMoeda(resumo.volumeMes)} / {formatarMoeda(resumo.metaMes)}
          </span>
        </div>
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#00D9B4] to-[#00D9FF] transition-all duration-500"
            style={{ width: `${Math.min(100, progressoMeta)}%` }}
          />
        </div>
        <p className="text-xs text-slate-500 mt-2">
          Faltam {formatarMoeda(resumo.metaMes - resumo.volumeMes)} para atingir a meta
        </p>
      </div>

      {/* Performance por Produto */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2 mb-4">
          <PieChart className="w-5 h-5 text-[#00D9B4]" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Performance por Produto</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="text-left text-xs font-semibold text-slate-600 dark:text-slate-400 pb-3">Produto</th>
                <th className="text-right text-xs font-semibold text-slate-600 dark:text-slate-400 pb-3">Volume</th>
                <th className="text-right text-xs font-semibold text-slate-600 dark:text-slate-400 pb-3">Propostas</th>
                <th className="text-right text-xs font-semibold text-slate-600 dark:text-slate-400 pb-3">Aprovação</th>
              </tr>
            </thead>
            <tbody>
              {produtosPerformance.map((prod, idx) => (
                <tr key={idx} className="border-b border-slate-100 dark:border-slate-700/50">
                  <td className="py-3 text-sm font-medium text-slate-900 dark:text-white">{prod.produto}</td>
                  <td className="py-3 text-sm text-right text-slate-600 dark:text-slate-400">
                    {formatarMoeda(prod.volume)}
                  </td>
                  <td className="py-3 text-sm text-right text-slate-600 dark:text-slate-400">{prod.propostas}</td>
                  <td className="py-3 text-sm text-right">
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {prod.aprovacao}%
                    </span>
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

function PropostasTab() {
  const { propostas } = DADOS_MOCK
  const [filtroStatus, setFiltroStatus] = useState<string>('todos')

  const propostasFiltradas = propostas.filter((p) =>
    filtroStatus === 'todos' ? true : p.status === filtroStatus
  )

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
        <div className="flex flex-wrap items-center gap-3">
          <Filter className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          <div className="flex flex-wrap gap-2">
            {['todos', 'Em análise', 'Aprovado', 'Documentação', 'Rejeitado'].map((status) => (
              <button
                key={status}
                onClick={() => setFiltroStatus(status)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filtroStatus === status
                    ? 'bg-[#00D9B4] text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                {status === 'todos' ? 'Todas' : status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Lista de Propostas */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            Propostas ({propostasFiltradas.length})
          </h3>
          <button className="px-4 py-2 bg-[#00D9B4] text-white rounded-lg text-sm font-semibold hover:bg-[#00D9FF] transition-colors">
            + Nova Proposta
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-900/50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400">Cliente</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400">CPF</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400">Produto</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400">Valor</th>
                <th className="px-5 py-3 text-center text-xs font-semibold text-slate-600 dark:text-slate-400">Parcelas</th>
                <th className="px-5 py-3 text-center text-xs font-semibold text-slate-600 dark:text-slate-400">Taxa</th>
                <th className="px-5 py-3 text-center text-xs font-semibold text-slate-600 dark:text-slate-400">Score</th>
                <th className="px-5 py-3 text-center text-xs font-semibold text-slate-600 dark:text-slate-400">Status</th>
                <th className="px-5 py-3 text-center text-xs font-semibold text-slate-600 dark:text-slate-400">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {propostasFiltradas.map((prop) => (
                <tr key={prop.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <td className="px-5 py-4 text-sm font-medium text-slate-900 dark:text-white">{prop.cliente}</td>
                  <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-400">{prop.cpf}</td>
                  <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-400">{prop.produto}</td>
                  <td className="px-5 py-4 text-sm text-right font-semibold text-slate-900 dark:text-white">
                    {formatarMoeda(prop.valor)}
                  </td>
                  <td className="px-5 py-4 text-sm text-center text-slate-600 dark:text-slate-400">{prop.parcelas}x</td>
                  <td className="px-5 py-4 text-sm text-center text-slate-600 dark:text-slate-400">
                    {prop.taxa > 0 ? `${prop.taxa}%` : '-'}
                  </td>
                  <td className="px-5 py-4 text-sm text-center">
                    <span
                      className={`font-bold ${
                        prop.score >= 80
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : prop.score >= 60
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {prop.score}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <StatusBadge status={prop.status} />
                  </td>
                  <td className="px-5 py-4 text-sm text-center text-slate-600 dark:text-slate-400">
                    {new Date(prop.dataEntrada).toLocaleDateString('pt-BR')}
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

function SimuladorTab() {
  const [valor, setValor] = useState(10000)
  const [parcelas, setParcelas] = useState(60)
  const [taxa, setTaxa] = useState(1.89)

  const valorParcela = (valor * (taxa / 100) * Math.pow(1 + taxa / 100, parcelas)) /
    (Math.pow(1 + taxa / 100, parcelas) - 1)

  const totalPagar = valorParcela * parcelas
  const totalJuros = totalPagar - valor

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Formulário */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 space-y-6">
        <div className="flex items-center gap-2 mb-4">
          <Calculator className="w-6 h-6 text-[#00D9B4]" />
          <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Simulador de Crédito</h3>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Valor Solicitado
          </label>
          <input
            type="number"
            value={valor}
            onChange={(e) => setValor(Number(e.target.value))}
            className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-lg font-semibold"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Número de Parcelas: {parcelas}x
          </label>
          <input
            type="range"
            min="12"
            max="96"
            step="12"
            value={parcelas}
            onChange={(e) => setParcelas(Number(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>12x</span>
            <span>96x</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Taxa de Juros (% a.m.): {taxa}%
          </label>
          <input
            type="range"
            min="0.5"
            max="5"
            step="0.1"
            value={taxa}
            onChange={(e) => setTaxa(Number(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>0.5%</span>
            <span>5%</span>
          </div>
        </div>

        <div className="pt-4">
          <button className="w-full px-6 py-3 bg-gradient-to-r from-[#00D9B4] to-[#00D9FF] text-white rounded-lg font-semibold text-lg hover:shadow-lg transition-all">
            Simular Proposta
          </button>
        </div>
      </div>

      {/* Resultado */}
      <div className="space-y-4">
        <div className="bg-gradient-to-br from-[#00D9B4] to-[#00D9FF] rounded-xl p-6 text-white">
          <div className="text-sm font-medium mb-2">Valor da Parcela</div>
          <div className="text-4xl font-bold">{formatarMoeda(valorParcela)}</div>
          <div className="text-sm mt-2 opacity-90">{parcelas}x sem entrada</div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 space-y-4">
          <h4 className="font-semibold text-slate-900 dark:text-white">Resumo da Simulação</h4>

          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-slate-600 dark:text-slate-400">Valor solicitado:</span>
              <span className="text-sm font-semibold text-slate-900 dark:text-white">{formatarMoeda(valor)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-600 dark:text-slate-400">Total de juros:</span>
              <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                {formatarMoeda(totalJuros)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-600 dark:text-slate-400">Total a pagar:</span>
              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                {formatarMoeda(totalPagar)}
              </span>
            </div>
            <div className="flex justify-between pt-3 border-t border-slate-200 dark:border-slate-700">
              <span className="text-sm text-slate-600 dark:text-slate-400">Taxa mensal:</span>
              <span className="text-sm font-semibold text-slate-900 dark:text-white">{taxa}% a.m.</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-600 dark:text-slate-400">CET (aprox.):</span>
              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                {((totalPagar / valor - 1) * 100).toFixed(2)}%
              </span>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-xl p-4">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
            <div className="text-xs text-blue-800 dark:text-blue-200">
              <p className="font-semibold mb-1">Simulação ilustrativa</p>
              <p>Os valores apresentados são aproximados e podem variar conforme análise de crédito, convênio e condições específicas do cliente.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function MonitorCODE() {
  const [abaSelecionada, setAbaSelecionada] = useState<AbaSelecionada>('dashboard')

  const abas: { id: AbaSelecionada; label: string; icone: any }[] = [
    { id: 'dashboard', label: 'Dashboard', icone: BarChart3 },
    { id: 'propostas', label: 'Propostas', icone: FileText },
    { id: 'simulador', label: 'Simulador', icone: Calculator },
    { id: 'clientes', label: 'Análise Clientes', icone: Users },
    { id: 'relatorios', label: 'Relatórios', icone: PieChart },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-[#00D9B4] to-[#00D9FF] rounded-lg flex items-center justify-center">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Monitor CODE</h1>
            <span className="px-3 py-1 rounded-full bg-[#00D9B4]/10 text-[#00D9B4] text-xs font-semibold border border-[#00D9B4]/20">
              Intelligence v1.0
            </span>
          </div>
          <p className="text-slate-600 dark:text-slate-400">
            Sistema de inteligência para operação de crédito · Desenvolvido por CODE Tecnologia Empresarial
          </p>
        </div>
      </div>

      {/* Abas de Navegação */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-2">
        <div className="flex flex-wrap gap-2">
          {abas.map((aba) => {
            const Icone = aba.icone
            const ativo = abaSelecionada === aba.id

            return (
              <button
                key={aba.id}
                onClick={() => setAbaSelecionada(aba.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
                  ativo
                    ? 'bg-gradient-to-r from-[#00D9B4] to-[#00D9FF] text-white shadow-md'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <Icone className="w-4 h-4" />
                <span>{aba.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Conteúdo das Abas */}
      <div>
        {abaSelecionada === 'dashboard' && <DashboardTab />}
        {abaSelecionada === 'propostas' && <PropostasTab />}
        {abaSelecionada === 'simulador' && <SimuladorTab />}
        {abaSelecionada === 'clientes' && (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-8 border border-slate-200 dark:border-slate-700 text-center">
            <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">Análise de Clientes</h3>
            <p className="text-slate-600 dark:text-slate-400">
              Módulo de scoring e análise de perfil de crédito em desenvolvimento
            </p>
          </div>
        )}
        {abaSelecionada === 'relatorios' && (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-8 border border-slate-200 dark:border-slate-700 text-center">
            <PieChart className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">Relatórios Gerenciais</h3>
            <p className="text-slate-600 dark:text-slate-400">
              Analytics completo e relatórios personalizados em desenvolvimento
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

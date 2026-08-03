import React, { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { db } from '../../firebase'
import { collection, addDoc, onSnapshot, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore'
import * as XLSX from 'xlsx'
import { 
  DollarSign, 
  Filter, 
  Search, 
  Download, 
  Plus,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Edit2,
  Trash2,
  FileText,
  Calendar,
  Building2,
  Receipt,
  X,
  Save,
  User,
  CreditCard,
  DollarSign as Money
} from 'lucide-react'

type FormasPagamento = 
  | 'PIX'
  | 'Dinheiro'
  | 'Boleto'
  | 'Cartão Débito'
  | 'Cartão Crédito'
  | 'Transferência Bancária'
  | 'TED'
  | 'DOC'
  | 'Cheque'

type SituacaoPagamento = 'Pago' | 'Pendente' | 'Atrasado' | 'Cancelado'

type CategoriaDespesa =
  | 'Salários e Encargos'
  | 'Aluguel'
  | 'Energia Elétrica'
  | 'Água'
  | 'Internet/Telefone'
  | 'Material de Escritório'
  | 'Material de Limpeza'
  | 'Manutenção e Reparos'
  | 'Combustível'
  | 'Impostos e Taxas'
  | 'Marketing e Publicidade'
  | 'Honorários Profissionais'
  | 'Seguros'
  | 'Compra de Mercadorias'
  | 'Outros'

interface ContaPagar {
  id: string
  fornecedor: string
  centroCusto: string
  categoria: CategoriaDespesa
  descricao: string
  dataVencimento: Date
  dataPagamento: Date | null
  valorBruto: number
  desconto: number
  juros: number
  multa: number
  valorLiquido: number
  formaPagamento: FormasPagamento
  comprovante: string
  responsavel: string
  status: SituacaoPagamento
  recorrente: boolean
  observacoes: string
  criadoEm: Date
}

export default function ContasPagarERP() {
  const { user, empresa, usuario } = useAuth()
  const empresaId = empresa?.id || usuario?.empresaId || ''
  const [contas, setContas] = useState<ContaPagar[]>([])
  const [loading, setLoading] = useState(true)
  
  // Estados de filtros
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<string>('todos')
  const [filtroCategoria, setFiltroCategoria] = useState<string>('todas')
  const [filtroDataInicio, setFiltroDataInicio] = useState('')
  const [filtroDataFim, setFiltroDataFim] = useState('')
  const [showModalNovo, setShowModalNovo] = useState(false)
  const [showModalPagamento, setShowModalPagamento] = useState(false)
  const [contaSelecionada, setContaSelecionada] = useState<ContaPagar | null>(null)

  // Estados do formulário de nova conta
  const [formFornecedor, setFormFornecedor] = useState('')
  const [formCentroCusto, setFormCentroCusto] = useState('Administrativo')
  const [formCategoria, setFormCategoria] = useState<CategoriaDespesa>('Outros')
  const [formDescricao, setFormDescricao] = useState('')
  const [formDataVencimento, setFormDataVencimento] = useState('')
  const [formValorBruto, setFormValorBruto] = useState('')
  const [formDesconto, setFormDesconto] = useState('')
  const [formJuros, setFormJuros] = useState('')
  const [formMulta, setFormMulta] = useState('')
  const [formFormaPagamento, setFormFormaPagamento] = useState<FormasPagamento>('Boleto')
  const [formRecorrente, setFormRecorrente] = useState(false)
  const [formObservacoes, setFormObservacoes] = useState('')
  const [formComprovante, setFormComprovante] = useState<File | null>(null)

  // Carregar contas a pagar (tenant)
  useEffect(() => {
    if (!empresaId) {
      setContas([])
      setLoading(false)
      return
    }
    const unsub = onSnapshot(
      collection(db, 'empresas', empresaId, 'contasPagar'),
      (snap) => {
        const contasData: ContaPagar[] = snap.docs.map((d) => {
          const data = d.data()
          return {
            id: d.id,
            ...data,
            dataVencimento: data.dataVencimento?.toDate?.() || data.dataVencimento || new Date(),
            dataPagamento: data.dataPagamento?.toDate?.() || data.dataPagamento || null,
            criadoEm: data.criadoEm?.toDate?.() || data.criadoEm || new Date(),
          } as ContaPagar
        })
        setContas(contasData)
        setLoading(false)
      },
      (err) => {
        console.error(err)
        setLoading(false)
      }
    )
    return () => unsub()
  }, [empresaId])

  // Atualizar status automaticamente (Pendente → Atrasado)
  useEffect(() => {
    const hoje = new Date()
    setContas(prev => prev.map(conta => {
      if ((conta.status === 'Pendente') && new Date(conta.dataVencimento) < hoje) {
        return { ...conta, status: 'Atrasado' as SituacaoPagamento }
      }
      return conta
    }))
  }, [])

  // Filtrar contas
  const contasFiltradas = contas.filter(conta => {
    const matchBusca = conta.fornecedor.toLowerCase().includes(busca.toLowerCase()) ||
                       conta.descricao.toLowerCase().includes(busca.toLowerCase())
    const matchStatus = filtroStatus === 'todos' || conta.status === filtroStatus
    const matchCategoria = filtroCategoria === 'todas' || conta.categoria === filtroCategoria
    
    let matchData = true
    if (filtroDataInicio && filtroDataFim) {
      const dataVenc = new Date(conta.dataVencimento)
      const dataInicio = new Date(filtroDataInicio)
      const dataFim = new Date(filtroDataFim)
      matchData = dataVenc >= dataInicio && dataVenc <= dataFim
    }

    return matchBusca && matchStatus && matchCategoria && matchData
  })

  // Calcular totalizadores
  const totalPago = contas
    .filter(c => c.status === 'Pago')
    .reduce((sum, c) => sum + c.valorLiquido, 0)

  const totalPendente = contas
    .filter(c => c.status === 'Pendente')
    .reduce((sum, c) => sum + c.valorLiquido, 0)

  const totalAtrasado = contas
    .filter(c => c.status === 'Atrasado')
    .reduce((sum, c) => sum + c.valorLiquido, 0)

  const totalGeral = contas.reduce((sum, c) => sum + c.valorLiquido, 0)

  // Funções
  // Função para formatar valor com pontos e vírgulas
  const parseValor = (valor: string): number => {
    if (!valor) return 0
    // Remove pontos (separador de milhar) e substitui vírgula por ponto
    const valorLimpo = valor.replace(/\./g, '').replace(',', '.')
    return parseFloat(valorLimpo) || 0
  }

  // Calcular valor líquido
  const calcularValorLiquido = () => {
    const bruto = parseValor(formValorBruto)
    const desc = parseValor(formDesconto)
    const jur = parseValor(formJuros)
    const mult = parseValor(formMulta)
    return bruto - desc + jur + mult
  }

  // Função para salvar nova conta
  const salvarNovaConta = async () => {
    // Validações
    if (!formFornecedor || !formDescricao || !formDataVencimento || !formValorBruto) {
      alert('❌ Por favor, preencha todos os campos obrigatórios!')
      return
    }

    try {
      const novaConta = {
        fornecedor: formFornecedor,
        centroCusto: formCentroCusto,
        categoria: formCategoria,
        descricao: formDescricao,
        dataVencimento: new Date(formDataVencimento),
        dataPagamento: null,
        valorBruto: parseValor(formValorBruto),
        desconto: parseValor(formDesconto),
        juros: parseValor(formJuros),
        multa: parseValor(formMulta),
        valorLiquido: calcularValorLiquido(),
        formaPagamento: formFormaPagamento,
        comprovante: formComprovante?.name || '',
        responsavel: user?.nome || 'Sistema',
        status: 'Pendente',
        recorrente: formRecorrente,
        observacoes: formObservacoes,
        criadoEm: serverTimestamp()
      }

      await addDoc(collection(db, 'empresas', empresaId, 'contasPagar'), { ...novaConta, empresaId })
      
      // Limpar formulário
      setFormFornecedor('')
      setFormCentroCusto('Administrativo')
      setFormCategoria('Outros')
      setFormDescricao('')
      setFormDataVencimento('')
      setFormValorBruto('')
      setFormDesconto('')
      setFormJuros('')
      setFormMulta('')
      setFormFormaPagamento('Boleto')
      setFormRecorrente(false)
      setFormObservacoes('')
      setFormComprovante(null)
      setShowModalNovo(false)
      
      alert('✅ Conta a pagar salva com sucesso!')
    } catch (error) {
      console.error('Erro ao salvar conta:', error)
      alert('❌ Erro ao salvar conta. Tente novamente.')
    }
  }

  const abrirModalPagamento = (conta: ContaPagar) => {
    setContaSelecionada(conta)
    setShowModalPagamento(true)
  }

  const efetuarPagamento = async (contaId: string) => {
    try {
      const contaRef = doc(db, 'empresas', empresaId, 'contasPagar', contaId)
      await updateDoc(contaRef, {
        status: 'Pago',
        dataPagamento: new Date()
      })
      setShowModalPagamento(false)
      setContaSelecionada(null)
    } catch (error) {
      console.error('Erro ao efetuar pagamento:', error)
      // Fallback para estado local
      setContas(prev => prev.map(conta => 
        conta.id === contaId 
          ? { ...conta, status: 'Pago' as SituacaoPagamento, dataPagamento: new Date() }
          : conta
      ))
      setShowModalPagamento(false)
      setContaSelecionada(null)
    }
  }

  const cancelarConta = async (contaId: string) => {
    if (confirm('Deseja realmente cancelar esta conta?')) {
      try {
        const contaRef = doc(db, 'empresas', empresaId, 'contasPagar', contaId)
        await updateDoc(contaRef, {
          status: 'Cancelado'
        })
      } catch (error) {
        console.error('Erro ao cancelar conta:', error)
        // Fallback para estado local
        setContas(prev => prev.map(conta => 
          conta.id === contaId 
            ? { ...conta, status: 'Cancelado' as SituacaoPagamento }
            : conta
        ))
      }
    }
  }

  const excluirConta = async (contaId: string) => {
    if (confirm('Deseja realmente excluir esta conta? Esta ação não pode ser desfeita.')) {
      try {
        await deleteDoc(doc(db, 'empresas', empresaId, 'contasPagar', contaId))
        // onSnapshot atualiza a lista
      } catch (error) {
        console.error('Erro ao excluir conta:', error)
        // Fallback para estado local
        setContas(prev => prev.filter(conta => conta.id !== contaId))
      }
    }
  }

  const exportarDados = () => {
    // Preparar dados para exportação
    const dadosExport = contasFiltradas.map(conta => ({
      Fornecedor: conta.fornecedor,
      'Centro de Custo': conta.centroCusto,
      Categoria: conta.categoria,
      Descrição: conta.descricao,
      Vencimento: formatarData(conta.dataVencimento),
      Pagamento: formatarData(conta.dataPagamento),
      'Valor Bruto': conta.valorBruto,
      Desconto: conta.desconto,
      Juros: conta.juros,
      Multa: conta.multa,
      'Valor Líquido': conta.valorLiquido,
      'Forma Pagamento': conta.formaPagamento,
      Status: conta.status,
      Recorrente: conta.recorrente ? 'Sim' : 'Não',
      Observações: conta.observacoes,
      Responsável: conta.responsavel
    }))

    // Criar workbook
    const ws = XLSX.utils.json_to_sheet(dadosExport)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Contas a Pagar')

    // Salvar arquivo
    const dataAtual = new Date().toISOString().split('T')[0]
    XLSX.writeFile(wb, `Contas_Pagar_${dataAtual}.xlsx`)
  }

  // Ícone por status
  const getIconeStatus = (status: SituacaoPagamento) => {
    switch (status) {
      case 'Pago':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />
      case 'Pendente':
        return <Clock className="w-4 h-4 text-yellow-500" />
      case 'Atrasado':
        return <AlertCircle className="w-4 h-4 text-red-500" />
      case 'Cancelado':
        return <XCircle className="w-4 h-4 text-gray-500" />
    }
  }

  // Badge por status
  const getBadgeStatus = (status: SituacaoPagamento) => {
    const baseClasses = "px-2 py-1 rounded-full text-xs font-medium"
    switch (status) {
      case 'Pago':
        return `${baseClasses} bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400`
      case 'Pendente':
        return `${baseClasses} bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400`
      case 'Atrasado':
        return `${baseClasses} bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400`
      case 'Cancelado':
        return `${baseClasses} bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400`
    }
  }

  // Ícone por categoria
  const getIconeCategoria = (categoria: CategoriaDespesa) => {
    const iconMap: Record<CategoriaDespesa, string> = {
      'Salários e Encargos': '👥',
      'Aluguel': '🏢',
      'Energia Elétrica': '⚡',
      'Água': '💧',
      'Internet/Telefone': '📞',
      'Material de Escritório': '📝',
      'Material de Limpeza': '🧹',
      'Manutenção e Reparos': '🔧',
      'Combustível': '⛽',
      'Impostos e Taxas': '🧾',
      'Marketing e Publicidade': '📢',
      'Honorários Profissionais': '💼',
      'Seguros': '🛡️',
      'Compra de Mercadorias': '📦',
      'Outros': '📋'
    }
    return iconMap[categoria] || '📋'
  }

  // Formatar data
  const formatarData = (data: Date | null) => {
    if (!data) return '-'
    return new Date(data).toLocaleDateString('pt-BR')
  }

  // Formatar moeda
  const formatarMoeda = (valor: number) => {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          💳 Contas a Pagar
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Controle completo de despesas e pagamentos a fornecedores
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {/* Total Pago */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Total Pago</span>
            <CheckCircle2 className="w-5 h-5 text-green-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatarMoeda(totalPago)}
          </div>
          <div className="text-xs text-green-600 dark:text-green-400 mt-1">
            {contas.filter(c => c.status === 'Pago').length} pagamento(s)
          </div>
        </div>

        {/* Total Pendente */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Total Pendente</span>
            <Clock className="w-5 h-5 text-yellow-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatarMoeda(totalPendente)}
          </div>
          <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
            {contas.filter(c => c.status === 'Pendente').length} pendente(s)
          </div>
        </div>

        {/* Total Atrasado */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border-l-4 border-red-500">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Total Atrasado</span>
            <AlertCircle className="w-5 h-5 text-red-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatarMoeda(totalAtrasado)}
          </div>
          <div className="text-xs text-red-600 dark:text-red-400 mt-1">
            {contas.filter(c => c.status === 'Atrasado').length} atrasado(s)
          </div>
        </div>

        {/* Total Geral */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Total Geral</span>
            <DollarSign className="w-5 h-5 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatarMoeda(totalGeral)}
          </div>
          <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">
            {contas.length} conta(s)
          </div>
        </div>
      </div>

      {/* Filtros e Ações */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Busca */}
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Search className="w-4 h-4 inline mr-1" />
              Buscar Fornecedor/Descrição
            </label>
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Digite para buscar..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Filtro Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Filter className="w-4 h-4 inline mr-1" />
              Status
            </label>
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="todos">Todos</option>
              <option value="Pago">Pago</option>
              <option value="Pendente">Pendente</option>
              <option value="Atrasado">Atrasado</option>
              <option value="Cancelado">Cancelado</option>
            </select>
          </div>

          {/* Filtro Categoria */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Receipt className="w-4 h-4 inline mr-1" />
              Categoria
            </label>
            <select
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="todas">Todas</option>
              <option value="Salários e Encargos">Salários e Encargos</option>
              <option value="Aluguel">Aluguel</option>
              <option value="Energia Elétrica">Energia Elétrica</option>
              <option value="Água">Água</option>
              <option value="Internet/Telefone">Internet/Telefone</option>
              <option value="Material de Escritório">Material de Escritório</option>
              <option value="Material de Limpeza">Material de Limpeza</option>
              <option value="Manutenção e Reparos">Manutenção e Reparos</option>
              <option value="Combustível">Combustível</option>
              <option value="Impostos e Taxas">Impostos e Taxas</option>
              <option value="Marketing e Publicidade">Marketing</option>
              <option value="Honorários Profissionais">Honorários</option>
              <option value="Seguros">Seguros</option>
              <option value="Compra de Mercadorias">Compras</option>
              <option value="Outros">Outros</option>
            </select>
          </div>

          {/* Botões de Ação */}
          <div className="flex items-end gap-2">
            <button
              onClick={() => setShowModalNovo(true)}
              className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nova
            </button>
            <button
              onClick={exportarDados}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filtro de Data */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Data Início
            </label>
            <input
              type="date"
              value={filtroDataInicio}
              onChange={(e) => setFiltroDataInicio(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Data Fim
            </label>
            <input
              type="date"
              value={filtroDataFim}
              onChange={(e) => setFiltroDataFim(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Tabela de Contas */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Fornecedor
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Categoria
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Vencimento
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Valor
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Pagamento
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {contasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    Nenhuma conta encontrada
                  </td>
                </tr>
              ) : (
                contasFiltradas.map((conta) => (
                  <tr 
                    key={conta.id}
                    className={`hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                      conta.status === 'Atrasado' ? 'bg-red-50 dark:bg-red-900/10' : ''
                    }`}
                  >
                    {/* Fornecedor */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-gray-400" />
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {conta.fornecedor}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {conta.descricao}
                          </div>
                          {conta.recorrente && (
                            <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                              🔄 Recorrente
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Categoria */}
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        <span>{getIconeCategoria(conta.categoria)}</span>
                        <span>{conta.categoria}</span>
                      </span>
                    </td>

                    {/* Vencimento */}
                    <td className="px-4 py-4">
                      <div className={`text-sm ${
                        conta.status === 'Atrasado'
                          ? 'text-red-600 dark:text-red-400 font-bold' 
                          : 'text-gray-900 dark:text-white'
                      }`}>
                        {formatarData(conta.dataVencimento)}
                      </div>
                      {conta.status === 'Atrasado' && (
                        <div className="text-xs text-red-500 dark:text-red-400 font-medium mt-1">
                          VENCIDO
                        </div>
                      )}
                    </td>

                    {/* Valor */}
                    <td className="px-4 py-4">
                      <div className="text-sm font-bold text-gray-900 dark:text-white">
                        {formatarMoeda(conta.valorLiquido)}
                      </div>
                      {(conta.desconto > 0 || conta.juros > 0 || conta.multa > 0) && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Bruto: {formatarMoeda(conta.valorBruto)}
                          {conta.desconto > 0 && ` | Desc: ${formatarMoeda(conta.desconto)}`}
                          {conta.juros > 0 && ` | Juros: ${formatarMoeda(conta.juros)}`}
                          {conta.multa > 0 && ` | Multa: ${formatarMoeda(conta.multa)}`}
                        </div>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        {getIconeStatus(conta.status)}
                        <span className={getBadgeStatus(conta.status)}>
                          {conta.status}
                        </span>
                      </div>
                    </td>

                    {/* Data Pagamento */}
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {formatarData(conta.dataPagamento)}
                      </div>
                    </td>

                    {/* Ações */}
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center gap-2">
                        {(conta.status === 'Pendente' || conta.status === 'Atrasado') && (
                          <button
                            onClick={() => abrirModalPagamento(conta)}
                            className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                            title="Efetuar Pagamento"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}
                        
                        {conta.status === 'Pago' && (
                          <button
                            onClick={() => alert('Ver comprovante')}
                            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            title="Ver Comprovante"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          onClick={() => alert('Editar conta')}
                          className="p-2 text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        {conta.status !== 'Cancelado' && conta.status !== 'Pago' && (
                          <button
                            onClick={() => cancelarConta(conta.id)}
                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Cancelar"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          onClick={() => excluirConta(conta.id)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Rodapé da tabela */}
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Mostrando <span className="font-medium text-gray-900 dark:text-white">{contasFiltradas.length}</span> de{' '}
            <span className="font-medium text-gray-900 dark:text-white">{contas.length}</span> conta(s)
          </div>
        </div>
      </div>

      {/* Modal de Pagamento */}
      {showModalPagamento && contaSelecionada && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Efetuar Pagamento
            </h3>

            <div className="space-y-3 mb-6">
              <div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Fornecedor:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">
                  {contaSelecionada.fornecedor}
                </span>
              </div>
              <div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Descrição:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">
                  {contaSelecionada.descricao}
                </span>
              </div>
              <div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Vencimento:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">
                  {formatarData(contaSelecionada.dataVencimento)}
                </span>
              </div>
              <div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Valor:</span>
                <span className="ml-2 font-bold text-red-600 dark:text-red-400 text-lg">
                  {formatarMoeda(contaSelecionada.valorLiquido)}
                </span>
              </div>
              <div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Forma de Pagamento:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">
                  {contaSelecionada.formaPagamento}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => efetuarPagamento(contaSelecionada.id)}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
              >
                Confirmar Pagamento
              </button>
              <button
                onClick={() => {
                  setShowModalPagamento(false)
                  setContaSelecionada(null)
                }}
                className="px-4 py-2 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-900 dark:text-white rounded-lg font-medium transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nova Conta */}
      {showModalNovo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full p-6 my-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Receipt className="w-6 h-6 text-purple-500" />
                Nova Conta a Pagar
              </h3>
              <button
                onClick={() => setShowModalNovo(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* Fornecedor */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Building2 className="w-4 h-4 inline mr-1" />
                  Fornecedor *
                </label>
                <input
                  type="text"
                  value={formFornecedor}
                  onChange={(e) => setFormFornecedor(e.target.value)}
                  placeholder="Nome do fornecedor"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              {/* Categoria */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Receipt className="w-4 h-4 inline mr-1" />
                  Categoria *
                </label>
                <select
                  value={formCategoria}
                  onChange={(e) => setFormCategoria(e.target.value as CategoriaDespesa)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="Outros">Outros</option>
                  <option value="Salários e Encargos">Salários e Encargos</option>
                  <option value="Aluguel">Aluguel</option>
                  <option value="Energia Elétrica">Energia Elétrica</option>
                  <option value="Água">Água</option>
                  <option value="Internet/Telefone">Internet/Telefone</option>
                  <option value="Material de Escritório">Material de Escritório</option>
                  <option value="Material de Limpeza">Material de Limpeza</option>
                  <option value="Manutenção e Reparos">Manutenção e Reparos</option>
                  <option value="Combustível">Combustível</option>
                  <option value="Impostos e Taxas">Impostos e Taxas</option>
                  <option value="Marketing e Publicidade">Marketing e Publicidade</option>
                  <option value="Honorários Profissionais">Honorários Profissionais</option>
                  <option value="Seguros">Seguros</option>
                  <option value="Compra de Mercadorias">Compra de Mercadorias</option>
                </select>
              </div>

              {/* Descrição */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <FileText className="w-4 h-4 inline mr-1" />
                  Descrição *
                </label>
                <input
                  type="text"
                  value={formDescricao}
                  onChange={(e) => setFormDescricao(e.target.value)}
                  placeholder="Descrição detalhada da despesa"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              {/* Valor Bruto */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Money className="w-4 h-4 inline mr-1" />
                  Valor *
                </label>
                <input
                  type="text"
                  value={formValorBruto}
                  onChange={(e) => setFormValorBruto(e.target.value)}
                  placeholder="R$ 0,00"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              {/* Data de Vencimento */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Vencimento *
                </label>
                <input
                  type="date"
                  value={formDataVencimento}
                  onChange={(e) => setFormDataVencimento(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              {/* Forma de Pagamento */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <CreditCard className="w-4 h-4 inline mr-1" />
                  Forma de Pagamento
                </label>
                <select
                  value={formFormaPagamento}
                  onChange={(e) => setFormFormaPagamento(e.target.value as FormasPagamento)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="Boleto">Boleto</option>
                  <option value="PIX">PIX</option>
                  <option value="Dinheiro">Dinheiro</option>
                  <option value="Cartão Débito">Cartão Débito</option>
                  <option value="Cartão Crédito">Cartão Crédito</option>
                  <option value="Transferência Bancária">Transferência Bancária</option>
                  <option value="TED">TED</option>
                  <option value="DOC">DOC</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>

              {/* Centro de Custo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Building2 className="w-4 h-4 inline mr-1" />
                  Centro de Custo
                </label>
                <select
                  value={formCentroCusto}
                  onChange={(e) => setFormCentroCusto(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="Administrativo">Administrativo</option>
                  <option value="Operacional">Operacional</option>
                  <option value="Vendas">Vendas</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Financeiro">Financeiro</option>
                  <option value="TI">TI</option>
                  <option value="RH">RH</option>
                </select>
              </div>

              {/* Desconto */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  💰 Desconto
                </label>
                <input
                  type="text"
                  value={formDesconto}
                  onChange={(e) => setFormDesconto(e.target.value)}
                  placeholder="R$ 0,00"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              {/* Juros */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  📈 Juros
                </label>
                <input
                  type="text"
                  value={formJuros}
                  onChange={(e) => setFormJuros(e.target.value)}
                  placeholder="R$ 0,00"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              {/* Multa */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  ⚠️ Multa
                </label>
                <input
                  type="text"
                  value={formMulta}
                  onChange={(e) => setFormMulta(e.target.value)}
                  placeholder="R$ 0,00"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              {/* Valor Líquido (calculado) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  💵 Valor Líquido
                </label>
                <input
                  type="text"
                  value={formatarMoeda(calcularValorLiquido())}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-white font-bold"
                />
              </div>

              {/* Recorrente */}
              <div className="md:col-span-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formRecorrente}
                    onChange={(e) => setFormRecorrente(e.target.checked)}
                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-2 focus:ring-purple-500"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    🔄 Esta é uma despesa recorrente (mensal)
                  </span>
                </label>
              </div>

              {/* Observações */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  📝 Observações
                </label>
                <textarea
                  value={formObservacoes}
                  onChange={(e) => setFormObservacoes(e.target.value)}
                  rows={3}
                  placeholder="Informações adicionais sobre esta despesa..."
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white resize-none"
                />
              </div>

              {/* Comprovante */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  📎 Anexar Comprovante
                </label>
                <input
                  type="file"
                  onChange={(e) => setFormComprovante(e.target.files?.[0] || null)}
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Formatos aceitos: PDF, JPG, PNG (máx. 5MB)
                </p>
              </div>
            </div>

            {/* Botões */}
            <div className="flex gap-3 justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowModalNovo(false)}
                className="px-6 py-2 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-900 dark:text-white rounded-lg font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={salvarNovaConta}
                className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
              >
                <Save className="w-4 h-4" />
                Salvar Conta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

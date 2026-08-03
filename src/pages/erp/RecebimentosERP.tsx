import React, { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { db } from '../../firebase'
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore'
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
  Send,
  Calendar,
  X,
  Save,
  Building2,
  User,
  CreditCard,
  DollarSign as Money,
  Copy
} from 'lucide-react'

type FormasPagamento = 
  | 'PIX'
  | 'Dinheiro'
  | 'Boleto'
  | 'Cartão Débito'
  | 'Cartão Crédito'
  | 'Parcelado'
  | 'Convênio'
  | 'Transferência Bancária'
  | 'TED'
  | 'DOC'

type SituacaoRecebimento = 'Pago' | 'Pendente' | 'Cancelado' | 'Recebido Parcialmente'

interface Recebimento {
  id: string
  empresa: string
  cliente: string
  formaPagamento: FormasPagamento
  numeroParcela: number
  quantidadeParcelas: number
  dataVencimento: Date
  dataRecebimento: Date | null
  valorBruto: number
  desconto: number
  juros: number
  multa: number
  valorLiquido: number
  situacao: SituacaoRecebimento
  observacoes: string
  comprovante: string
  criadoPor: string
  criadoEm: Date
}

export default function RecebimentosERP() {
  const { user, empresa, usuario } = useAuth()
  const empresaId = empresa?.id || usuario?.empresaId || ''
  const [recebimentos, setRecebimentos] = useState<Recebimento[]>([])
  
  // Estados de filtros
  const [busca, setBusca] = useState('')
  const [filtroSituacao, setFiltroSituacao] = useState<string>('todos')
  const [filtroFormaPagamento, setFiltroFormaPagamento] = useState<string>('todas')
  const [filtroDataInicio, setFiltroDataInicio] = useState('')
  const [filtroDataFim, setFiltroDataFim] = useState('')
  const [showModalNovo, setShowModalNovo] = useState(false)
  const [showModalPagamento, setShowModalPagamento] = useState(false)
  const [recebimentoSelecionado, setRecebimentoSelecionado] = useState<Recebimento | null>(null)
  const [menuFormaPagamentoAberto, setMenuFormaPagamentoAberto] = useState<string | null>(null)

  // Estados do formulário de novo recebimento
  const [formEmpresa, setFormEmpresa] = useState('')
  const [formCliente, setFormCliente] = useState('')
  const [formFormaPagamento, setFormFormaPagamento] = useState<FormasPagamento>('PIX')
  const [formNumeroParcela, setFormNumeroParcela] = useState(1)
  const [formQuantidadeParcelas, setFormQuantidadeParcelas] = useState(1)
  const [formDataVencimento, setFormDataVencimento] = useState('')
  const [formValorBruto, setFormValorBruto] = useState('')
  const [formDesconto, setFormDesconto] = useState('')
  const [formJuros, setFormJuros] = useState('')
  const [formMulta, setFormMulta] = useState('')
  const [formSituacao, setFormSituacao] = useState<SituacaoRecebimento>('Pendente')
  const [formObservacoes, setFormObservacoes] = useState('')
  const [formComprovante, setFormComprovante] = useState<File | null>(null)

  // Carregar recebimentos do Firestore
  useEffect(() => {
    carregarRecebimentos()
  }, [])

  // Fechar menu ao clicar fora
  useEffect(() => {
    const handleClickOutside = () => {
      if (menuFormaPagamentoAberto) {
        setMenuFormaPagamentoAberto(null)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [menuFormaPagamentoAberto])

  const carregarRecebimentos = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'empresas', empresaId, 'recebimentos'))
      const recebimentosData: Recebimento[] = []
      querySnapshot.forEach((doc) => {
        const data = doc.data()
        recebimentosData.push({
          id: doc.id,
          ...data,
          dataVencimento: data.dataVencimento?.toDate() || new Date(),
          dataRecebimento: data.dataRecebimento?.toDate() || null,
          criadoEm: data.criadoEm?.toDate() || new Date()
        } as Recebimento)
      })
      
      if (recebimentosData.length === 0) {
        // Se não houver dados, carregar simulados
        setRecebimentos([])
      } else {
        setRecebimentos(recebimentosData)
      }
    } catch (error) {
      console.error('Erro ao carregar recebimentos:', error)
      setRecebimentos([])
    }
  }

  const carregarDadosSimulados = () => {
    const dadosSimulados: Recebimento[] = [
      {
        id: '1',
        empresa: 'Clínica São Lucas',
        cliente: 'João Silva',
        formaPagamento: 'PIX',
        numeroParcela: 1,
        quantidadeParcelas: 1,
        dataVencimento: new Date('2026-07-05'),
        dataRecebimento: new Date('2026-07-05'),
        valorBruto: 350.00,
        desconto: 0,
        juros: 0,
        multa: 0,
        valorLiquido: 350.00,
        situacao: 'Pago',
        observacoes: 'Consulta + exames',
        comprovante: 'comprovante_001.pdf',
        criadoPor: 'Ana Costa',
        criadoEm: new Date('2026-07-01')
      },
      {
        id: '2',
        empresa: 'Clínica São Lucas',
        cliente: 'Maria Santos',
        formaPagamento: 'Cartão Crédito',
        numeroParcela: 2,
        quantidadeParcelas: 3,
        dataVencimento: new Date('2026-07-10'),
        dataRecebimento: null,
        valorBruto: 500.00,
        desconto: 0,
        juros: 0,
        multa: 0,
        valorLiquido: 500.00,
        situacao: 'Pendente',
        observacoes: 'Tratamento ortodôntico - parcela 2/3',
        comprovante: '',
        criadoPor: 'Ana Costa',
        criadoEm: new Date('2026-06-01')
      },
      {
        id: '3',
        empresa: 'Clínica São Lucas',
        cliente: 'Pedro Oliveira',
        formaPagamento: 'Boleto',
        numeroParcela: 1,
        quantidadeParcelas: 1,
        dataVencimento: new Date('2026-06-30'),
        dataRecebimento: null,
        valorBruto: 1200.00,
        desconto: 0,
        juros: 36.00,
        multa: 24.00,
        valorLiquido: 1260.00,
        situacao: 'Pendente',
        observacoes: 'Cirurgia - VENCIDO',
        comprovante: '',
        criadoPor: 'Ana Costa',
        criadoEm: new Date('2026-06-15')
      },
      {
        id: '4',
        empresa: 'Clínica São Lucas',
        cliente: 'Ana Rodrigues',
        formaPagamento: 'Dinheiro',
        numeroParcela: 1,
        quantidadeParcelas: 1,
        dataVencimento: new Date('2026-07-03'),
        dataRecebimento: new Date('2026-07-03'),
        valorBruto: 200.00,
        desconto: 20.00,
        juros: 0,
        multa: 0,
        valorLiquido: 180.00,
        situacao: 'Pago',
        observacoes: 'Desconto de 10% para pagamento à vista',
        comprovante: '',
        criadoPor: 'Ana Costa',
        criadoEm: new Date('2026-07-03')
      },
      {
        id: '5',
        empresa: 'Clínica São Lucas',
        cliente: 'Carlos Mendes',
        formaPagamento: 'Parcelado',
        numeroParcela: 4,
        quantidadeParcelas: 12,
        dataVencimento: new Date('2026-07-15'),
        dataRecebimento: null,
        valorBruto: 300.00,
        desconto: 0,
        juros: 0,
        multa: 0,
        valorLiquido: 300.00,
        situacao: 'Pendente',
        observacoes: 'Tratamento estético - parcela 4/12',
        comprovante: '',
        criadoPor: 'Ana Costa',
        criadoEm: new Date('2026-04-01')
      },
      {
        id: '6',
        empresa: 'Clínica São Lucas',
        cliente: 'Fernanda Lima',
        formaPagamento: 'Convênio',
        numeroParcela: 1,
        quantidadeParcelas: 1,
        dataVencimento: new Date('2026-07-20'),
        dataRecebimento: null,
        valorLiquido: 450.00,
        valorBruto: 450.00,
        desconto: 0,
        juros: 0,
        multa: 0,
        situacao: 'Pendente',
        observacoes: 'Convênio Unimed - aguardando repasse',
        comprovante: '',
        criadoPor: 'Ana Costa',
        criadoEm: new Date('2026-07-01')
      },
      {
        id: '7',
        empresa: 'Clínica São Lucas',
        cliente: 'Roberto Costa',
        formaPagamento: 'TED',
        numeroParcela: 1,
        quantidadeParcelas: 1,
        dataVencimento: new Date('2026-07-08'),
        dataRecebimento: new Date('2026-07-08'),
        valorBruto: 800.00,
        desconto: 0,
        juros: 0,
        multa: 0,
        valorLiquido: 800.00,
        situacao: 'Pago',
        observacoes: 'Procedimento cirúrgico',
        comprovante: 'ted_roberto_001.pdf',
        criadoPor: 'Ana Costa',
        criadoEm: new Date('2026-07-05')
      },
      {
        id: '8',
        empresa: 'Clínica São Lucas',
        cliente: 'Juliana Ferreira',
        formaPagamento: 'Cartão Débito',
        numeroParcela: 1,
        quantidadeParcelas: 1,
        dataVencimento: new Date('2026-07-02'),
        dataRecebimento: new Date('2026-07-02'),
        valorBruto: 150.00,
        desconto: 0,
        juros: 0,
        multa: 0,
        valorLiquido: 150.00,
        situacao: 'Pago',
        observacoes: 'Consulta de retorno',
        comprovante: '',
        criadoPor: 'Ana Costa',
        criadoEm: new Date('2026-07-02')
      }
    ]

    setRecebimentos(dadosSimulados)
  }

  // Filtrar recebimentos
  const recebimentosFiltrados = recebimentos.filter(rec => {
    const matchBusca = rec.cliente.toLowerCase().includes(busca.toLowerCase()) ||
                       rec.empresa.toLowerCase().includes(busca.toLowerCase())
    const matchSituacao = filtroSituacao === 'todos' || rec.situacao === filtroSituacao
    const matchFormaPagamento = filtroFormaPagamento === 'todas' || rec.formaPagamento === filtroFormaPagamento
    
    let matchData = true
    if (filtroDataInicio && filtroDataFim) {
      const dataVenc = new Date(rec.dataVencimento)
      const dataInicio = new Date(filtroDataInicio)
      const dataFim = new Date(filtroDataFim)
      matchData = dataVenc >= dataInicio && dataVenc <= dataFim
    }

    return matchBusca && matchSituacao && matchFormaPagamento && matchData
  })

  // Calcular totalizadores
  const totalRecebido = recebimentos
    .filter(r => r.situacao === 'Pago')
    .reduce((sum, r) => sum + r.valorLiquido, 0)

  const totalPendente = recebimentos
    .filter(r => r.situacao === 'Pendente' || r.situacao === 'Recebido Parcialmente')
    .reduce((sum, r) => sum + r.valorLiquido, 0)

  const totalAtrasado = recebimentos
    .filter(r => {
      if (r.situacao !== 'Pago' && r.situacao !== 'Cancelado') {
        const hoje = new Date()
        const vencimento = new Date(r.dataVencimento)
        return vencimento < hoje
      }
      return false
    })
    .reduce((sum, r) => sum + r.valorLiquido, 0)

  const totalGeral = recebimentos.reduce((sum, r) => sum + r.valorLiquido, 0)

  // Funções
  const abrirModalPagamento = (recebimento: Recebimento) => {
    setRecebimentoSelecionado(recebimento)
    setShowModalPagamento(true)
  }

  const registrarPagamento = async (recebimentoId: string) => {
    try {
      const recebimentoRef = doc(db, 'empresas', empresaId, 'recebimentos', recebimentoId)
      await updateDoc(recebimentoRef, {
        situacao: 'Pago',
        dataRecebimento: new Date()
      })
      await carregarRecebimentos()
      setShowModalPagamento(false)
      setRecebimentoSelecionado(null)
    } catch (error) {
      console.error('Erro ao registrar pagamento:', error)
      // Fallback para estado local
      setRecebimentos(prev => prev.map(rec => 
        rec.id === recebimentoId 
          ? { ...rec, situacao: 'Pago' as SituacaoRecebimento, dataRecebimento: new Date() }
          : rec
      ))
      setShowModalPagamento(false)
      setRecebimentoSelecionado(null)
    }
  }

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

  // Função para salvar novo recebimento
  const salvarNovoRecebimento = async () => {
    // Validações
    if (!formEmpresa || !formCliente || !formDataVencimento || !formValorBruto) {
      alert('❌ Por favor, preencha todos os campos obrigatórios!')
      return
    }

    try {
      const novoRecebimento = {
        empresa: formEmpresa,
        cliente: formCliente,
        formaPagamento: formFormaPagamento,
        numeroParcela: formNumeroParcela,
        quantidadeParcelas: formQuantidadeParcelas,
        dataVencimento: new Date(formDataVencimento),
        dataRecebimento: formSituacao === 'Pago' ? new Date() : null,
        valorBruto: parseValor(formValorBruto),
        desconto: parseValor(formDesconto),
        juros: parseValor(formJuros),
        multa: parseValor(formMulta),
        valorLiquido: calcularValorLiquido(),
        situacao: formSituacao,
        observacoes: formObservacoes,
        comprovante: formComprovante?.name || '',
        criadoPor: user?.nome || 'Sistema',
        criadoEm: serverTimestamp()
      }

      await addDoc(collection(db, 'empresas', empresaId, 'recebimentos'), novoRecebimento)
      await carregarRecebimentos()
      
      // Limpar formulário
      setFormEmpresa('')
      setFormCliente('')
      setFormFormaPagamento('PIX')
      setFormNumeroParcela(1)
      setFormQuantidadeParcelas(1)
      setFormDataVencimento('')
      setFormValorBruto('')
      setFormDesconto('')
      setFormJuros('')
      setFormMulta('')
      setFormSituacao('Pendente')
      setFormObservacoes('')
      setFormComprovante(null)
      setShowModalNovo(false)
      
      alert('✅ Recebimento salvo com sucesso!')
    } catch (error) {
      console.error('Erro ao salvar recebimento:', error)
      alert('❌ Erro ao salvar recebimento. Tente novamente.')
    }
  }

  const cancelarRecebimento = async (recebimentoId: string) => {
    if (confirm('Deseja realmente cancelar este recebimento?')) {
      try {
        const recebimentoRef = doc(db, 'empresas', empresaId, 'recebimentos', recebimentoId)
        await updateDoc(recebimentoRef, {
          situacao: 'Cancelado'
        })
        await carregarRecebimentos()
      } catch (error) {
        console.error('Erro ao cancelar recebimento:', error)
        // Fallback para estado local
        setRecebimentos(prev => prev.map(rec => 
          rec.id === recebimentoId 
            ? { ...rec, situacao: 'Cancelado' as SituacaoRecebimento }
            : rec
        ))
      }
    }
  }

  const excluirRecebimento = async (recebimentoId: string) => {
    if (confirm('Deseja realmente excluir este recebimento? Esta ação não pode ser desfeita.')) {
      try {
        await deleteDoc(doc(db, 'empresas', empresaId, 'recebimentos', recebimentoId))
        await carregarRecebimentos()
      } catch (error) {
        console.error('Erro ao excluir recebimento:', error)
        // Fallback para estado local
        setRecebimentos(prev => prev.filter(rec => rec.id !== recebimentoId))
      }
    }
  }

  const exportarDados = () => {
    // Preparar dados para exportação
    const dadosExport = recebimentosFiltrados.map(rec => ({
      Cliente: rec.cliente,
      Empresa: rec.empresa,
      'Forma Pagamento': rec.formaPagamento,
      Parcela: `${rec.numeroParcela}/${rec.quantidadeParcelas}`,
      Vencimento: formatarData(rec.dataVencimento),
      Recebimento: formatarData(rec.dataRecebimento),
      'Valor Bruto': rec.valorBruto,
      Desconto: rec.desconto,
      Juros: rec.juros,
      Multa: rec.multa,
      'Valor Líquido': rec.valorLiquido,
      Situação: rec.situacao,
      Observações: rec.observacoes,
      Comprovante: rec.comprovante,
      'Criado Por': rec.criadoPor,
      'Criado Em': formatarData(rec.criadoEm)
    }))

    // Criar workbook
    const ws = XLSX.utils.json_to_sheet(dadosExport)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Recebimentos')

    // Salvar arquivo
    const dataAtual = new Date().toISOString().split('T')[0]
    XLSX.writeFile(wb, `Recebimentos_${dataAtual}.xlsx`)
  }

  const enviarRecibo = (recebimento: Recebimento) => {
    alert(`Enviando recibo para ${recebimento.cliente}...`)
  }

  const imprimirRecibo = (recebimento: Recebimento) => {
    alert(`Imprimindo recibo de ${recebimento.cliente}...`)
  }

  // Funções para ações da forma de pagamento
  const editarFormaPagamento = (recebimento: Recebimento) => {
    alert(`Editando forma de pagamento de ${recebimento.cliente}`)
    setMenuFormaPagamentoAberto(null)
  }

  const exportarFormaPagamento = (recebimento: Recebimento) => {
    const dados = [{
      Cliente: recebimento.cliente,
      'Forma Pagamento': recebimento.formaPagamento,
      Valor: recebimento.valorLiquido,
      Vencimento: formatarData(recebimento.dataVencimento),
      Situação: recebimento.situacao
    }]
    const ws = XLSX.utils.json_to_sheet(dados)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Forma Pagamento')
    XLSX.writeFile(wb, `FormaPagamento_${recebimento.cliente}.xlsx`)
    alert('✅ Exportado com sucesso!')
    setMenuFormaPagamentoAberto(null)
  }

  const enviarFormaPagamento = (recebimento: Recebimento) => {
    alert(`Enviando detalhes de pagamento para ${recebimento.cliente}`)
    setMenuFormaPagamentoAberto(null)
  }

  const copiarFormaPagamento = (recebimento: Recebimento) => {
    const texto = `Cliente: ${recebimento.cliente}\nForma: ${recebimento.formaPagamento}\nValor: ${formatarMoeda(recebimento.valorLiquido)}\nVencimento: ${formatarData(recebimento.dataVencimento)}`
    navigator.clipboard.writeText(texto)
    alert('✅ Dados copiados para a área de transferência!')
    setMenuFormaPagamentoAberto(null)
  }

  const excluirFormaPagamento = (recebimento: Recebimento) => {
    if (confirm(`Deseja realmente excluir o recebimento de ${recebimento.cliente}?`)) {
      excluirRecebimento(recebimento.id)
    }
    setMenuFormaPagamentoAberto(null)
  }

  const cancelarFormaPagamento = (recebimento: Recebimento) => {
    if (confirm(`Deseja realmente cancelar o recebimento de ${recebimento.cliente}?`)) {
      cancelarRecebimento(recebimento.id)
    }
    setMenuFormaPagamentoAberto(null)
  }

  // Ícone por situação
  const getIconeSituacao = (situacao: SituacaoRecebimento) => {
    switch (situacao) {
      case 'Pago':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />
      case 'Pendente':
        return <Clock className="w-4 h-4 text-yellow-500" />
      case 'Cancelado':
        return <XCircle className="w-4 h-4 text-red-500" />
      case 'Recebido Parcialmente':
        return <AlertCircle className="w-4 h-4 text-blue-500" />
    }
  }

  // Badge por situação
  const getBadgeSituacao = (situacao: SituacaoRecebimento) => {
    const baseClasses = "px-2 py-1 rounded-full text-xs font-medium"
    switch (situacao) {
      case 'Pago':
        return `${baseClasses} bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400`
      case 'Pendente':
        return `${baseClasses} bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400`
      case 'Cancelado':
        return `${baseClasses} bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400`
      case 'Recebido Parcialmente':
        return `${baseClasses} bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400`
    }
  }

  // Verificar se está atrasado
  const estaAtrasado = (recebimento: Recebimento) => {
    if (recebimento.situacao === 'Pago' || recebimento.situacao === 'Cancelado') {
      return false
    }
    const hoje = new Date()
    const vencimento = new Date(recebimento.dataVencimento)
    return vencimento < hoje
  }

  // Formatar data
  const formatarData = (data: Date | null) => {
    if (!data) return '-'
    return new Date(data).toLocaleDateString('pt-BR')
  }

  // Formatar moeda
  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          💰 Recebimentos
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Controle completo de recebimentos e pagamentos de clientes
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {/* Total Recebido */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Total Recebido</span>
            <CheckCircle2 className="w-5 h-5 text-green-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatarMoeda(totalRecebido)}
          </div>
          <div className="text-xs text-green-600 dark:text-green-400 mt-1">
            {recebimentos.filter(r => r.situacao === 'Pago').length} recebimento(s)
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
            {recebimentos.filter(r => r.situacao === 'Pendente' || r.situacao === 'Recebido Parcialmente').length} pendente(s)
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
            {recebimentos.filter(r => estaAtrasado(r)).length} atrasado(s)
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
            {recebimentos.length} recebimento(s)
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
              Buscar Cliente/Empresa
            </label>
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Digite o nome..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Filtro Situação */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Filter className="w-4 h-4 inline mr-1" />
              Situação
            </label>
            <select
              value={filtroSituacao}
              onChange={(e) => setFiltroSituacao(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="todos">Todas</option>
              <option value="Pago">Pago</option>
              <option value="Pendente">Pendente</option>
              <option value="Cancelado">Cancelado</option>
              <option value="Recebido Parcialmente">Parcialmente</option>
            </select>
          </div>

          {/* Filtro Forma de Pagamento */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <DollarSign className="w-4 h-4 inline mr-1" />
              Forma Pagamento
            </label>
            <select
              value={filtroFormaPagamento}
              onChange={(e) => setFiltroFormaPagamento(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="todas">Todas</option>
              <option value="PIX">PIX</option>
              <option value="Dinheiro">Dinheiro</option>
              <option value="Boleto">Boleto</option>
              <option value="Cartão Débito">Cartão Débito</option>
              <option value="Cartão Crédito">Cartão Crédito</option>
              <option value="Parcelado">Parcelado</option>
              <option value="Convênio">Convênio</option>
              <option value="Transferência Bancária">Transferência</option>
              <option value="TED">TED</option>
              <option value="DOC">DOC</option>
            </select>
          </div>

          {/* Botões de Ação */}
          <div className="flex items-end gap-2">
            <button
              onClick={() => setShowModalNovo(true)}
              className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Novo
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

      {/* Tabela de Recebimentos */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Vencimento
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Forma Pgto
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Parcela
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Valor
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Situação
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Recebimento
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {recebimentosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    Nenhum recebimento encontrado
                  </td>
                </tr>
              ) : (
                recebimentosFiltrados.map((recebimento) => (
                  <tr 
                    key={recebimento.id}
                    className={`hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                      estaAtrasado(recebimento) ? 'bg-red-50 dark:bg-red-900/10' : ''
                    }`}
                  >
                    {/* Cliente */}
                    <td className="px-4 py-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {recebimento.cliente}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {recebimento.empresa}
                      </div>
                      {recebimento.observacoes && (
                        <div className="text-xs text-gray-400 dark:text-gray-500 mt-1 italic">
                          {recebimento.observacoes}
                        </div>
                      )}
                    </td>

                    {/* Vencimento */}
                    <td className="px-4 py-4">
                      <div className={`text-sm ${
                        estaAtrasado(recebimento) 
                          ? 'text-red-600 dark:text-red-400 font-bold' 
                          : 'text-gray-900 dark:text-white'
                      }`}>
                        {formatarData(recebimento.dataVencimento)}
                      </div>
                      {estaAtrasado(recebimento) && (
                        <div className="text-xs text-red-500 dark:text-red-400 font-medium mt-1">
                          VENCIDO
                        </div>
                      )}
                    </td>

                    {/* Forma de Pagamento */}
                    <td className="px-4 py-4 relative">
                      <button
                        onClick={() => setMenuFormaPagamentoAberto(
                          menuFormaPagamentoAberto === recebimento.id ? null : recebimento.id
                        )}
                        className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors cursor-pointer"
                      >
                        {recebimento.formaPagamento}
                      </button>

                      {/* Dropdown Menu */}
                      {menuFormaPagamentoAberto === recebimento.id && (
                        <div className="absolute z-50 left-0 mt-1 w-48 bg-white dark:bg-gray-700 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 py-1">
                          <button
                            onClick={() => editarFormaPagamento(recebimento)}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center gap-2"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            Editar
                          </button>
                          <button
                            onClick={() => exportarFormaPagamento(recebimento)}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center gap-2"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Exportar
                          </button>
                          <button
                            onClick={() => enviarFormaPagamento(recebimento)}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center gap-2"
                          >
                            <Send className="w-3.5 h-3.5" />
                            Enviar
                          </button>
                          <button
                            onClick={() => copiarFormaPagamento(recebimento)}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center gap-2"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            Copiar
                          </button>
                          <div className="border-t border-gray-200 dark:border-gray-600 my-1"></div>
                          <button
                            onClick={() => excluirFormaPagamento(recebimento)}
                            className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Excluir
                          </button>
                          <button
                            onClick={() => cancelarFormaPagamento(recebimento)}
                            className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Cancelar
                          </button>
                        </div>
                      )}
                    </td>

                    {/* Parcela */}
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {recebimento.numeroParcela}/{recebimento.quantidadeParcelas}
                      </div>
                    </td>

                    {/* Valor */}
                    <td className="px-4 py-4">
                      <div className="text-sm font-bold text-gray-900 dark:text-white">
                        {formatarMoeda(recebimento.valorLiquido)}
                      </div>
                      {(recebimento.desconto > 0 || recebimento.juros > 0 || recebimento.multa > 0) && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Bruto: {formatarMoeda(recebimento.valorBruto)}
                          {recebimento.desconto > 0 && ` | Desc: ${formatarMoeda(recebimento.desconto)}`}
                          {recebimento.juros > 0 && ` | Juros: ${formatarMoeda(recebimento.juros)}`}
                          {recebimento.multa > 0 && ` | Multa: ${formatarMoeda(recebimento.multa)}`}
                        </div>
                      )}
                    </td>

                    {/* Situação */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        {getIconeSituacao(recebimento.situacao)}
                        <span className={getBadgeSituacao(recebimento.situacao)}>
                          {recebimento.situacao}
                        </span>
                      </div>
                    </td>

                    {/* Data Recebimento */}
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {formatarData(recebimento.dataRecebimento)}
                      </div>
                    </td>

                    {/* Ações */}
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center gap-2">
                        {recebimento.situacao === 'Pendente' && (
                          <button
                            onClick={() => abrirModalPagamento(recebimento)}
                            className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                            title="Registrar Pagamento"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}
                        
                        {recebimento.situacao === 'Pago' && (
                          <>
                            <button
                              onClick={() => imprimirRecibo(recebimento)}
                              className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                              title="Imprimir Recibo"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => enviarRecibo(recebimento)}
                              className="p-2 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                              title="Enviar Recibo"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                          </>
                        )}

                        <button
                          onClick={() => alert('Editar recebimento')}
                          className="p-2 text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        {recebimento.situacao !== 'Cancelado' && recebimento.situacao !== 'Pago' && (
                          <button
                            onClick={() => cancelarRecebimento(recebimento.id)}
                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Cancelar"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          onClick={() => excluirRecebimento(recebimento.id)}
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
            Mostrando <span className="font-medium text-gray-900 dark:text-white">{recebimentosFiltrados.length}</span> de{' '}
            <span className="font-medium text-gray-900 dark:text-white">{recebimentos.length}</span> recebimento(s)
          </div>
        </div>
      </div>

      {/* Modal de Pagamento */}
      {showModalPagamento && recebimentoSelecionado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Registrar Pagamento
            </h3>

            <div className="space-y-3 mb-6">
              <div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Cliente:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">
                  {recebimentoSelecionado.cliente}
                </span>
              </div>
              <div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Vencimento:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">
                  {formatarData(recebimentoSelecionado.dataVencimento)}
                </span>
              </div>
              <div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Valor:</span>
                <span className="ml-2 font-bold text-green-600 dark:text-green-400 text-lg">
                  {formatarMoeda(recebimentoSelecionado.valorLiquido)}
                </span>
              </div>
              <div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Forma de Pagamento:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">
                  {recebimentoSelecionado.formaPagamento}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => registrarPagamento(recebimentoSelecionado.id)}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
              >
                Confirmar Recebimento
              </button>
              <button
                onClick={() => {
                  setShowModalPagamento(false)
                  setRecebimentoSelecionado(null)
                }}
                className="px-4 py-2 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-900 dark:text-white rounded-lg font-medium transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Novo Recebimento */}
      {showModalNovo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full my-8">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-purple-600 to-purple-500">
              <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                <DollarSign className="w-6 h-6" />
                Novo Recebimento
              </h3>
              <button
                onClick={() => setShowModalNovo(false)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-white" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Cliente */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <User className="w-4 h-4 inline mr-1" />
                    Cliente *
                  </label>
                  <input
                    type="text"
                    value={formCliente}
                    onChange={(e) => setFormCliente(e.target.value)}
                    placeholder="Nome do cliente"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>

                {/* Empresa */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Building2 className="w-4 h-4 inline mr-1" />
                    Empresa *
                  </label>
                  <input
                    type="text"
                    value={formEmpresa}
                    onChange={(e) => setFormEmpresa(e.target.value)}
                    placeholder="Nome da empresa"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>

                {/* Categoria */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    📁 Categoria
                  </label>
                  <select
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option>Vendas</option>
                    <option>Serviços</option>
                    <option>Consultoria</option>
                    <option>Mensalidades</option>
                    <option>Assinaturas</option>
                    <option>Outros</option>
                  </select>
                </div>

                {/* Forma de Pagamento */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <CreditCard className="w-4 h-4 inline mr-1" />
                    Forma de Pagamento *
                  </label>
                  <select
                    value={formFormaPagamento}
                    onChange={(e) => setFormFormaPagamento(e.target.value as FormasPagamento)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="PIX">PIX</option>
                    <option value="Dinheiro">Dinheiro</option>
                    <option value="Boleto">Boleto</option>
                    <option value="Cartão Débito">Cartão Débito</option>
                    <option value="Cartão Crédito">Cartão Crédito</option>
                    <option value="Parcelado">Parcelado</option>
                    <option value="Convênio">Convênio</option>
                    <option value="Transferência Bancária">Transferência Bancária</option>
                    <option value="TED">TED</option>
                    <option value="DOC">DOC</option>
                  </select>
                </div>

                {/* Número da Parcela */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    📊 Número da Parcela
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formNumeroParcela}
                    onChange={(e) => setFormNumeroParcela(parseInt(e.target.value) || 1)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                {/* Quantidade de Parcelas */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    📊 Quantidade de Parcelas
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formQuantidadeParcelas}
                    onChange={(e) => setFormQuantidadeParcelas(parseInt(e.target.value) || 1)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                {/* Data de Vencimento */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Data de Vencimento *
                  </label>
                  <input
                    type="date"
                    value={formDataVencimento}
                    onChange={(e) => setFormDataVencimento(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>

                {/* Valor Bruto */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Money className="w-4 h-4 inline mr-1" />
                    Valor Bruto *
                  </label>
                  <input
                    type="text"
                    value={formValorBruto}
                    onChange={(e) => setFormValorBruto(e.target.value)}
                    placeholder="0,00"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Ex: 1.250,50</p>
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
                    placeholder="0,00"
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
                    placeholder="0,00"
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
                    placeholder="0,00"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                {/* Valor Líquido (Calculado) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    💵 Valor Líquido
                  </label>
                  <div className="w-full px-4 py-2 border-2 border-green-500 dark:border-green-400 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 font-bold text-lg">
                    {formatarMoeda(calcularValorLiquido())}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Calculado automaticamente</p>
                </div>

                {/* Conta Bancária */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    🏦 Conta Bancária
                  </label>
                  <select
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option>Caixa Principal</option>
                    <option>Banco do Brasil - CC 12345-6</option>
                    <option>Itaú - CC 98765-4</option>
                    <option>Santander - CC 45678-9</option>
                    <option>Nubank - CC 11111-1</option>
                  </select>
                </div>

                {/* Situação */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    📊 Situação
                  </label>
                  <select
                    value={formSituacao}
                    onChange={(e) => setFormSituacao(e.target.value as SituacaoRecebimento)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="Pendente">Pendente</option>
                    <option value="Pago">Pago</option>
                    <option value="Cancelado">Cancelado</option>
                    <option value="Recebido Parcialmente">Recebido Parcialmente</option>
                  </select>
                </div>

                {/* Observações */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    📝 Observações
                  </label>
                  <textarea
                    value={formObservacoes}
                    onChange={(e) => setFormObservacoes(e.target.value)}
                    placeholder="Informações adicionais sobre o recebimento..."
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white resize-none"
                  />
                </div>

                {/* Anexo/Comprovante */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    📎 Anexar Comprovante
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setFormComprovante(e.target.files?.[0] || null)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                  />
                  <p className="text-xs text-gray-500 mt-1">Formatos aceitos: PDF, JPG, PNG (máx 5MB)</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                * Campos obrigatórios
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowModalNovo(false)}
                  className="px-6 py-2 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-900 dark:text-white rounded-lg font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={salvarNovoRecebimento}
                  className="px-6 py-2 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white rounded-lg font-medium transition-all flex items-center gap-2 shadow-lg"
                >
                  <Save className="w-4 h-4" />
                  Salvar Recebimento
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

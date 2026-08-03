import { useState } from 'react'
import { 
  FileText, 
  Search, 
  Filter, 
  Plus, 
  Download,
  Printer,
  TrendingUp,
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Send
} from 'lucide-react'

type TipoNota = 'NFe' | 'NFSe' | 'NFCe'
type StatusNota = 'Emitida' | 'Cancelada' | 'Pendente' | 'Processando'

interface NotaFiscal {
  id: string
  numero: string
  serie: string
  tipo: TipoNota
  cliente: string
  cpfCnpj: string
  valorProdutos: number
  valorServicos: number
  impostos: number
  valorTotal: number
  dataEmissao: string
  status: StatusNota
  chaveAcesso?: string
  observacoes?: string
}

export default function FaturamentoERP() {
  const [searchTerm, setSearchTerm] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<TipoNota | 'Todos'>('Todos')
  const [filtroStatus, setFiltroStatus] = useState<StatusNota | 'Todos'>('Todos')
  const [mostrarFiltros, setMostrarFiltros] = useState(false)
  const [mostrarModal, setMostrarModal] = useState(false)
  const [notaSelecionada, setNotaSelecionada] = useState<NotaFiscal | null>(null)
  const [mostrarModalEmissao, setMostrarModalEmissao] = useState(false)
  const [novaNotaForm, setNovaNotaForm] = useState({
    tipo: 'NFe' as TipoNota,
    cliente: '',
    cpfCnpj: '',
    valorProdutos: '',
    valorServicos: '',
    impostos: '',
    observacoes: '',
    naturezaOperacao: '',
    cfop: ''
  })

  // Dados simulados
  const notas: NotaFiscal[] = [
    {
      id: '1',
      numero: '000001',
      serie: '1',
      tipo: 'NFe',
      cliente: 'Clínica Dente Perfeito',
      cpfCnpj: '12.345.678/0001-90',
      valorProdutos: 5000.00,
      valorServicos: 0,
      impostos: 850.00,
      valorTotal: 5850.00,
      dataEmissao: '2024-01-20',
      status: 'Emitida',
      chaveAcesso: '35240112345678000190550010000000011234567890'
    },
    {
      id: '2',
      numero: '000002',
      serie: '1',
      tipo: 'NFSe',
      cliente: 'João da Silva',
      cpfCnpj: '123.456.789-00',
      valorProdutos: 0,
      valorServicos: 1500.00,
      impostos: 75.00,
      valorTotal: 1575.00,
      dataEmissao: '2024-01-22',
      status: 'Emitida',
      chaveAcesso: 'NFSe-202401-000002'
    },
    {
      id: '3',
      numero: '000003',
      serie: '1',
      tipo: 'NFCe',
      cliente: 'Maria Santos',
      cpfCnpj: '987.654.321-00',
      valorProdutos: 350.00,
      valorServicos: 0,
      impostos: 35.00,
      valorTotal: 385.00,
      dataEmissao: '2024-01-23',
      status: 'Emitida',
      chaveAcesso: '35240112345678000190650010000000031234567890'
    },
    {
      id: '4',
      numero: '000004',
      serie: '1',
      tipo: 'NFe',
      cliente: 'Pet Shop Amigo Fiel',
      cpfCnpj: '23.456.789/0001-80',
      valorProdutos: 8500.00,
      valorServicos: 0,
      impostos: 1445.00,
      valorTotal: 9945.00,
      dataEmissao: '2024-01-25',
      status: 'Emitida',
      chaveAcesso: '35240112345678000190550010000000041234567890'
    },
    {
      id: '5',
      numero: '000005',
      serie: '1',
      tipo: 'NFSe',
      cliente: 'Carlos Alberto',
      cpfCnpj: '456.789.123-00',
      valorProdutos: 0,
      valorServicos: 2800.00,
      impostos: 140.00,
      valorTotal: 2940.00,
      dataEmissao: '2024-01-26',
      status: 'Processando',
      observacoes: 'Aguardando aprovação da prefeitura'
    },
    {
      id: '6',
      numero: '000006',
      serie: '1',
      tipo: 'NFe',
      cliente: 'Empresa XYZ Ltda',
      cpfCnpj: '34.567.890/0001-70',
      valorProdutos: 12000.00,
      valorServicos: 0,
      impostos: 2040.00,
      valorTotal: 14040.00,
      dataEmissao: '2024-01-15',
      status: 'Cancelada',
      observacoes: 'Cancelada a pedido do cliente'
    },
    {
      id: '7',
      numero: '000007',
      serie: '1',
      tipo: 'NFCe',
      cliente: 'Ana Paula Costa',
      cpfCnpj: '789.123.456-00',
      valorProdutos: 180.00,
      valorServicos: 0,
      impostos: 18.00,
      valorTotal: 198.00,
      dataEmissao: '2024-01-28',
      status: 'Emitida',
      chaveAcesso: '35240112345678000190650010000000071234567890'
    },
    {
      id: '8',
      numero: '000008',
      serie: '1',
      tipo: 'NFSe',
      cliente: 'Consultório Médico Vida',
      cpfCnpj: '45.678.901/0001-60',
      valorProdutos: 0,
      valorServicos: 4500.00,
      impostos: 225.00,
      valorTotal: 4725.00,
      dataEmissao: '2024-01-29',
      status: 'Pendente',
      observacoes: 'Aguardando dados do cliente'
    }
  ]

  const notasFiltradas = notas.filter((nota) => {
    const matchSearch = nota.numero.includes(searchTerm) || nota.cliente.toLowerCase().includes(searchTerm.toLowerCase())
    const matchTipo = filtroTipo === 'Todos' || nota.tipo === filtroTipo
    const matchStatus = filtroStatus === 'Todos' || nota.status === filtroStatus
    return matchSearch && matchTipo && matchStatus
  })

  const totalNotas = notas.filter(n => n.status === 'Emitida').length
  const faturamentoTotal = notas.filter(n => n.status === 'Emitida').reduce((sum, n) => sum + n.valorTotal, 0)
  const ticketMedio = totalNotas > 0 ? faturamentoTotal / totalNotas : 0
  const notasPendentes = notas.filter(n => n.status === 'Pendente' || n.status === 'Processando').length

  const getStatusColor = (status: StatusNota) => {
    switch (status) {
      case 'Emitida': return 'bg-green-500/10 text-green-400 border-green-500/20'
      case 'Cancelada': return 'bg-red-500/10 text-red-400 border-red-500/20'
      case 'Pendente': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
      case 'Processando': return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20'
    }
  }

  const getStatusIcon = (status: StatusNota) => {
    switch (status) {
      case 'Emitida': return <CheckCircle className="w-4 h-4" />
      case 'Cancelada': return <XCircle className="w-4 h-4" />
      case 'Pendente': return <Clock className="w-4 h-4" />
      case 'Processando': return <Clock className="w-4 h-4" />
      default: return <CheckCircle className="w-4 h-4" />
    }
  }

  const getTipoCor = (tipo: TipoNota) => {
    switch (tipo) {
      case 'NFe': return 'bg-purple-500/10 text-purple-400'
      case 'NFSe': return 'bg-blue-500/10 text-blue-400'
      case 'NFCe': return 'bg-green-500/10 text-green-400'
      default: return 'bg-gray-500/10 text-gray-400'
    }
  }

  // Funções de ação para os botões
  const baixarXML = (nota: NotaFiscal) => {
    if (!nota.chaveAcesso) {
      alert('⚠️ Esta nota não possui chave de acesso para download do XML')
      return
    }
    
    // Simular download de XML
    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<NFe xmlns="http://www.portalfiscal.inf.br/nfe">
  <infNFe versao="4.00">
    <ide>
      <cUF>35</cUF>
      <nNF>${nota.numero}</nNF>
      <serie>${nota.serie}</serie>
      <chNFe>${nota.chaveAcesso}</chNFe>
    </ide>
    <emit>
      <CNPJ>12345678000190</CNPJ>
      <xNome>Sua Empresa</xNome>
    </emit>
    <dest>
      <xNome>${nota.cliente}</xNome>
      <CPF_CNPJ>${nota.cpfCnpj}</CPF_CNPJ>
    </dest>
    <total>
      <ICMSTot>
        <vNF>${nota.valorTotal.toFixed(2)}</vNF>
      </ICMSTot>
    </total>
  </infNFe>
</NFe>`
    
    const blob = new Blob([xmlContent], { type: 'application/xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `NFe_${nota.numero}_${nota.serie}.xml`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    alert('✅ XML baixado com sucesso!')
  }

  const imprimirDANFE = (nota: NotaFiscal) => {
    if (nota.status !== 'Emitida') {
      alert('⚠️ Somente notas emitidas podem ser impressas')
      return
    }
    
    // Abrir janela de impressão com DANFE
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      alert('⚠️ Habilite pop-ups para imprimir o DANFE')
      return
    }
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>DANFE - ${nota.numero}/${nota.serie}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; border: 2px solid #000; padding: 10px; margin-bottom: 20px; }
          .header h1 { margin: 0; font-size: 24px; }
          .section { border: 1px solid #000; padding: 10px; margin-bottom: 10px; }
          .section-title { font-weight: bold; background: #f0f0f0; padding: 5px; margin: -10px -10px 10px -10px; }
          .row { display: flex; justify-content: space-between; margin-bottom: 5px; }
          .label { font-weight: bold; }
          .total { font-size: 20px; text-align: right; margin-top: 20px; padding: 10px; background: #f0f0f0; }
          @media print {
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>DANFE</h1>
          <p>Documento Auxiliar da Nota Fiscal Eletrônica</p>
          <p><strong>Nº ${nota.numero} - Série ${nota.serie}</strong></p>
          ${nota.chaveAcesso ? `<p style="font-size: 10px;">Chave de Acesso: ${nota.chaveAcesso}</p>` : ''}
        </div>
        
        <div class="section">
          <div class="section-title">EMITENTE</div>
          <div class="row"><span class="label">Razão Social:</span> <span>Sua Empresa LTDA</span></div>
          <div class="row"><span class="label">CNPJ:</span> <span>12.345.678/0001-90</span></div>
        </div>
        
        <div class="section">
          <div class="section-title">DESTINATÁRIO</div>
          <div class="row"><span class="label">Nome/Razão Social:</span> <span>${nota.cliente}</span></div>
          <div class="row"><span class="label">CPF/CNPJ:</span> <span>${nota.cpfCnpj}</span></div>
        </div>
        
        <div class="section">
          <div class="section-title">DADOS DA NOTA FISCAL</div>
          <div class="row"><span class="label">Data de Emissão:</span> <span>${new Date(nota.dataEmissao).toLocaleDateString('pt-BR')}</span></div>
          <div class="row"><span class="label">Tipo:</span> <span>${nota.tipo}</span></div>
        </div>
        
        <div class="section">
          <div class="section-title">VALORES</div>
          ${nota.valorProdutos > 0 ? `<div class="row"><span class="label">Valor Produtos:</span> <span>R$ ${nota.valorProdutos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>` : ''}
          ${nota.valorServicos > 0 ? `<div class="row"><span class="label">Valor Serviços:</span> <span>R$ ${nota.valorServicos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>` : ''}
          <div class="row"><span class="label">Impostos:</span> <span>R$ ${nota.impostos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
        </div>
        
        <div class="total">
          <strong>VALOR TOTAL: R$ ${nota.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
        </div>
        
        ${nota.observacoes ? `
          <div class="section">
            <div class="section-title">OBSERVAÇÕES</div>
            <p>${nota.observacoes}</p>
          </div>
        ` : ''}
        
        <div style="text-align: center; margin-top: 30px;">
          <button onclick="window.print()" style="padding: 10px 30px; font-size: 16px; cursor: pointer;">
            Imprimir
          </button>
        </div>
      </body>
      </html>
    `)
    printWindow.document.close()
  }

  const enviarPorEmail = (nota: NotaFiscal) => {
    if (nota.status !== 'Emitida') {
      alert('⚠️ Somente notas emitidas podem ser enviadas por e-mail')
      return
    }
    
    const email = prompt(`📧 Digite o e-mail do destinatário para enviar a nota ${nota.numero}/${nota.serie}:`)
    if (!email) return
    
    // Validar email básico
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      alert('⚠️ E-mail inválido!')
      return
    }
    
    // Simular envio de email
    alert(`✅ Nota Fiscal ${nota.numero}/${nota.serie} enviada com sucesso para ${email}!\n\n` +
          `Conteúdo enviado:\n` +
          `- DANFE em PDF\n` +
          `- XML da nota\n` +
          `- Chave de acesso: ${nota.chaveAcesso || 'N/A'}`)
  }

  const exportarPDF = (nota: NotaFiscal) => {
    // Esta função é basicamente igual ao imprimir, mas ao invés de abrir janela de impressão,
    // idealmente geraria um PDF. Para simplificar, vamos usar a mesma lógica.
    alert(`📄 Gerando PDF da nota ${nota.numero}/${nota.serie}...`)
    imprimirDANFE(nota)
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <FileText className="w-8 h-8 text-purple-400" />
            Faturamento
          </h1>
          <p className="text-slate-400 mt-1">Gestão de notas fiscais NFe, NFSe e NFCe</p>
        </div>
        <button 
          onClick={() => setMostrarModalEmissao(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Emitir Nota Fiscal
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Notas Emitidas</p>
              <p className="text-2xl font-bold text-white mt-1">{totalNotas}</p>
            </div>
            <div className="bg-purple-500/10 p-3 rounded-lg">
              <FileText className="w-6 h-6 text-purple-400" />
            </div>
          </div>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Faturamento Total</p>
              <p className="text-2xl font-bold text-white mt-1">R$ {faturamentoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
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
              <p className="text-2xl font-bold text-white mt-1">R$ {ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="bg-blue-500/10 p-3 rounded-lg">
              <TrendingUp className="w-6 h-6 text-blue-400" />
            </div>
          </div>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Pendentes</p>
              <p className="text-2xl font-bold text-white mt-1">{notasPendentes}</p>
            </div>
            <div className="bg-yellow-500/10 p-3 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-400" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input type="text" placeholder="Buscar por número ou cliente..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:border-purple-500" />
          </div>
          <button onClick={() => setMostrarFiltros(!mostrarFiltros)}
            className="bg-slate-900 border border-slate-700 hover:border-purple-500 text-white px-4 py-2.5 rounded-lg flex items-center gap-2">
            <Filter className="w-5 h-5" /> Filtros
          </button>
        </div>
        {mostrarFiltros && (
          <div className="mt-4 pt-4 border-t border-slate-700">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Tipo</label>
                <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value as TipoNota | 'Todos')}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500">
                  <option value="Todos">Todos</option>
                  <option value="NFe">NFe</option>
                  <option value="NFSe">NFSe</option>
                  <option value="NFCe">NFCe</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Status</label>
                <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value as StatusNota | 'Todos')}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500">
                  <option value="Todos">Todos</option>
                  <option value="Emitida">Emitida</option>
                  <option value="Cancelada">Cancelada</option>
                  <option value="Pendente">Pendente</option>
                  <option value="Processando">Processando</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-900 border-b border-slate-700">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Número</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Tipo</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Cliente</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">CPF/CNPJ</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Valor Total</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Data</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Status</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {notasFiltradas.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-12 text-center text-slate-400">Nenhuma nota fiscal encontrada</td></tr>
              ) : (
                notasFiltradas.map((nota) => (
                  <tr key={nota.id} className="hover:bg-slate-700/50 transition-colors">
                    <td className="px-6 py-4 text-white font-medium">{nota.numero}/{nota.serie}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium ${getTipoCor(nota.tipo)}`}>{nota.tipo}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-300">{nota.cliente}</td>
                    <td className="px-6 py-4 text-slate-300">{nota.cpfCnpj}</td>
                    <td className="px-6 py-4 text-white font-semibold">R$ {nota.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td className="px-6 py-4 text-slate-300">{new Date(nota.dataEmissao).toLocaleDateString('pt-BR')}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(nota.status)}`}>
                        {getStatusIcon(nota.status)} {nota.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => { setNotaSelecionada(nota); setMostrarModal(true); }} className="text-purple-400 hover:text-purple-300" title="Ver detalhes">
                          <Eye className="w-5 h-5" />
                        </button>
                        {nota.status === 'Emitida' && (
                          <>
                            <button onClick={() => baixarXML(nota)} className="text-blue-400 hover:text-blue-300" title="Baixar XML">
                              <Download className="w-5 h-5" />
                            </button>
                            <button onClick={() => imprimirDANFE(nota)} className="text-green-400 hover:text-green-300" title="Imprimir DANFE">
                              <Printer className="w-5 h-5" />
                            </button>
                            <button onClick={() => enviarPorEmail(nota)} className="text-yellow-400 hover:text-yellow-300" title="Enviar por Email">
                              <Send className="w-5 h-5" />
                            </button>
                          </>
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

      {/* MODAL DE EMISSÃO DE NOTA FISCAL */}
      {mostrarModalEmissao && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-700 sticky top-0 bg-slate-800 z-10">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <FileText className="w-7 h-7 text-purple-400" />
                  Emitir Nota Fiscal
                </h2>
                <button onClick={() => setMostrarModalEmissao(false)} className="text-slate-400 hover:text-white text-2xl">
                  ✕
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Tipo de Nota */}
              <div>
                <h3 className="text-lg font-bold text-white mb-4">Tipo de Nota Fiscal</h3>
                <div className="grid grid-cols-3 gap-4">
                  {(['NFe', 'NFSe', 'NFCe'] as TipoNota[]).map(tipo => (
                    <button
                      key={tipo}
                      onClick={() => setNovaNotaForm({...novaNotaForm, tipo})}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        novaNotaForm.tipo === tipo
                          ? 'border-purple-500 bg-purple-500/10'
                          : 'border-slate-700 bg-slate-900 hover:border-slate-600'
                      }`}
                    >
                      <FileText className={`w-8 h-8 mx-auto mb-2 ${novaNotaForm.tipo === tipo ? 'text-purple-400' : 'text-slate-400'}`} />
                      <p className={`font-semibold text-center ${novaNotaForm.tipo === tipo ? 'text-purple-400' : 'text-slate-300'}`}>
                        {tipo}
                      </p>
                      <p className="text-xs text-slate-400 text-center mt-1">
                        {tipo === 'NFe' && 'Nota Fiscal Eletrônica'}
                        {tipo === 'NFSe' && 'Nota Fiscal de Serviço'}
                        {tipo === 'NFCe' && 'Nota Fiscal ao Consumidor'}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Dados do Cliente */}
              <div>
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Send className="w-5 h-5 text-purple-400" />
                  Dados do Cliente
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-300 mb-2">Nome/Razão Social *</label>
                    <input
                      type="text"
                      value={novaNotaForm.cliente}
                      onChange={(e) => setNovaNotaForm({...novaNotaForm, cliente: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
                      placeholder="Nome completo ou Razão Social"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">CPF/CNPJ *</label>
                    <input
                      type="text"
                      value={novaNotaForm.cpfCnpj}
                      onChange={(e) => setNovaNotaForm({...novaNotaForm, cpfCnpj: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
                      placeholder="000.000.000-00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Natureza da Operação *</label>
                    <select
                      value={novaNotaForm.naturezaOperacao}
                      onChange={(e) => setNovaNotaForm({...novaNotaForm, naturezaOperacao: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-purple-500"
                    >
                      <option value="">Selecione</option>
                      <option value="venda">Venda de Mercadoria</option>
                      <option value="servico">Prestação de Serviço</option>
                      <option value="devolucao">Devolução</option>
                      <option value="remessa">Remessa para Conserto</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">CFOP *</label>
                    <select
                      value={novaNotaForm.cfop}
                      onChange={(e) => setNovaNotaForm({...novaNotaForm, cfop: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-purple-500"
                    >
                      <option value="">Selecione</option>
                      <option value="5102">5102 - Venda de mercadoria (dentro do estado)</option>
                      <option value="6102">6102 - Venda de mercadoria (fora do estado)</option>
                      <option value="5933">5933 - Prestação de serviço (dentro do estado)</option>
                      <option value="6933">6933 - Prestação de serviço (fora do estado)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Valores */}
              <div>
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-purple-400" />
                  Valores
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Valor Produtos</label>
                    <input
                      type="number"
                      step="0.01"
                      value={novaNotaForm.valorProdutos}
                      onChange={(e) => setNovaNotaForm({...novaNotaForm, valorProdutos: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
                      placeholder="0,00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Valor Serviços</label>
                    <input
                      type="number"
                      step="0.01"
                      value={novaNotaForm.valorServicos}
                      onChange={(e) => setNovaNotaForm({...novaNotaForm, valorServicos: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
                      placeholder="0,00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Impostos</label>
                    <input
                      type="number"
                      step="0.01"
                      value={novaNotaForm.impostos}
                      onChange={(e) => setNovaNotaForm({...novaNotaForm, impostos: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
                      placeholder="0,00"
                    />
                  </div>
                </div>

                <div className="mt-4 p-4 bg-slate-900 rounded-lg border border-slate-700">
                  <div className="flex items-center justify-between">
                    <p className="text-slate-300 font-medium">Valor Total</p>
                    <p className="text-2xl font-bold text-purple-400">
                      R$ {(
                        (parseFloat(novaNotaForm.valorProdutos) || 0) +
                        (parseFloat(novaNotaForm.valorServicos) || 0) +
                        (parseFloat(novaNotaForm.impostos) || 0)
                      ).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Observações */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Observações</label>
                <textarea
                  value={novaNotaForm.observacoes}
                  onChange={(e) => setNovaNotaForm({...novaNotaForm, observacoes: e.target.value})}
                  rows={4}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 resize-none"
                  placeholder="Informações adicionais sobre a nota fiscal..."
                />
              </div>
            </div>

            {/* Footer do Modal */}
            <div className="p-6 border-t border-slate-700 sticky bottom-0 bg-slate-800 flex gap-3">
              <button
                onClick={() => setMostrarModalEmissao(false)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  console.log('Emitindo nota:', novaNotaForm)
                  setMostrarModalEmissao(false)
                  // Aqui você adicionaria a lógica para emitir a nota
                }}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-5 h-5" />
                Emitir Nota Fiscal
              </button>
            </div>
          </div>
        </div>
      )}

      {mostrarModal && notaSelecionada && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-700">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">Detalhes da Nota Fiscal</h2>
                <button onClick={() => setMostrarModal(false)} className="text-slate-400 hover:text-white">✕</button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-slate-400 text-sm">Número/Série</p><p className="text-white font-medium mt-1">{notaSelecionada.numero}/{notaSelecionada.serie}</p></div>
                <div><p className="text-slate-400 text-sm">Tipo</p><span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium mt-1 ${getTipoCor(notaSelecionada.tipo)}`}>{notaSelecionada.tipo}</span></div>
                <div className="col-span-2"><p className="text-slate-400 text-sm">Cliente</p><p className="text-white font-medium mt-1">{notaSelecionada.cliente}</p></div>
                <div><p className="text-slate-400 text-sm">CPF/CNPJ</p><p className="text-white font-medium mt-1">{notaSelecionada.cpfCnpj}</p></div>
                <div><p className="text-slate-400 text-sm">Data de Emissão</p><p className="text-white font-medium mt-1">{new Date(notaSelecionada.dataEmissao).toLocaleDateString('pt-BR')}</p></div>
                <div><p className="text-slate-400 text-sm">Valor Produtos</p><p className="text-white font-medium mt-1">R$ {notaSelecionada.valorProdutos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p></div>
                <div><p className="text-slate-400 text-sm">Valor Serviços</p><p className="text-white font-medium mt-1">R$ {notaSelecionada.valorServicos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p></div>
                <div><p className="text-slate-400 text-sm">Impostos</p><p className="text-red-400 font-medium mt-1">R$ {notaSelecionada.impostos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p></div>
                <div><p className="text-slate-400 text-sm">Status</p>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border mt-1 ${getStatusColor(notaSelecionada.status)}`}>
                    {getStatusIcon(notaSelecionada.status)} {notaSelecionada.status}
                  </span>
                </div>
                {notaSelecionada.chaveAcesso && (
                  <div className="col-span-2"><p className="text-slate-400 text-sm">Chave de Acesso</p><p className="text-white font-mono text-sm mt-1">{notaSelecionada.chaveAcesso}</p></div>
                )}
                {notaSelecionada.observacoes && (
                  <div className="col-span-2"><p className="text-slate-400 text-sm">Observações</p><p className="text-white font-medium mt-1">{notaSelecionada.observacoes}</p></div>
                )}
              </div>
              <div className="border-t border-slate-700 pt-4">
                <div className="flex items-center justify-between">
                  <p className="text-slate-300 text-lg">Valor Total</p>
                  <p className="text-2xl font-bold text-white">R$ {notaSelecionada.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
              {notaSelecionada.status === 'Emitida' && (
                <div className="flex gap-3">
                  <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg flex items-center justify-center gap-2"><Download className="w-5 h-5" /> Baixar XML</button>
                  <button className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg flex items-center justify-center gap-2"><Printer className="w-5 h-5" /> Imprimir DANFE</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

import { useState } from 'react'
import { 
  FileText, 
  Search, 
  Filter, 
  Plus, 
  Upload,
  Download,
  Eye,
  Trash2,
  File,
  Calendar,
  User,
  Tag,
  FolderOpen,
  AlertCircle,
  CheckCircle,
  Clock,
  Save
} from 'lucide-react'
import { collection, addDoc, deleteDoc, doc } from 'firebase/firestore'
import { db } from '../../firebase'

type TipoDocumento = 'RG' | 'CPF' | 'CNH' | 'Carteira de Trabalho' | 'Contrato' | 'Holerite' | 
  'Certificado' | 'Comprovante de Residência' | 'Exame Admissional' | 'Outros'

type StatusDocumento = 'Ativo' | 'Vencido' | 'Pendente' | 'Arquivado'

interface Documento {
  id: string
  codigo: string
  nome: string
  tipo: TipoDocumento
  categoria: string
  descricao: string
  funcionario: string
  departamento: string
  dataUpload: string
  dataValidade?: string
  status: StatusDocumento
  tamanho: string
  formato: string
  arquivo: string
  observacoes?: string
}

export default function DocumentosERP() {
  const [searchTerm, setSearchTerm] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<TipoDocumento | 'Todos'>('Todos')
  const [filtroStatus, setFiltroStatus] = useState<StatusDocumento | 'Todos'>('Todos')
  const [filtroDepartamento, setFiltroDepartamento] = useState<string>('Todos')
  const [mostrarFiltros, setMostrarFiltros] = useState(false)
  const [mostrarModal, setMostrarModal] = useState(false)
  const [documentoSelecionado, setDocumentoSelecionado] = useState<Documento | null>(null)
  const [mostrarModalNovo, setMostrarModalNovo] = useState(false)
  const [novoDocumentoForm, setNovoDocumentoForm] = useState({
    nome: '',
    tipo: 'Outros' as TipoDocumento,
    categoria: '',
    descricao: '',
    funcionario: '',
    departamento: '',
    dataValidade: '',
    arquivo: null as File | null,
    observacoes: ''
  })

  // Dados simulados
  const documentos: Documento[] = [
    {
      id: '1',
      codigo: 'DOC-2024-001',
      nome: 'RG Dr. Carlos Silva',
      tipo: 'RG',
      categoria: 'Documentação Pessoal',
      descricao: 'RG do Dr. Carlos Silva',
      funcionario: 'Dr. Carlos Silva',
      departamento: 'Odontologia',
      dataUpload: '2024-01-15',
      status: 'Ativo',
      tamanho: '1.2 MB',
      formato: 'PDF',
      arquivo: 'rg_carlos_silva.pdf'
    },
    {
      id: '2',
      codigo: 'DOC-2024-002',
      nome: 'Contrato Dr. Carlos Silva',
      tipo: 'Contrato',
      categoria: 'Documentação Trabalhista',
      descricao: 'Contrato de trabalho CLT',
      funcionario: 'Dr. Carlos Silva',
      departamento: 'Odontologia',
      dataUpload: '2022-03-15',
      dataValidade: '2027-03-15',
      status: 'Ativo',
      tamanho: '2.5 MB',
      formato: 'PDF',
      arquivo: 'contrato_carlos.pdf'
    },
    {
      id: '3',
      codigo: 'DOC-2024-003',
      nome: 'CNH Maria Santos',
      tipo: 'CNH',
      categoria: 'Documentação Pessoal',
      descricao: 'Carteira Nacional de Habilitação',
      funcionario: 'Maria Santos',
      departamento: 'Administrativo',
      dataUpload: '2023-01-10',
      dataValidade: '2028-06-20',
      status: 'Ativo',
      tamanho: '850 KB',
      formato: 'JPG',
      arquivo: 'cnh_maria.jpg'
    },
    {
      id: '4',
      codigo: 'DOC-2024-004',
      nome: 'Holerite Janeiro 2024',
      tipo: 'Holerite',
      categoria: 'Folha de Pagamento',
      descricao: 'Holerite referente a Janeiro/2024',
      funcionario: 'Fernanda Lima',
      departamento: 'Administrativo',
      dataUpload: '2024-02-05',
      status: 'Ativo',
      tamanho: '450 KB',
      formato: 'PDF',
      arquivo: 'holerite_fernanda_jan24.pdf'
    },
    {
      id: '5',
      codigo: 'DOC-2024-005',
      nome: 'Exame Admissional João',
      tipo: 'Exame Admissional',
      categoria: 'Documentação Médica',
      descricao: 'Exame admissional completo',
      funcionario: 'João Oliveira',
      departamento: 'Veterinária',
      dataUpload: '2023-05-10',
      dataValidade: '2024-05-10',
      status: 'Vencido',
      tamanho: '3.2 MB',
      formato: 'PDF',
      arquivo: 'exame_joao.pdf',
      observacoes: 'Necessário renovação urgente'
    },
    {
      id: '6',
      codigo: 'DOC-2024-006',
      nome: 'Certificado NR10 Pedro',
      tipo: 'Certificado',
      categoria: 'Treinamentos',
      descricao: 'Certificado NR10 - Segurança em Eletricidade',
      funcionario: 'Pedro Costa',
      departamento: 'Tecnologia',
      dataUpload: '2024-01-20',
      dataValidade: '2026-01-20',
      status: 'Ativo',
      tamanho: '1.8 MB',
      formato: 'PDF',
      arquivo: 'cert_nr10_pedro.pdf'
    },
    {
      id: '7',
      codigo: 'DOC-2024-007',
      nome: 'Comprovante Residência Juliana',
      tipo: 'Comprovante de Residência',
      categoria: 'Documentação Pessoal',
      descricao: 'Conta de luz - Comprovante de residência',
      funcionario: 'Juliana Mendes',
      departamento: 'Serviços Gerais',
      dataUpload: '2024-02-01',
      status: 'Ativo',
      tamanho: '620 KB',
      formato: 'PDF',
      arquivo: 'comprovante_juliana.pdf'
    },
    {
      id: '8',
      codigo: 'DOC-2024-008',
      nome: 'Carteira de Trabalho Ricardo',
      tipo: 'Carteira de Trabalho',
      categoria: 'Documentação Trabalhista',
      descricao: 'CTPS Digital - Frente e Verso',
      funcionario: 'Ricardo Alves',
      departamento: 'Financeiro',
      dataUpload: '2023-03-01',
      status: 'Ativo',
      tamanho: '2.1 MB',
      formato: 'PDF',
      arquivo: 'ctps_ricardo.pdf'
    }
  ]

  // Filtros
  const documentosFiltrados = documentos.filter((doc) => {
    const matchSearch = 
      doc.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.funcionario.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.tipo.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchTipo = filtroTipo === 'Todos' || doc.tipo === filtroTipo
    const matchStatus = filtroStatus === 'Todos' || doc.status === filtroStatus
    const matchDepartamento = filtroDepartamento === 'Todos' || doc.departamento === filtroDepartamento

    return matchSearch && matchTipo && matchStatus && matchDepartamento
  })

  // KPIs
  const totalDocumentos = documentos.length
  const documentosAtivos = documentos.filter(d => d.status === 'Ativo').length
  const documentosVencidos = documentos.filter(d => d.status === 'Vencido').length
  const documentosPendentes = documentos.filter(d => d.status === 'Pendente').length

  const departamentos = ['Todos', ...Array.from(new Set(documentos.map(d => d.departamento)))]

  const getStatusColor = (status: StatusDocumento) => {
    switch (status) {
      case 'Ativo': return 'bg-green-500/10 text-green-400 border-green-500/20'
      case 'Vencido': return 'bg-red-500/10 text-red-400 border-red-500/20'
      case 'Pendente': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
      case 'Arquivado': return 'bg-gray-500/10 text-gray-400 border-gray-500/20'
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20'
    }
  }

  const getFormatoIcon = (formato: string) => {
    if (formato === 'PDF') return <FileText className="w-5 h-5 text-red-400" />
    if (['JPG', 'PNG', 'JPEG'].includes(formato)) return <File className="w-5 h-5 text-blue-400" />
    if (['DOC', 'DOCX'].includes(formato)) return <FileText className="w-5 h-5 text-blue-600" />
    return <File className="w-5 h-5 text-slate-400" />
  }

  const handleVerDetalhes = (documento: Documento) => {
    setDocumentoSelecionado(documento)
    setMostrarModal(true)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setNovoDocumentoForm({...novoDocumentoForm, arquivo: e.target.files[0]})
    }
  }

  const salvarDocumento = async () => {
    // Validação dos campos obrigatórios
    if (!novoDocumentoForm.nome.trim()) {
      alert('Por favor, preencha o nome do documento')
      return
    }
    if (!novoDocumentoForm.funcionario.trim()) {
      alert('Por favor, preencha o nome do funcionário')
      return
    }
    if (!novoDocumentoForm.departamento) {
      alert('Por favor, selecione um departamento')
      return
    }
    if (!novoDocumentoForm.arquivo) {
      alert('Por favor, selecione um arquivo para upload')
      return
    }

    try {
      // Gerar código único do documento
      const ano = new Date().getFullYear()
      const numero = String(Math.floor(Math.random() * 900) + 100).padStart(3, '0')
      const codigoDocumento = `DOC-${ano}-${numero}`

      // Obter informações do arquivo
      const arquivo = novoDocumentoForm.arquivo
      const tamanhoKB = (arquivo.size / 1024).toFixed(2)
      const tamanhoMB = (arquivo.size / (1024 * 1024)).toFixed(2)
      const tamanhoFormatado = parseFloat(tamanhoMB) >= 1 ? `${tamanhoMB} MB` : `${tamanhoKB} KB`
      const formato = arquivo.name.split('.').pop()?.toUpperCase() || 'UNKNOWN'

      // Determinar status baseado na data de validade
      let status: StatusDocumento = 'Ativo'
      if (novoDocumentoForm.dataValidade) {
        const dataValidade = new Date(novoDocumentoForm.dataValidade)
        const hoje = new Date()
        if (dataValidade < hoje) {
          status = 'Vencido'
        }
      }

      // Preparar dados para salvar
      const novoDocumento = {
        codigo: codigoDocumento,
        nome: novoDocumentoForm.nome,
        tipo: novoDocumentoForm.tipo,
        categoria: novoDocumentoForm.categoria || 'Geral',
        descricao: novoDocumentoForm.descricao,
        funcionario: novoDocumentoForm.funcionario,
        departamento: novoDocumentoForm.departamento,
        dataUpload: new Date().toISOString().split('T')[0],
        dataValidade: novoDocumentoForm.dataValidade || null,
        status: status,
        tamanho: tamanhoFormatado,
        formato: formato,
        arquivo: arquivo.name,
        observacoes: novoDocumentoForm.observacoes,
        dataCadastro: new Date().toISOString()
      }

      // Salvar no Firebase
      await addDoc(collection(db, 'documentos'), novoDocumento)

      alert(`✅ Documento ${novoDocumento.nome} cadastrado com sucesso!\n\nCódigo: ${codigoDocumento}\nTamanho: ${tamanhoFormatado}`)
      
      // Limpar formulário
      setNovoDocumentoForm({
        nome: '',
        tipo: 'Outros',
        categoria: '',
        descricao: '',
        funcionario: '',
        departamento: '',
        dataValidade: '',
        arquivo: null,
        observacoes: ''
      })
      
      setMostrarModalNovo(false)
      
      // Recarregar página para mostrar novo documento
      window.location.reload()
    } catch (error) {
      console.error('Erro ao salvar documento:', error)
      alert('❌ Erro ao cadastrar documento. Tente novamente.')
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <FolderOpen className="w-8 h-8 text-blue-400" />
            Gestão de Documentos
          </h1>
          <p className="text-slate-400 mt-1">Armazenamento e controle de documentos digitais</p>
        </div>
        <button 
          onClick={() => setMostrarModalNovo(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Upload className="w-5 h-5" />
          Novo Documento
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Total de Documentos</p>
              <p className="text-2xl font-bold text-white mt-1">{totalDocumentos}</p>
            </div>
            <div className="bg-blue-500/10 p-3 rounded-lg">
              <FileText className="w-6 h-6 text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Documentos Ativos</p>
              <p className="text-2xl font-bold text-white mt-1">{documentosAtivos}</p>
            </div>
            <div className="bg-green-500/10 p-3 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Documentos Vencidos</p>
              <p className="text-2xl font-bold text-white mt-1">{documentosVencidos}</p>
            </div>
            <div className="bg-red-500/10 p-3 rounded-lg">
              <AlertCircle className="w-6 h-6 text-red-400" />
            </div>
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Documentos Pendentes</p>
              <p className="text-2xl font-bold text-white mt-1">{documentosPendentes}</p>
            </div>
            <div className="bg-yellow-500/10 p-3 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-400" />
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
              placeholder="Buscar por nome, funcionário ou tipo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
          </div>

          <button
            onClick={() => setMostrarFiltros(!mostrarFiltros)}
            className="bg-slate-900 border border-slate-700 hover:border-blue-500 text-white px-4 py-2.5 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Filter className="w-5 h-5" />
            Filtros
          </button>
        </div>

        {mostrarFiltros && (
          <div className="mt-4 pt-4 border-t border-slate-700">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Tipo de Documento</label>
                <select
                  value={filtroTipo}
                  onChange={(e) => setFiltroTipo(e.target.value as TipoDocumento | 'Todos')}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="Todos">Todos</option>
                  <option value="RG">RG</option>
                  <option value="CPF">CPF</option>
                  <option value="CNH">CNH</option>
                  <option value="Carteira de Trabalho">Carteira de Trabalho</option>
                  <option value="Contrato">Contrato</option>
                  <option value="Holerite">Holerite</option>
                  <option value="Certificado">Certificado</option>
                  <option value="Comprovante de Residência">Comprovante de Residência</option>
                  <option value="Exame Admissional">Exame Admissional</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Status</label>
                <select
                  value={filtroStatus}
                  onChange={(e) => setFiltroStatus(e.target.value as StatusDocumento | 'Todos')}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="Todos">Todos</option>
                  <option value="Ativo">Ativo</option>
                  <option value="Vencido">Vencido</option>
                  <option value="Pendente">Pendente</option>
                  <option value="Arquivado">Arquivado</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Departamento</label>
                <select
                  value={filtroDepartamento}
                  onChange={(e) => setFiltroDepartamento(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                >
                  {departamentos.map(dep => (
                    <option key={dep} value={dep}>{dep}</option>
                  ))}
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
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Documento</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Tipo</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Funcionário</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Departamento</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Data Upload</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Validade</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Tamanho</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Status</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {documentosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-slate-400">
                    Nenhum documento encontrado
                  </td>
                </tr>
              ) : (
                documentosFiltrados.map((documento) => (
                  <tr key={documento.id} className="hover:bg-slate-700/50 transition-colors">
                    <td className="px-6 py-4 text-slate-300 font-mono text-sm">{documento.codigo}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {getFormatoIcon(documento.formato)}
                        <div>
                          <p className="text-white font-medium">{documento.nome}</p>
                          <p className="text-slate-400 text-xs">{documento.formato}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {documento.tipo}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-300">{documento.funcionario}</td>
                    <td className="px-6 py-4 text-slate-300">{documento.departamento}</td>
                    <td className="px-6 py-4 text-slate-300">
                      {new Date(documento.dataUpload).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 text-slate-300">
                      {documento.dataValidade ? new Date(documento.dataValidade).toLocaleDateString('pt-BR') : '-'}
                    </td>
                    <td className="px-6 py-4 text-slate-300">{documento.tamanho}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(documento.status)}`}>
                        {documento.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleVerDetalhes(documento)}
                          className="text-blue-400 hover:text-blue-300 transition-colors"
                          title="Ver detalhes"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => alert('Download em desenvolvimento')}
                          className="text-green-400 hover:text-green-300 transition-colors"
                          title="Download"
                        >
                          <Download className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Tem certeza que deseja excluir este documento?')) {
                              alert('Documento excluído com sucesso!')
                            }
                          }}
                          className="text-red-400 hover:text-red-300 transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL NOVO DOCUMENTO */}
      {mostrarModalNovo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-700 sticky top-0 bg-slate-800 z-10">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Upload className="w-7 h-7 text-blue-400" />
                  Novo Documento
                </h2>
                <button onClick={() => setMostrarModalNovo(false)} className="text-slate-400 hover:text-white text-2xl">×</button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Informações do Documento */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-400" />
                  Informações do Documento
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-300 mb-2">Nome do Documento *</label>
                    <input 
                      type="text" 
                      value={novoDocumentoForm.nome} 
                      onChange={(e) => setNovoDocumentoForm({...novoDocumentoForm, nome: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                      placeholder="Ex: RG João Silva, Contrato Maria Santos" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Tipo de Documento *</label>
                    <select 
                      value={novoDocumentoForm.tipo} 
                      onChange={(e) => setNovoDocumentoForm({...novoDocumentoForm, tipo: e.target.value as TipoDocumento})}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="RG">RG</option>
                      <option value="CPF">CPF</option>
                      <option value="CNH">CNH</option>
                      <option value="Carteira de Trabalho">Carteira de Trabalho</option>
                      <option value="Contrato">Contrato</option>
                      <option value="Holerite">Holerite</option>
                      <option value="Certificado">Certificado</option>
                      <option value="Comprovante de Residência">Comprovante de Residência</option>
                      <option value="Exame Admissional">Exame Admissional</option>
                      <option value="Outros">Outros</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Categoria</label>
                    <input 
                      type="text" 
                      value={novoDocumentoForm.categoria} 
                      onChange={(e) => setNovoDocumentoForm({...novoDocumentoForm, categoria: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                      placeholder="Ex: Documentação Pessoal, Trabalhista" 
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-300 mb-2">Descrição</label>
                    <input 
                      type="text" 
                      value={novoDocumentoForm.descricao} 
                      onChange={(e) => setNovoDocumentoForm({...novoDocumentoForm, descricao: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                      placeholder="Descrição breve do documento" 
                    />
                  </div>
                </div>
              </div>

              {/* Vinculação */}
              <div className="border-t border-slate-700 pt-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-400" />
                  Vinculação
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Funcionário *</label>
                    <input 
                      type="text" 
                      value={novoDocumentoForm.funcionario} 
                      onChange={(e) => setNovoDocumentoForm({...novoDocumentoForm, funcionario: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                      placeholder="Nome do funcionário" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Departamento *</label>
                    <select 
                      value={novoDocumentoForm.departamento} 
                      onChange={(e) => setNovoDocumentoForm({...novoDocumentoForm, departamento: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="">Selecione</option>
                      <option value="Odontologia">Odontologia</option>
                      <option value="Veterinária">Veterinária</option>
                      <option value="Administrativo">Administrativo</option>
                      <option value="Financeiro">Financeiro</option>
                      <option value="Tecnologia">Tecnologia</option>
                      <option value="Marketing">Marketing</option>
                      <option value="Comercial">Comercial</option>
                      <option value="Serviços Gerais">Serviços Gerais</option>
                      <option value="Atendimento">Atendimento</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Data de Validade</label>
                    <input 
                      type="date" 
                      value={novoDocumentoForm.dataValidade} 
                      onChange={(e) => setNovoDocumentoForm({...novoDocumentoForm, dataValidade: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                    />
                    <p className="text-slate-400 text-xs mt-1">Deixe em branco se não houver validade</p>
                  </div>
                </div>
              </div>

              {/* Upload do Arquivo */}
              <div className="border-t border-slate-700 pt-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Upload className="w-5 h-5 text-blue-400" />
                  Upload do Arquivo *
                </h3>
                <div className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
                  <input 
                    type="file" 
                    id="fileUpload"
                    onChange={handleFileChange}
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    className="hidden"
                  />
                  <label htmlFor="fileUpload" className="cursor-pointer">
                    <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-white font-medium mb-1">Clique para fazer upload</p>
                    <p className="text-slate-400 text-sm">PDF, JPG, PNG, DOCX (até 10MB)</p>
                    {novoDocumentoForm.arquivo && (
                      <p className="text-blue-400 text-sm mt-2">
                        Arquivo selecionado: {novoDocumentoForm.arquivo.name}
                      </p>
                    )}
                  </label>
                </div>
              </div>

              {/* Observações */}
              <div className="border-t border-slate-700 pt-6">
                <label className="block text-sm font-medium text-slate-300 mb-2">Observações</label>
                <textarea 
                  value={novoDocumentoForm.observacoes} 
                  onChange={(e) => setNovoDocumentoForm({...novoDocumentoForm, observacoes: e.target.value})}
                  rows={3} 
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 resize-none"
                  placeholder="Informações adicionais sobre o documento" 
                />
              </div>
            </div>

            <div className="p-6 border-t border-slate-700 sticky bottom-0 bg-slate-800 flex gap-3">
              <button 
                onClick={() => setMostrarModalNovo(false)} 
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={salvarDocumento}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Save className="w-5 h-5" />
                Salvar Documento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detalhes */}
      {mostrarModal && documentoSelecionado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-700">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">Detalhes do Documento</h2>
                <button
                  onClick={() => setMostrarModal(false)}
                  className="text-slate-400 hover:text-white text-2xl transition-colors"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-slate-400 text-sm">Código</p>
                  <p className="text-white font-medium mt-1 font-mono">{documentoSelecionado.codigo}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Status</p>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border mt-1 ${getStatusColor(documentoSelecionado.status)}`}>
                    {documentoSelecionado.status}
                  </span>
                </div>
                <div className="col-span-2">
                  <p className="text-slate-400 text-sm">Nome do Documento</p>
                  <p className="text-white font-medium mt-1">{documentoSelecionado.nome}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Tipo</p>
                  <p className="text-white font-medium mt-1">{documentoSelecionado.tipo}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Categoria</p>
                  <p className="text-white font-medium mt-1">{documentoSelecionado.categoria}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Funcionário</p>
                  <p className="text-white font-medium mt-1">{documentoSelecionado.funcionario}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Departamento</p>
                  <p className="text-white font-medium mt-1">{documentoSelecionado.departamento}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Data de Upload</p>
                  <p className="text-white font-medium mt-1">
                    {new Date(documentoSelecionado.dataUpload).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Data de Validade</p>
                  <p className="text-white font-medium mt-1">
                    {documentoSelecionado.dataValidade 
                      ? new Date(documentoSelecionado.dataValidade).toLocaleDateString('pt-BR')
                      : 'Sem validade'
                    }
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Formato</p>
                  <p className="text-white font-medium mt-1">{documentoSelecionado.formato}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Tamanho</p>
                  <p className="text-white font-medium mt-1">{documentoSelecionado.tamanho}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-slate-400 text-sm">Arquivo</p>
                  <p className="text-white font-medium mt-1">{documentoSelecionado.arquivo}</p>
                </div>
              </div>

              {documentoSelecionado.descricao && (
                <div className="border-t border-slate-700 pt-4">
                  <p className="text-slate-400 text-sm">Descrição</p>
                  <p className="text-white font-medium mt-1">{documentoSelecionado.descricao}</p>
                </div>
              )}

              {documentoSelecionado.observacoes && (
                <div className="border-t border-slate-700 pt-4">
                  <p className="text-slate-400 text-sm">Observações</p>
                  <p className="text-white font-medium mt-1">{documentoSelecionado.observacoes}</p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button 
                  onClick={() => alert('Download em desenvolvimento')}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                  <Download className="w-5 h-5" />
                  Baixar Documento
                </button>
                <button 
                  onClick={() => setMostrarModal(false)}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-4 py-3 rounded-lg transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

import { useState } from 'react'
import { 
  Users, 
  Search, 
  Filter, 
  Plus, 
  DollarSign,
  Calendar,
  FileText,
  Award,
  AlertCircle,
  Eye,
  Download,
  TrendingUp,
  Save
} from 'lucide-react'
import { collection, addDoc } from 'firebase/firestore'
import { db } from '../../firebase'

type StatusFuncionario = 'Ativo' | 'Férias' | 'Afastado' | 'Desligado'
type TipoContrato = 'CLT' | 'PJ' | 'Estagiário' | 'Temporário' | 'Experiência'

interface Funcionario {
  id: string
  nome: string
  cargo: string
  departamento: string
  tipoContrato: TipoContrato
  salario: number
  dataAdmissao: string
  status: StatusFuncionario
  valeTransporte: boolean
  valeAlimentacao: boolean
  planoSaude: boolean
  feriasDisponiveis: number
  observacoes?: string
}

export default function RHERP() {
  const [searchTerm, setSearchTerm] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<StatusFuncionario | 'Todos'>('Todos')
  const [filtroDepartamento, setFiltroDepartamento] = useState<string>('Todos')
  const [mostrarFiltros, setMostrarFiltros] = useState(false)
  const [mostrarModal, setMostrarModal] = useState(false)
  const [funcionarioSelecionado, setFuncionarioSelecionado] = useState<Funcionario | null>(null)
  const [mostrarModalNovo, setMostrarModalNovo] = useState(false)
  const [novoFuncionarioForm, setNovoFuncionarioForm] = useState({
    nome: '',
    cargo: '',
    departamento: '',
    tipoContrato: 'CLT' as TipoContrato,
    salario: '',
    dataAdmissao: '',
    valeTransporte: false,
    valeAlimentacao: false,
    planoSaude: false,
    observacoes: ''
  })

  // Dados simulados
  const funcionarios: Funcionario[] = [
    {
      id: '1',
      nome: 'Dr. Carlos Silva',
      cargo: 'Dentista',
      departamento: 'Odontologia',
      tipoContrato: 'CLT',
      salario: 8500.00,
      dataAdmissao: '2022-03-15',
      status: 'Ativo',
      valeTransporte: true,
      valeAlimentacao: true,
      planoSaude: true,
      feriasDisponiveis: 30
    },
    {
      id: '2',
      nome: 'Dra. Ana Paula',
      cargo: 'Veterinária',
      departamento: 'Veterinária',
      tipoContrato: 'CLT',
      salario: 7200.00,
      dataAdmissao: '2021-08-20',
      status: 'Ativo',
      valeTransporte: true,
      valeAlimentacao: true,
      planoSaude: true,
      feriasDisponiveis: 30
    },
    {
      id: '3',
      nome: 'Maria Santos',
      cargo: 'Recepcionista',
      departamento: 'Administrativo',
      tipoContrato: 'CLT',
      salario: 2800.00,
      dataAdmissao: '2023-01-10',
      status: 'Ativo',
      valeTransporte: true,
      valeAlimentacao: true,
      planoSaude: false,
      feriasDisponiveis: 15
    },
    {
      id: '4',
      nome: 'João Oliveira',
      cargo: 'Auxiliar Veterinário',
      departamento: 'Veterinária',
      tipoContrato: 'CLT',
      salario: 2200.00,
      dataAdmissao: '2023-05-12',
      status: 'Férias',
      valeTransporte: true,
      valeAlimentacao: true,
      planoSaude: false,
      feriasDisponiveis: 0,
      observacoes: 'Retorna em 10/02/2024'
    },
    {
      id: '5',
      nome: 'Pedro Costa',
      cargo: 'Estagiário TI',
      departamento: 'Tecnologia',
      tipoContrato: 'Estagiário',
      salario: 1200.00,
      dataAdmissao: '2024-01-15',
      status: 'Ativo',
      valeTransporte: true,
      valeAlimentacao: false,
      planoSaude: false,
      feriasDisponiveis: 0
    },
    {
      id: '6',
      nome: 'Fernanda Lima',
      cargo: 'Auxiliar Administrativa',
      departamento: 'Administrativo',
      tipoContrato: 'CLT',
      salario: 2400.00,
      dataAdmissao: '2022-11-05',
      status: 'Ativo',
      valeTransporte: true,
      valeAlimentacao: true,
      planoSaude: true,
      feriasDisponiveis: 30
    },
    {
      id: '7',
      nome: 'Ricardo Alves',
      cargo: 'Contador',
      departamento: 'Financeiro',
      tipoContrato: 'PJ',
      salario: 5000.00,
      dataAdmissao: '2023-03-01',
      status: 'Ativo',
      valeTransporte: false,
      valeAlimentacao: false,
      planoSaude: false,
      feriasDisponiveis: 0
    },
    {
      id: '8',
      nome: 'Juliana Mendes',
      cargo: 'Auxiliar de Limpeza',
      departamento: 'Serviços Gerais',
      tipoContrato: 'CLT',
      salario: 1800.00,
      dataAdmissao: '2021-06-20',
      status: 'Ativo',
      valeTransporte: true,
      valeAlimentacao: true,
      planoSaude: false,
      feriasDisponiveis: 30
    }
  ]

  // Filtros
  const funcionariosFiltrados = funcionarios.filter((func) => {
    const matchSearch = 
      func.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      func.cargo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      func.departamento.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchStatus = filtroStatus === 'Todos' || func.status === filtroStatus
    const matchDepartamento = filtroDepartamento === 'Todos' || func.departamento === filtroDepartamento

    return matchSearch && matchStatus && matchDepartamento
  })

  // KPIs
  const totalFuncionarios = funcionarios.filter(f => f.status !== 'Desligado').length
  const folhaPagamento = funcionarios
    .filter(f => f.status === 'Ativo' || f.status === 'Férias')
    .reduce((sum, f) => sum + f.salario, 0)
  const emFerias = funcionarios.filter(f => f.status === 'Férias').length
  const ticketMedio = totalFuncionarios > 0 ? folhaPagamento / totalFuncionarios : 0

  const departamentos = ['Todos', ...Array.from(new Set(funcionarios.map(f => f.departamento)))]

  const getStatusColor = (status: StatusFuncionario) => {
    switch (status) {
      case 'Ativo': return 'bg-green-500/10 text-green-400 border-green-500/20'
      case 'Férias': return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
      case 'Afastado': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
      case 'Desligado': return 'bg-red-500/10 text-red-400 border-red-500/20'
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20'
    }
  }

  const handleVerDetalhes = (funcionario: Funcionario) => {
    setFuncionarioSelecionado(funcionario)
    setMostrarModal(true)
  }

  const salvarFuncionario = async () => {
    // Valida��o dos campos obrigat�rios
    if (!novoFuncionarioForm.nome.trim()) {
      alert('Por favor, preencha o nome completo do funcion�rio')
      return
    }
    if (!novoFuncionarioForm.cargo.trim()) {
      alert('Por favor, preencha o cargo')
      return
    }
    if (!novoFuncionarioForm.departamento) {
      alert('Por favor, selecione um departamento')
      return
    }
    if (!novoFuncionarioForm.salario || parseFloat(novoFuncionarioForm.salario) <= 0) {
      alert('Por favor, preencha um sal�rio v�lido')
      return
    }
    if (!novoFuncionarioForm.dataAdmissao) {
      alert('Por favor, selecione a data de admiss�o')
      return
    }

    try {
      // Gerar c�digo �nico do funcion�rio
      const ano = new Date().getFullYear()
      const numero = Math.floor(Math.random() * 9000) + 1000
      const codigoFuncionario = `FUNC-${ano}-${numero}`

      // Preparar dados para salvar
      const novoFuncionario = {
        codigo: codigoFuncionario,
        nome: novoFuncionarioForm.nome,
        cargo: novoFuncionarioForm.cargo,
        departamento: novoFuncionarioForm.departamento,
        tipoContrato: novoFuncionarioForm.tipoContrato,
        salario: parseFloat(novoFuncionarioForm.salario),
        dataAdmissao: novoFuncionarioForm.dataAdmissao,
        status: 'Ativo',
        valeTransporte: novoFuncionarioForm.valeTransporte,
        valeAlimentacao: novoFuncionarioForm.valeAlimentacao,
        planoSaude: novoFuncionarioForm.planoSaude,
        feriasDisponiveis: 0, // Novo funcion�rio come�a sem f�rias
        observacoes: novoFuncionarioForm.observacoes,
        dataCadastro: new Date().toISOString(),
        custoTotal: parseFloat(novoFuncionarioForm.salario) * 1.8 // Sal�rio + encargos estimados
      }

      // Salvar no Firebase
      await addDoc(collection(db, 'funcionarios'), novoFuncionario)

      alert(`? Funcion�rio ${novoFuncionario.nome} cadastrado com sucesso!\n\nC�digo: ${codigoFuncionario}`)
      
      // Limpar formul�rio
      setNovoFuncionarioForm({
        nome: '',
        cargo: '',
        departamento: '',
        tipoContrato: 'CLT',
        salario: '',
        dataAdmissao: '',
        valeTransporte: false,
        valeAlimentacao: false,
        planoSaude: false,
        observacoes: ''
      })
      
      setMostrarModalNovo(false)
      
      // Recarregar p�gina para mostrar novo funcion�rio
      window.location.reload()
    } catch (error) {
      console.error('Erro ao salvar funcion�rio:', error)
      alert('? Erro ao cadastrar funcion�rio. Tente novamente.')
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Users className="w-8 h-8 text-purple-400" />
            Recursos Humanos
          </h1>
          <p className="text-slate-400 mt-1">Gestão de funcionários e folha de pagamento</p>
        </div>
        <button 
          onClick={() => setMostrarModalNovo(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Novo Funcionário
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Total Funcionários</p>
              <p className="text-2xl font-bold text-white mt-1">{totalFuncionarios}</p>
            </div>
            <div className="bg-purple-500/10 p-3 rounded-lg">
              <Users className="w-6 h-6 text-purple-400" />
            </div>
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Folha de Pagamento</p>
              <p className="text-2xl font-bold text-white mt-1">
                R$ {folhaPagamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
              <p className="text-slate-400 text-sm">Em Férias</p>
              <p className="text-2xl font-bold text-white mt-1">{emFerias}</p>
            </div>
            <div className="bg-yellow-500/10 p-3 rounded-lg">
              <Calendar className="w-6 h-6 text-yellow-400" />
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
              placeholder="Buscar por nome, cargo ou departamento..."
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
                  onChange={(e) => setFiltroStatus(e.target.value as StatusFuncionario | 'Todos')}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="Todos">Todos</option>
                  <option value="Ativo">Ativo</option>
                  <option value="Férias">Férias</option>
                  <option value="Afastado">Afastado</option>
                  <option value="Desligado">Desligado</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Departamento</label>
                <select
                  value={filtroDepartamento}
                  onChange={(e) => setFiltroDepartamento(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
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
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Nome</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Cargo</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Departamento</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Contrato</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Salário</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Admissão</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Benefícios</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Status</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {funcionariosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-400">
                    Nenhum funcionário encontrado
                  </td>
                </tr>
              ) : (
                funcionariosFiltrados.map((funcionario) => (
                  <tr key={funcionario.id} className="hover:bg-slate-700/50 transition-colors">
                    <td className="px-6 py-4 text-white font-medium">{funcionario.nome}</td>
                    <td className="px-6 py-4 text-slate-300">{funcionario.cargo}</td>
                    <td className="px-6 py-4 text-slate-300">{funcionario.departamento}</td>
                    <td className="px-6 py-4 text-slate-300">{funcionario.tipoContrato}</td>
                    <td className="px-6 py-4 text-white font-semibold">
                      R$ {funcionario.salario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-slate-300">
                      {new Date(funcionario.dataAdmissao).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-1">
                        {funcionario.valeTransporte && (
                          <span className="text-green-400 text-xs bg-green-500/10 px-2 py-1 rounded">VT</span>
                        )}
                        {funcionario.valeAlimentacao && (
                          <span className="text-blue-400 text-xs bg-blue-500/10 px-2 py-1 rounded">VA</span>
                        )}
                        {funcionario.planoSaude && (
                          <span className="text-purple-400 text-xs bg-purple-500/10 px-2 py-1 rounded">PS</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(funcionario.status)}`}>
                        {funcionario.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleVerDetalhes(funcionario)}
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

      {/* MODAL NOVO FUNCIONÁRIO */}
      {mostrarModalNovo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-700 sticky top-0 bg-slate-800 z-10">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Users className="w-7 h-7 text-purple-400" />
                  Novo Funcionário
                </h2>
                <button onClick={() => setMostrarModalNovo(false)} className="text-slate-400 hover:text-white text-2xl">×</button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Dados Pessoais */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-400" />
                  Dados Pessoais
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-300 mb-2">Nome Completo *</label>
                    <input 
                      type="text" 
                      value={novoFuncionarioForm.nome} 
                      onChange={(e) => setNovoFuncionarioForm({...novoFuncionarioForm, nome: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
                      placeholder="Nome completo do funcionário" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Cargo *</label>
                    <input 
                      type="text" 
                      value={novoFuncionarioForm.cargo} 
                      onChange={(e) => setNovoFuncionarioForm({...novoFuncionarioForm, cargo: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
                      placeholder="Ex: Dentista, Recepcionista" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Departamento *</label>
                    <select 
                      value={novoFuncionarioForm.departamento} 
                      onChange={(e) => setNovoFuncionarioForm({...novoFuncionarioForm, departamento: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-purple-500"
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
                </div>
              </div>

              {/* Informações Contratuais */}
              <div className="border-t border-slate-700 pt-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-purple-400" />
                  Informações Contratuais
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Tipo de Contrato *</label>
                    <select 
                      value={novoFuncionarioForm.tipoContrato} 
                      onChange={(e) => setNovoFuncionarioForm({...novoFuncionarioForm, tipoContrato: e.target.value as TipoContrato})}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-purple-500"
                    >
                      <option value="CLT">CLT</option>
                      <option value="PJ">PJ</option>
                      <option value="Estagiário">Estagiário</option>
                      <option value="Temporário">Temporário</option>
                      <option value="Experiência">Experiência</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Salário *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400">R$</span>
                      <input 
                        type="number" 
                        step="0.01"
                        value={novoFuncionarioForm.salario} 
                        onChange={(e) => setNovoFuncionarioForm({...novoFuncionarioForm, salario: e.target.value})}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
                        placeholder="0,00" 
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Data de Admissão *</label>
                    <input 
                      type="date" 
                      value={novoFuncionarioForm.dataAdmissao} 
                      onChange={(e) => setNovoFuncionarioForm({...novoFuncionarioForm, dataAdmissao: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
              </div>

              {/* Benefícios */}
              <div className="border-t border-slate-700 pt-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Award className="w-5 h-5 text-purple-400" />
                  Benefícios
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <label className="flex items-center gap-3 bg-slate-900 border border-slate-700 rounded-lg p-4 cursor-pointer hover:border-purple-500 transition-colors">
                    <input 
                      type="checkbox" 
                      checked={novoFuncionarioForm.valeTransporte}
                      onChange={(e) => setNovoFuncionarioForm({...novoFuncionarioForm, valeTransporte: e.target.checked})}
                      className="w-5 h-5 rounded border-slate-600 text-purple-600 focus:ring-purple-500 focus:ring-offset-slate-900"
                    />
                    <div>
                      <p className="text-white font-medium">Vale Transporte</p>
                      <p className="text-slate-400 text-xs">Auxílio deslocamento</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 bg-slate-900 border border-slate-700 rounded-lg p-4 cursor-pointer hover:border-purple-500 transition-colors">
                    <input 
                      type="checkbox" 
                      checked={novoFuncionarioForm.valeAlimentacao}
                      onChange={(e) => setNovoFuncionarioForm({...novoFuncionarioForm, valeAlimentacao: e.target.checked})}
                      className="w-5 h-5 rounded border-slate-600 text-purple-600 focus:ring-purple-500 focus:ring-offset-slate-900"
                    />
                    <div>
                      <p className="text-white font-medium">Vale Alimentação</p>
                      <p className="text-slate-400 text-xs">Auxílio refeição</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 bg-slate-900 border border-slate-700 rounded-lg p-4 cursor-pointer hover:border-purple-500 transition-colors">
                    <input 
                      type="checkbox" 
                      checked={novoFuncionarioForm.planoSaude}
                      onChange={(e) => setNovoFuncionarioForm({...novoFuncionarioForm, planoSaude: e.target.checked})}
                      className="w-5 h-5 rounded border-slate-600 text-purple-600 focus:ring-purple-500 focus:ring-offset-slate-900"
                    />
                    <div>
                      <p className="text-white font-medium">Plano de Saúde</p>
                      <p className="text-slate-400 text-xs">Assistência médica</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Resumo Salarial */}
              <div className="p-4 bg-slate-900 rounded-lg border border-slate-700">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-slate-400 text-sm">Salário Base</p>
                    <p className="text-2xl font-bold text-white mt-1">
                      R$ {(parseFloat(novoFuncionarioForm.salario) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm">Custo Total Estimado</p>
                    <p className="text-2xl font-bold text-purple-400 mt-1">
                      R$ {((parseFloat(novoFuncionarioForm.salario) || 0) * 1.8).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-slate-500 text-xs mt-1">Inclui encargos (~80%)</p>
                  </div>
                </div>
              </div>

              {/* Observações */}
              <div className="border-t border-slate-700 pt-6">
                <label className="block text-sm font-medium text-slate-300 mb-2">Observações</label>
                <textarea 
                  value={novoFuncionarioForm.observacoes} 
                  onChange={(e) => setNovoFuncionarioForm({...novoFuncionarioForm, observacoes: e.target.value})}
                  rows={3} 
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 resize-none"
                  placeholder="Informações adicionais sobre o funcionário (documentação pendente, período de experiência, etc.)" 
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
                onClick={salvarFuncionario}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Save className="w-5 h-5" />
                Cadastrar Funcionário
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detalhes */}
      {mostrarModal && funcionarioSelecionado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-700">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">Detalhes do Funcionário</h2>
                <button
                  onClick={() => setMostrarModal(false)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <AlertCircle className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-slate-400 text-sm">Nome Completo</p>
                  <p className="text-white font-medium mt-1">{funcionarioSelecionado.nome}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Status</p>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border mt-1 ${getStatusColor(funcionarioSelecionado.status)}`}>
                    {funcionarioSelecionado.status}
                  </span>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Cargo</p>
                  <p className="text-white font-medium mt-1">{funcionarioSelecionado.cargo}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Departamento</p>
                  <p className="text-white font-medium mt-1">{funcionarioSelecionado.departamento}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Tipo de Contrato</p>
                  <p className="text-white font-medium mt-1">{funcionarioSelecionado.tipoContrato}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Salário</p>
                  <p className="text-white font-medium mt-1">
                    R$ {funcionarioSelecionado.salario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Data de Admissão</p>
                  <p className="text-white font-medium mt-1">
                    {new Date(funcionarioSelecionado.dataAdmissao).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Férias Disponíveis</p>
                  <p className="text-white font-medium mt-1">{funcionarioSelecionado.feriasDisponiveis} dias</p>
                </div>
              </div>

              {/* Benefícios */}
              <div className="border-t border-slate-700 pt-4">
                <p className="text-slate-400 text-sm mb-3">Benefícios</p>
                <div className="flex flex-wrap gap-2">
                  {funcionarioSelecionado.valeTransporte && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                      Vale Transporte
                    </span>
                  )}
                  {funcionarioSelecionado.valeAlimentacao && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      Vale Alimentação
                    </span>
                  )}
                  {funcionarioSelecionado.planoSaude && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      Plano de Saúde
                    </span>
                  )}
                  {!funcionarioSelecionado.valeTransporte && 
                   !funcionarioSelecionado.valeAlimentacao && 
                   !funcionarioSelecionado.planoSaude && (
                    <span className="text-slate-400 text-sm">Nenhum benefício</span>
                  )}
                </div>
              </div>

              {funcionarioSelecionado.observacoes && (
                <div className="border-t border-slate-700 pt-4">
                  <p className="text-slate-400 text-sm">Observações</p>
                  <p className="text-white font-medium mt-1">{funcionarioSelecionado.observacoes}</p>
                </div>
              )}

              {/* Resumo Financeiro */}
              <div className="border-t border-slate-700 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-900 rounded-lg p-4">
                    <p className="text-slate-400 text-sm">Salário Mensal</p>
                    <p className="text-2xl font-bold text-white mt-1">
                      R$ {funcionarioSelecionado.salario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="bg-slate-900 rounded-lg p-4">
                    <p className="text-slate-400 text-sm">Custo Total Estimado</p>
                    <p className="text-2xl font-bold text-purple-400 mt-1">
                      R$ {(funcionarioSelecionado.salario * 1.8).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-slate-500 text-xs mt-1">Inclui encargos (~80%)</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-lg font-medium transition-colors">
                  Editar Funcionário
                </button>
                <button className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg flex items-center justify-center gap-2 transition-colors">
                  <Download className="w-5 h-5" />
                  Exportar Dados
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

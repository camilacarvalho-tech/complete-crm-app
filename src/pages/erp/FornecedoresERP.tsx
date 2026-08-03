import { useState, useEffect } from 'react'
import { 
  Truck, 
  Search, 
  Filter, 
  Plus, 
  Star,
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Phone,
  Mail,
  MapPin,
  Eye,
  Edit,
  Trash2,
  Save,
  X
} from 'lucide-react'
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs } from 'firebase/firestore'
import { db } from '../../firebase'

type StatusFornecedor = 'Ativo' | 'Inativo' | 'Bloqueado'
type CategoriaFornecedor = 
  | 'Materiais Odontológicos'
  | 'Materiais Veterinários'
  | 'Medicamentos'
  | 'Equipamentos'
  | 'Alimentos e Rações'
  | 'Materiais de Escritório'
  | 'Limpeza e Higiene'
  | 'Serviços'
  | 'Tecnologia'
  | 'Outros'

interface Fornecedor {
  id: string
  razaoSocial: string
  nomeFantasia: string
  cnpj: string
  categoria: CategoriaFornecedor
  telefone: string
  email: string
  cidade: string
  estado: string
  avaliacao: number
  totalComprado: number
  ultimaCompra: string
  prazoEntrega: number
  status: StatusFornecedor
  observacoes?: string
}

export default function FornecedoresERP() {
  const [searchTerm, setSearchTerm] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<StatusFornecedor | 'Todos'>('Todos')
  const [filtroCategoria, setFiltroCategoria] = useState<CategoriaFornecedor | 'Todos'>('Todos')
  const [mostrarFiltros, setMostrarFiltros] = useState(false)
  const [mostrarModal, setMostrarModal] = useState(false)
  const [fornecedorSelecionado, setFornecedorSelecionado] = useState<Fornecedor | null>(null)
  const [mostrarModalNovo, setMostrarModalNovo] = useState(false)
  const [modoEdicao, setModoEdicao] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [fornecedoresLista, setFornecedoresLista] = useState<Fornecedor[]>([])
  const [novoFornecedorForm, setNovoFornecedorForm] = useState({
    id: '',
    razaoSocial: '',
    nomeFantasia: '',
    cnpj: '',
    categoria: 'Materiais Odontológicos' as CategoriaFornecedor,
    telefone: '',
    celular: '',
    email: '',
    site: '',
    endereco: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    cep: '',
    inscricaoEstadual: '',
    contato: '',
    cargoContato: '',
    prazoEntrega: '',
    status: 'Ativo' as StatusFornecedor,
    observacoes: ''
  })

  // Máscaras de formatação
  const formatarCNPJ = (valor: string) => {
    const numeros = valor.replace(/\D/g, '')
    return numeros
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .slice(0, 18)
  }

  const formatarTelefone = (valor: string) => {
    const numeros = valor.replace(/\D/g, '')
    if (numeros.length <= 10) {
      return numeros
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{4})(\d)/, '$1-$2')
    }
    return numeros
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .slice(0, 15)
  }

  const formatarCEP = (valor: string) => {
    const numeros = valor.replace(/\D/g, '')
    return numeros.replace(/(\d{5})(\d)/, '$1-$2').slice(0, 9)
  }

  const buscarCEP = async (cep: string) => {
    const cepLimpo = cep.replace(/\D/g, '')
    if (cepLimpo.length !== 8) return

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`)
      const data = await response.json()
      
      if (!data.erro) {
        setNovoFornecedorForm(prev => ({
          ...prev,
          endereco: data.logradouro || '',
          bairro: data.bairro || '',
          cidade: data.localidade || '',
          estado: data.uf || ''
        }))
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error)
    }
  }

  // Dados simulados
  const fornecedores: Fornecedor[] = [
    {
      id: '1',
      razaoSocial: 'Dental Cremer S.A.',
      nomeFantasia: 'Dental Cremer',
      cnpj: '12.345.678/0001-90',
      categoria: 'Materiais Odontológicos',
      telefone: '(11) 3456-7890',
      email: 'vendas@dentalcremer.com.br',
      cidade: 'São Paulo',
      estado: 'SP',
      avaliacao: 5,
      totalComprado: 145230.00,
      ultimaCompra: '2024-01-20',
      prazoEntrega: 3,
      status: 'Ativo'
    },
    {
      id: '2',
      razaoSocial: 'Vetnil Indústria e Comércio Ltda',
      nomeFantasia: 'Vetnil',
      cnpj: '23.456.789/0001-80',
      categoria: 'Materiais Veterinários',
      telefone: '(11) 2345-6789',
      email: 'contato@vetnil.com.br',
      cidade: 'São Paulo',
      estado: 'SP',
      avaliacao: 5,
      totalComprado: 89450.00,
      ultimaCompra: '2024-01-18',
      prazoEntrega: 5,
      status: 'Ativo'
    },
    {
      id: '3',
      razaoSocial: 'Royal Canin Brasil Ltda',
      nomeFantasia: 'Royal Canin',
      cnpj: '34.567.890/0001-70',
      categoria: 'Alimentos e Rações',
      telefone: '(11) 4567-8901',
      email: 'pedidos@royalcanin.com.br',
      cidade: 'São Paulo',
      estado: 'SP',
      avaliacao: 4,
      totalComprado: 67890.00,
      ultimaCompra: '2024-01-15',
      prazoEntrega: 7,
      status: 'Ativo'
    },
    {
      id: '4',
      razaoSocial: 'Papelaria Delta Comercial Ltda',
      nomeFantasia: 'Papelaria Delta',
      cnpj: '45.678.901/0001-60',
      categoria: 'Materiais de Escritório',
      telefone: '(31) 3456-7890',
      email: 'vendas@papelariedelta.com.br',
      cidade: 'Belo Horizonte',
      estado: 'MG',
      avaliacao: 4,
      totalComprado: 23450.00,
      ultimaCompra: '2024-01-10',
      prazoEntrega: 5,
      status: 'Ativo'
    },
    {
      id: '5',
      razaoSocial: 'Medsystem Equipamentos Médicos',
      nomeFantasia: 'Medsystem',
      cnpj: '56.789.012/0001-50',
      categoria: 'Equipamentos',
      telefone: '(11) 5678-9012',
      email: 'contato@medsystem.com.br',
      cidade: 'São Paulo',
      estado: 'SP',
      avaliacao: 5,
      totalComprado: 245000.00,
      ultimaCompra: '2024-01-05',
      prazoEntrega: 15,
      status: 'Ativo',
      observacoes: 'Fornecedor premium de equipamentos de alto valor'
    },
    {
      id: '6',
      razaoSocial: 'Limpeza Total Serviços Ltda',
      nomeFantasia: 'Limpeza Total',
      cnpj: '67.890.123/0001-40',
      categoria: 'Limpeza e Higiene',
      telefone: '(31) 4567-8901',
      email: 'contato@limpezatotal.com.br',
      cidade: 'Belo Horizonte',
      estado: 'MG',
      avaliacao: 3,
      totalComprado: 15600.00,
      ultimaCompra: '2024-01-22',
      prazoEntrega: 2,
      status: 'Ativo'
    },
    {
      id: '7',
      razaoSocial: 'TechSolutions Informática Ltda',
      nomeFantasia: 'TechSolutions',
      cnpj: '78.901.234/0001-30',
      categoria: 'Tecnologia',
      telefone: '(11) 6789-0123',
      email: 'suporte@techsolutions.com.br',
      cidade: 'São Paulo',
      estado: 'SP',
      avaliacao: 4,
      totalComprado: 45800.00,
      ultimaCompra: '2023-12-20',
      prazoEntrega: 10,
      status: 'Ativo'
    },
    {
      id: '8',
      razaoSocial: 'Distribuidora Farmacêutica Santos',
      nomeFantasia: 'Farma Santos',
      cnpj: '89.012.345/0001-20',
      categoria: 'Medicamentos',
      telefone: '(21) 3456-7890',
      email: 'pedidos@farmasantos.com.br',
      cidade: 'Rio de Janeiro',
      estado: 'RJ',
      avaliacao: 4,
      totalComprado: 78920.00,
      ultimaCompra: '2024-01-25',
      prazoEntrega: 4,
      status: 'Ativo'
    }
  ]

  // Filtros
  const fornecedoresFiltrados = fornecedores.filter((fornecedor) => {
    const matchSearch = 
      fornecedor.razaoSocial.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fornecedor.nomeFantasia.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fornecedor.cnpj.includes(searchTerm)
    
    const matchStatus = filtroStatus === 'Todos' || fornecedor.status === filtroStatus
    const matchCategoria = filtroCategoria === 'Todos' || fornecedor.categoria === filtroCategoria

    return matchSearch && matchStatus && matchCategoria
  })

  // KPIs
  const totalFornecedores = fornecedores.length
  const fornecedoresAtivos = fornecedores.filter(f => f.status === 'Ativo').length
  const totalComprado = fornecedores.reduce((sum, f) => sum + f.totalComprado, 0)
  const avaliacaoMedia = fornecedores.reduce((sum, f) => sum + f.avaliacao, 0) / fornecedores.length

  const getStatusColor = (status: StatusFornecedor) => {
    switch (status) {
      case 'Ativo': return 'bg-green-500/10 text-green-400 border-green-500/20'
      case 'Inativo': return 'bg-gray-500/10 text-gray-400 border-gray-500/20'
      case 'Bloqueado': return 'bg-red-500/10 text-red-400 border-red-500/20'
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20'
    }
  }

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-600'
            }`}
          />
        ))}
      </div>
    )
  }

  const handleVerDetalhes = (fornecedor: Fornecedor) => {
    setFornecedorSelecionado(fornecedor)
    setMostrarModal(true)
  }

  return (
    <div className="p-6 space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Truck className="w-8 h-8 text-purple-400" />
            Fornecedores
          </h1>
          <p className="text-slate-400 mt-1">Gestão completa de fornecedores</p>
        </div>
        <button 
          onClick={() => setMostrarModalNovo(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Novo Fornecedor
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Total Fornecedores</p>
              <p className="text-2xl font-bold text-white mt-1">{totalFornecedores}</p>
            </div>
            <div className="bg-purple-500/10 p-3 rounded-lg">
              <Truck className="w-6 h-6 text-purple-400" />
            </div>
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Fornecedores Ativos</p>
              <p className="text-2xl font-bold text-white mt-1">{fornecedoresAtivos}</p>
            </div>
            <div className="bg-green-500/10 p-3 rounded-lg">
              <ShoppingBag className="w-6 h-6 text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Total Comprado</p>
              <p className="text-2xl font-bold text-white mt-1">
                R$ {totalComprado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-blue-500/10 p-3 rounded-lg">
              <DollarSign className="w-6 h-6 text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Avaliação Média</p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-2xl font-bold text-white">{avaliacaoMedia.toFixed(1)}</p>
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
              </div>
            </div>
            <div className="bg-yellow-500/10 p-3 rounded-lg">
              <TrendingUp className="w-6 h-6 text-yellow-400" />
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
              placeholder="Buscar por razão social, fantasia ou CNPJ..."
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
                  onChange={(e) => setFiltroStatus(e.target.value as StatusFornecedor | 'Todos')}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="Todos">Todos</option>
                  <option value="Ativo">Ativo</option>
                  <option value="Inativo">Inativo</option>
                  <option value="Bloqueado">Bloqueado</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Categoria</label>
                <select
                  value={filtroCategoria}
                  onChange={(e) => setFiltroCategoria(e.target.value as CategoriaFornecedor | 'Todos')}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="Todos">Todas</option>
                  <option value="Materiais Odontológicos">Materiais Odontológicos</option>
                  <option value="Materiais Veterinários">Materiais Veterinários</option>
                  <option value="Medicamentos">Medicamentos</option>
                  <option value="Equipamentos">Equipamentos</option>
                  <option value="Alimentos e Rações">Alimentos e Rações</option>
                  <option value="Materiais de Escritório">Materiais de Escritório</option>
                  <option value="Limpeza e Higiene">Limpeza e Higiene</option>
                  <option value="Serviços">Serviços</option>
                  <option value="Tecnologia">Tecnologia</option>
                  <option value="Outros">Outros</option>
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
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Fornecedor</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">CNPJ</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Categoria</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Contato</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Localização</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Avaliação</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Total Comprado</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Status</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {fornecedoresFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-400">
                    Nenhum fornecedor encontrado
                  </td>
                </tr>
              ) : (
                fornecedoresFiltrados.map((fornecedor) => (
                  <tr key={fornecedor.id} className="hover:bg-slate-700/50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-white font-medium">{fornecedor.nomeFantasia}</p>
                        <p className="text-slate-400 text-sm">{fornecedor.razaoSocial}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-300">{fornecedor.cnpj}</td>
                    <td className="px-6 py-4 text-slate-300">{fornecedor.categoria}</td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-slate-300 text-sm">
                          <Phone className="w-3 h-3" />
                          {fornecedor.telefone}
                        </div>
                        <div className="flex items-center gap-2 text-slate-300 text-sm">
                          <Mail className="w-3 h-3" />
                          {fornecedor.email}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-300">
                        <MapPin className="w-4 h-4" />
                        {fornecedor.cidade}/{fornecedor.estado}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {renderStars(fornecedor.avaliacao)}
                    </td>
                    <td className="px-6 py-4 text-white font-semibold">
                      R$ {fornecedor.totalComprado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(fornecedor.status)}`}>
                        {fornecedor.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleVerDetalhes(fornecedor)}
                          className="text-purple-400 hover:text-purple-300 transition-colors"
                          title="Ver detalhes"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <button
                          className="text-blue-400 hover:text-blue-300 transition-colors"
                          title="Editar"
                        >
                          <Edit className="w-5 h-5" />
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

      {/* MODAL NOVO FORNECEDOR */}
      {mostrarModalNovo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-700 sticky top-0 bg-slate-800 z-10">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Truck className="w-7 h-7 text-purple-400" />
                  Cadastrar Novo Fornecedor
                </h2>
                <button onClick={() => setMostrarModalNovo(false)} className="text-slate-400 hover:text-white text-2xl">
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Dados da Empresa */}
              <div>
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-purple-400" />
                  Dados da Empresa
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-300 mb-2">Razão Social *</label>
                    <input
                      type="text"
                      value={novoFornecedorForm.razaoSocial}
                      onChange={(e) => setNovoFornecedorForm({...novoFornecedorForm, razaoSocial: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
                      placeholder="Nome oficial da empresa"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Nome Fantasia</label>
                    <input
                      type="text"
                      value={novoFornecedorForm.nomeFantasia}
                      onChange={(e) => setNovoFornecedorForm({...novoFornecedorForm, nomeFantasia: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
                      placeholder="Nome comercial"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">CNPJ *</label>
                    <input
                      type="text"
                      value={novoFornecedorForm.cnpj}
                      onChange={(e) => setNovoFornecedorForm({...novoFornecedorForm, cnpj: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
                      placeholder="00.000.000/0000-00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Inscrição Estadual</label>
                    <input
                      type="text"
                      value={novoFornecedorForm.inscricaoEstadual}
                      onChange={(e) => setNovoFornecedorForm({...novoFornecedorForm, inscricaoEstadual: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
                      placeholder="000.000.000.000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Categoria *</label>
                    <select
                      value={novoFornecedorForm.categoria}
                      onChange={(e) => setNovoFornecedorForm({...novoFornecedorForm, categoria: e.target.value as CategoriaFornecedor})}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-purple-500"
                    >
                      <option value="Materiais Odontológicos">Materiais Odontológicos</option>
                      <option value="Materiais Veterinários">Materiais Veterinários</option>
                      <option value="Medicamentos">Medicamentos</option>
                      <option value="Equipamentos">Equipamentos</option>
                      <option value="Alimentos e Rações">Alimentos e Rações</option>
                      <option value="Materiais de Escritório">Materiais de Escritório</option>
                      <option value="Limpeza e Higiene">Limpeza e Higiene</option>
                      <option value="Serviços">Serviços</option>
                      <option value="Tecnologia">Tecnologia</option>
                      <option value="Outros">Outros</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Contato */}
              <div>
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Phone className="w-5 h-5 text-purple-400" />
                  Informações de Contato
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Telefone *</label>
                    <input
                      type="text"
                      value={novoFornecedorForm.telefone}
                      onChange={(e) => setNovoFornecedorForm({...novoFornecedorForm, telefone: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
                      placeholder="(00) 0000-0000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Celular</label>
                    <input
                      type="text"
                      value={novoFornecedorForm.celular}
                      onChange={(e) => setNovoFornecedorForm({...novoFornecedorForm, celular: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">E-mail *</label>
                    <input
                      type="email"
                      value={novoFornecedorForm.email}
                      onChange={(e) => setNovoFornecedorForm({...novoFornecedorForm, email: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
                      placeholder="contato@fornecedor.com.br"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Site</label>
                    <input
                      type="text"
                      value={novoFornecedorForm.site}
                      onChange={(e) => setNovoFornecedorForm({...novoFornecedorForm, site: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
                      placeholder="www.fornecedor.com.br"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Nome do Contato</label>
                    <input
                      type="text"
                      value={novoFornecedorForm.contato}
                      onChange={(e) => setNovoFornecedorForm({...novoFornecedorForm, contato: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
                      placeholder="Nome do responsável"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Cargo do Contato</label>
                    <input
                      type="text"
                      value={novoFornecedorForm.cargoContato}
                      onChange={(e) => setNovoFornecedorForm({...novoFornecedorForm, cargoContato: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
                      placeholder="Gerente Comercial"
                    />
                  </div>
                </div>
              </div>

              {/* Endereço */}
              <div>
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-purple-400" />
                  Endereço
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-300 mb-2">Endereço</label>
                    <input
                      type="text"
                      value={novoFornecedorForm.endereco}
                      onChange={(e) => setNovoFornecedorForm({...novoFornecedorForm, endereco: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
                      placeholder="Rua, Avenida, etc"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Número</label>
                    <input
                      type="text"
                      value={novoFornecedorForm.numero}
                      onChange={(e) => setNovoFornecedorForm({...novoFornecedorForm, numero: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
                      placeholder="123"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Complemento</label>
                    <input
                      type="text"
                      value={novoFornecedorForm.complemento}
                      onChange={(e) => setNovoFornecedorForm({...novoFornecedorForm, complemento: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
                      placeholder="Sala, Andar"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Bairro</label>
                    <input
                      type="text"
                      value={novoFornecedorForm.bairro}
                      onChange={(e) => setNovoFornecedorForm({...novoFornecedorForm, bairro: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
                      placeholder="Centro"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Cidade *</label>
                    <input
                      type="text"
                      value={novoFornecedorForm.cidade}
                      onChange={(e) => setNovoFornecedorForm({...novoFornecedorForm, cidade: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
                      placeholder="São Paulo"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Estado *</label>
                    <select
                      value={novoFornecedorForm.estado}
                      onChange={(e) => setNovoFornecedorForm({...novoFornecedorForm, estado: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-purple-500"
                    >
                      <option value="">Selecione</option>
                      <option value="SP">SP</option>
                      <option value="RJ">RJ</option>
                      <option value="MG">MG</option>
                      <option value="RS">RS</option>
                      <option value="SC">SC</option>
                      <option value="PR">PR</option>
                      <option value="BA">BA</option>
                      <option value="PE">PE</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">CEP</label>
                    <input
                      type="text"
                      value={novoFornecedorForm.cep}
                      onChange={(e) => setNovoFornecedorForm({...novoFornecedorForm, cep: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
                      placeholder="00000-000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Prazo de Entrega (dias)</label>
                    <input
                      type="number"
                      value={novoFornecedorForm.prazoEntrega}
                      onChange={(e) => setNovoFornecedorForm({...novoFornecedorForm, prazoEntrega: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
                      placeholder="7"
                    />
                  </div>
                </div>
              </div>

              {/* Observações */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Observações</label>
                <textarea
                  value={novoFornecedorForm.observacoes}
                  onChange={(e) => setNovoFornecedorForm({...novoFornecedorForm, observacoes: e.target.value})}
                  rows={4}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 resize-none"
                  placeholder="Informações adicionais sobre o fornecedor..."
                />
              </div>
            </div>

            {/* Footer do Modal */}
            <div className="p-6 border-t border-slate-700 sticky bottom-0 bg-slate-800 flex gap-3">
              <button
                onClick={() => setMostrarModalNovo(false)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  console.log('Salvando fornecedor:', novoFornecedorForm)
                  setMostrarModalNovo(false)
                  // Aqui você adicionaria a lógica para salvar o fornecedor
                }}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Cadastrar Fornecedor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detalhes */}
      {mostrarModal && fornecedorSelecionado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-700">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">Detalhes do Fornecedor</h2>
                <button
                  onClick={() => setMostrarModal(false)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <p className="text-slate-400 text-sm">Nome Fantasia</p>
                  <p className="text-white font-medium text-lg mt-1">{fornecedorSelecionado.nomeFantasia}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-slate-400 text-sm">Razão Social</p>
                  <p className="text-white font-medium mt-1">{fornecedorSelecionado.razaoSocial}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">CNPJ</p>
                  <p className="text-white font-medium mt-1">{fornecedorSelecionado.cnpj}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Status</p>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border mt-1 ${getStatusColor(fornecedorSelecionado.status)}`}>
                    {fornecedorSelecionado.status}
                  </span>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Categoria</p>
                  <p className="text-white font-medium mt-1">{fornecedorSelecionado.categoria}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Avaliação</p>
                  <div className="mt-1">
                    {renderStars(fornecedorSelecionado.avaliacao)}
                  </div>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Telefone</p>
                  <p className="text-white font-medium mt-1">{fornecedorSelecionado.telefone}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Email</p>
                  <p className="text-white font-medium mt-1">{fornecedorSelecionado.email}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Localização</p>
                  <p className="text-white font-medium mt-1">
                    {fornecedorSelecionado.cidade}/{fornecedorSelecionado.estado}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Prazo de Entrega</p>
                  <p className="text-white font-medium mt-1">{fornecedorSelecionado.prazoEntrega} dias</p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Última Compra</p>
                  <p className="text-white font-medium mt-1">
                    {new Date(fornecedorSelecionado.ultimaCompra).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Total Comprado</p>
                  <p className="text-white font-medium mt-1">
                    R$ {fornecedorSelecionado.totalComprado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                {fornecedorSelecionado.observacoes && (
                  <div className="col-span-2">
                    <p className="text-slate-400 text-sm">Observações</p>
                    <p className="text-white font-medium mt-1">{fornecedorSelecionado.observacoes}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-lg transition-colors">
                  Editar Fornecedor
                </button>
                <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg transition-colors">
                  Histórico de Compras
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

import { useState } from 'react'
import { 
  StickyNote,
  CheckSquare,
  Bell,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Star,
  Clock,
  AlertCircle,
  Calendar,
  Tag,
  Pin
} from 'lucide-react'

type TipoItem = 'anotacao' | 'tarefa' | 'lembrete'
type PrioridadeItem = 'Alta' | 'Média' | 'Baixa'
type StatusTarefa = 'Pendente' | 'Em Andamento' | 'Concluída' | 'Cancelada'

interface ItemBase {
  id: string
  tipo: TipoItem
  titulo: string
  descricao: string
  categoria: string
  cor: string
  fixado: boolean
  favorito: boolean
  dataCriacao: string
  dataAtualizacao: string
}

interface Anotacao extends ItemBase {
  tipo: 'anotacao'
}

interface Tarefa extends ItemBase {
  tipo: 'tarefa'
  status: StatusTarefa
  prioridade: PrioridadeItem
  dataVencimento?: string
  responsavel?: string
  progresso: number
  subtarefas?: { id: string; texto: string; concluida: boolean }[]
}

interface Lembrete extends ItemBase {
  tipo: 'lembrete'
  dataLembrete: string
  horaLembrete: string
  repetir: 'Nunca' | 'Diariamente' | 'Semanalmente' | 'Mensalmente'
  notificado: boolean
}

type Item = Anotacao | Tarefa | Lembrete

export default function Anotacoes() {
  const [abaAtiva, setAbaAtiva] = useState<TipoItem>('anotacao')
  const [searchTerm, setSearchTerm] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState<string>('Todas')
  const [filtroPrioridade, setFiltroPrioridade] = useState<PrioridadeItem | 'Todas'>('Todas')
  const [mostrarFiltros, setMostrarFiltros] = useState(false)
  const [visualizacao, setVisualizacao] = useState<'grid' | 'lista'>('grid')
  const [mostrarModal, setMostrarModal] = useState(false)
  const [itemEditando, setItemEditando] = useState<Item | null>(null)
  const [items, setItems] = useState<Item[]>([
    // Dados iniciais aqui
  ])

  // Estados do formulário
  const [novoItem, setNovoItem] = useState<Partial<Item>>({
    tipo: 'anotacao',
    titulo: '',
    descricao: '',
    categoria: 'Geral',
    cor: 'blue',
    fixado: false,
    favorito: false
  })

  // Inicializar items com dados simulados se estiver vazio
  if (items.length === 0) {
    setItems(dadosIniciais)
  }

  // Funções CRUD
  const criarItem = () => {
    if (!novoItem.titulo?.trim()) {
      alert('Por favor, preencha o título')
      return
    }

    const agora = new Date().toISOString().split('T')[0]
    const itemCompleto: Item = {
      ...novoItem,
      id: Date.now().toString(),
      dataCriacao: agora,
      dataAtualizacao: agora
    } as Item

    setItems([itemCompleto, ...items])
    setMostrarModal(false)
    resetFormulario()
  }

  const editarItem = (item: Item) => {
    setItemEditando(item)
    setNovoItem(item)
    setMostrarModal(true)
  }

  const atualizarItem = () => {
    if (!novoItem.titulo?.trim()) {
      alert('Por favor, preencha o título')
      return
    }

    const itemAtualizado = {
      ...novoItem,
      dataAtualizacao: new Date().toISOString().split('T')[0]
    } as Item

    setItems(items.map(i => i.id === itemAtualizado.id ? itemAtualizado : i))
    setMostrarModal(false)
    resetFormulario()
  }

  const excluirItem = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este item?')) {
      setItems(items.filter(i => i.id !== id))
    }
  }

  const toggleFixado = (id: string) => {
    setItems(items.map(i => i.id === id ? { ...i, fixado: !i.fixado } : i))
  }

  const toggleFavorito = (id: string) => {
    setItems(items.map(i => i.id === id ? { ...i, favorito: !i.favorito } : i))
  }

  const resetFormulario = () => {
    setNovoItem({
      tipo: abaAtiva,
      titulo: '',
      descricao: '',
      categoria: 'Geral',
      cor: 'blue',
      fixado: false,
      favorito: false
    })
    setItemEditando(null)
  }

  const abrirModal = () => {
    resetFormulario()
    setMostrarModal(true)
  }

  // Dados simulados
  const dadosIniciais: Item[] = [
    // ANOTAÇÕES
    {
      id: '1',
      tipo: 'anotacao',
      titulo: 'Ideias para Nova Campanha',
      descricao: 'Pensar em campanhas para o verão:\n- Promoção de férias\n- Desconto para novos clientes\n- Parceria com influencers',
      categoria: 'Marketing',
      cor: 'purple',
      fixado: true,
      favorito: true,
      dataCriacao: '2024-01-15',
      dataAtualizacao: '2024-01-20'
    },
    {
      id: '2',
      tipo: 'anotacao',
      titulo: 'Reunião com Cliente',
      descricao: 'Pontos discutidos:\n- Orçamento aprovado\n- Prazo de entrega: 30 dias\n- Pagamento: 50% entrada',
      categoria: 'Vendas',
      cor: 'green',
      fixado: false,
      favorito: false,
      dataCriacao: '2024-01-18',
      dataAtualizacao: '2024-01-18'
    },
    {
      id: '3',
      tipo: 'anotacao',
      titulo: 'Senha WiFi Escritório',
      descricao: 'Rede: Nexus_CRM\nSenha: @Nexus2024!',
      categoria: 'Geral',
      cor: 'blue',
      fixado: true,
      favorito: false,
      dataCriacao: '2024-01-10',
      dataAtualizacao: '2024-01-10'
    },
    // TAREFAS
    {
      id: '4',
      tipo: 'tarefa',
      titulo: 'Enviar Proposta para Cliente XYZ',
      descricao: 'Preparar proposta completa com valores e prazos',
      categoria: 'Vendas',
      cor: 'green',
      fixado: false,
      favorito: true,
      dataCriacao: '2024-01-22',
      dataAtualizacao: '2024-01-23',
      status: 'Em Andamento',
      prioridade: 'Alta',
      dataVencimento: '2024-02-05',
      responsavel: 'Carlos Silva',
      progresso: 60,
      subtarefas: [
        { id: '4-1', texto: 'Levantar custos', concluida: true },
        { id: '4-2', texto: 'Criar apresentação', concluida: true },
        { id: '4-3', texto: 'Revisar valores', concluida: false },
        { id: '4-4', texto: 'Enviar por email', concluida: false }
      ]
    },
    {
      id: '5',
      tipo: 'tarefa',
      titulo: 'Atualizar Base de Dados',
      descricao: 'Limpar e atualizar cadastros de clientes inativos',
      categoria: 'Administrativo',
      cor: 'blue',
      fixado: false,
      favorito: false,
      dataCriacao: '2024-01-20',
      dataAtualizacao: '2024-01-25',
      status: 'Pendente',
      prioridade: 'Média',
      dataVencimento: '2024-02-10',
      responsavel: 'Ana Paula',
      progresso: 0
    },
    {
      id: '6',
      tipo: 'tarefa',
      titulo: 'Preparar Relatório Mensal',
      descricao: 'Consolidar métricas de vendas e marketing',
      categoria: 'Relatórios',
      cor: 'yellow',
      fixado: false,
      favorito: false,
      dataCriacao: '2024-01-28',
      dataAtualizacao: '2024-01-28',
      status: 'Pendente',
      prioridade: 'Alta',
      dataVencimento: '2024-02-01',
      responsavel: 'João Oliveira',
      progresso: 0
    },
    {
      id: '7',
      tipo: 'tarefa',
      titulo: 'Comprar Material de Escritório',
      descricao: 'Papel A4, canetas, pastas, grampeador',
      categoria: 'Geral',
      cor: 'gray',
      fixado: false,
      favorito: false,
      dataCriacao: '2024-01-15',
      dataAtualizacao: '2024-01-20',
      status: 'Concluída',
      prioridade: 'Baixa',
      dataVencimento: '2024-01-25',
      responsavel: 'Maria Santos',
      progresso: 100
    },
    // LEMBRETES
    {
      id: '8',
      tipo: 'lembrete',
      titulo: 'Reunião de Equipe',
      descricao: 'Reunião semanal para alinhamento de metas',
      categoria: 'Reuniões',
      cor: 'red',
      fixado: true,
      favorito: false,
      dataCriacao: '2024-01-10',
      dataAtualizacao: '2024-01-10',
      dataLembrete: '2024-02-05',
      horaLembrete: '14:00',
      repetir: 'Semanalmente',
      notificado: false
    },
    {
      id: '9',
      tipo: 'lembrete',
      titulo: 'Pagar Fornecedor',
      descricao: 'Nota fiscal #12345 - R$ 5.000,00',
      categoria: 'Financeiro',
      cor: 'yellow',
      fixado: false,
      favorito: true,
      dataCriacao: '2024-01-25',
      dataAtualizacao: '2024-01-25',
      dataLembrete: '2024-02-03',
      horaLembrete: '09:00',
      repetir: 'Nunca',
      notificado: false
    },
    {
      id: '10',
      tipo: 'lembrete',
      titulo: 'Ligar para Cliente ABC',
      descricao: 'Follow-up da proposta enviada na semana passada',
      categoria: 'Vendas',
      cor: 'green',
      fixado: false,
      favorito: false,
      dataCriacao: '2024-01-28',
      dataAtualizacao: '2024-01-28',
      dataLembrete: '2024-02-02',
      horaLembrete: '10:30',
      repetir: 'Nunca',
      notificado: false
    }
  ]

  // Filtrar itens
  const itemsFiltrados = items.filter((item) => {
    const matchTipo = item.tipo === abaAtiva
    const matchSearch = item.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.descricao.toLowerCase().includes(searchTerm.toLowerCase())
    const matchCategoria = filtroCategoria === 'Todas' || item.categoria === filtroCategoria
    const matchPrioridade = item.tipo !== 'tarefa' || filtroPrioridade === 'Todas' || 
      (item as Tarefa).prioridade === filtroPrioridade
    
    return matchTipo && matchSearch && matchCategoria && matchPrioridade
  })

  // Estatísticas
  const totalAnotacoes = items.filter(i => i.tipo === 'anotacao').length
  const totalTarefas = items.filter(i => i.tipo === 'tarefa').length
  const tarefasPendentes = items.filter(i => i.tipo === 'tarefa' && (i as Tarefa).status !== 'Concluída').length
  const totalLembretes = items.filter(i => i.tipo === 'lembrete').length
  const lembretesHoje = items.filter(i => {
    if (i.tipo !== 'lembrete') return false
    const hoje = new Date().toISOString().split('T')[0]
    return (i as Lembrete).dataLembrete === hoje
  }).length

  const categorias = ['Todas', ...Array.from(new Set(items.map(i => i.categoria)))]

  const getCor = (cor: string) => {
    const cores: Record<string, string> = {
      purple: 'bg-purple-500/10 border-purple-500/20',
      green: 'bg-green-500/10 border-green-500/20',
      blue: 'bg-blue-500/10 border-blue-500/20',
      yellow: 'bg-yellow-500/10 border-yellow-500/20',
      red: 'bg-red-500/10 border-red-500/20',
      gray: 'bg-gray-500/10 border-gray-500/20'
    }
    return cores[cor] || cores.gray
  }

  const getCorTexto = (cor: string) => {
    const cores: Record<string, string> = {
      purple: 'text-purple-400',
      green: 'text-green-400',
      blue: 'text-blue-400',
      yellow: 'text-yellow-400',
      red: 'text-red-400',
      gray: 'text-gray-400'
    }
    return cores[cor] || cores.gray
  }

  const getPrioridadeCor = (prioridade: PrioridadeItem) => {
    switch (prioridade) {
      case 'Alta': return 'bg-red-500/10 text-red-400 border-red-500/20'
      case 'Média': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
      case 'Baixa': return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20'
    }
  }

  const getStatusCor = (status: StatusTarefa) => {
    switch (status) {
      case 'Concluída': return 'bg-green-500/10 text-green-400 border-green-500/20'
      case 'Em Andamento': return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
      case 'Pendente': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
      case 'Cancelada': return 'bg-red-500/10 text-red-400 border-red-500/20'
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20'
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <StickyNote className="w-8 h-8 text-green-400" />
            Anotações, Tarefas & Lembretes
          </h1>
          <p className="text-slate-400 mt-1">Organize suas ideias e compromissos</p>
        </div>
        <button 
          onClick={abrirModal}
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Novo
        </button>
      </div>

      {/* Abas */}
      <div className="flex gap-2 bg-slate-800 border border-slate-700 rounded-lg p-1">
        <button
          onClick={() => setAbaAtiva('anotacao')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
            abaAtiva === 'anotacao'
              ? 'bg-green-600 text-white shadow-lg'
              : 'text-slate-400 hover:text-white hover:bg-slate-700'
          }`}
        >
          <StickyNote className="w-4 h-4" />
          Anotações ({totalAnotacoes})
        </button>
        <button
          onClick={() => setAbaAtiva('tarefa')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
            abaAtiva === 'tarefa'
              ? 'bg-green-600 text-white shadow-lg'
              : 'text-slate-400 hover:text-white hover:bg-slate-700'
          }`}
        >
          <CheckSquare className="w-4 h-4" />
          Tarefas ({tarefasPendentes}/{totalTarefas})
        </button>
        <button
          onClick={() => setAbaAtiva('lembrete')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
            abaAtiva === 'lembrete'
              ? 'bg-green-600 text-white shadow-lg'
              : 'text-slate-400 hover:text-white hover:bg-slate-700'
          }`}
        >
          <Bell className="w-4 h-4" />
          Lembretes ({lembretesHoje})
          {lembretesHoje > 0 && (
            <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {lembretesHoje}
            </span>
          )}
        </button>
      </div>

      {/* KPIs rápidos */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-xs">Total Itens</p>
              <p className="text-xl font-bold text-white mt-1">{items.length}</p>
            </div>
            <StickyNote className="w-8 h-8 text-purple-400" />
          </div>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-xs">Fixados</p>
              <p className="text-xl font-bold text-white mt-1">{items.filter(i => i.fixado).length}</p>
            </div>
            <Pin className="w-8 h-8 text-blue-400" />
          </div>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-xs">Favoritos</p>
              <p className="text-xl font-bold text-white mt-1">{items.filter(i => i.favorito).length}</p>
            </div>
            <Star className="w-8 h-8 text-yellow-400" />
          </div>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-xs">Categorias</p>
              <p className="text-xl font-bold text-white mt-1">{categorias.length - 1}</p>
            </div>
            <Tag className="w-8 h-8 text-green-400" />
          </div>
        </div>
      </div>

      {/* Barra de Ferramentas */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-green-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setMostrarFiltros(!mostrarFiltros)}
              className="bg-slate-900 border border-slate-700 hover:border-green-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Filter className="w-4 h-4" />
              Filtros
            </button>
            <div className="flex bg-slate-900 border border-slate-700 rounded-lg p-1">
              <button
                onClick={() => setVisualizacao('grid')}
                className={`px-3 py-1 rounded ${visualizacao === 'grid' ? 'bg-green-600 text-white' : 'text-slate-400'}`}
              >
                Grid
              </button>
              <button
                onClick={() => setVisualizacao('lista')}
                className={`px-3 py-1 rounded ${visualizacao === 'lista' ? 'bg-green-600 text-white' : 'text-slate-400'}`}
              >
                Lista
              </button>
            </div>
          </div>
        </div>

        {mostrarFiltros && (
          <div className="mt-4 pt-4 border-t border-slate-700">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Categoria</label>
                <select
                  value={filtroCategoria}
                  onChange={(e) => setFiltroCategoria(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-green-500"
                >
                  {categorias.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              {abaAtiva === 'tarefa' && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Prioridade</label>
                  <select
                    value={filtroPrioridade}
                    onChange={(e) => setFiltroPrioridade(e.target.value as PrioridadeItem | 'Todas')}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-green-500"
                  >
                    <option value="Todas">Todas</option>
                    <option value="Alta">Alta</option>
                    <option value="Média">Média</option>
                    <option value="Baixa">Baixa</option>
                  </select>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Grid/Lista de Itens */}
      <div className={visualizacao === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-4'}>
        {itemsFiltrados.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <p className="text-slate-400">Nenhum item encontrado</p>
          </div>
        ) : (
          itemsFiltrados.map((item) => (
            <div
              key={item.id}
              className={`bg-slate-800 border-2 ${getCor(item.cor)} rounded-lg p-4 hover:shadow-lg transition-all`}
            >
              {/* Cabeçalho do Card */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  {item.fixado && <Pin className="w-4 h-4 text-blue-400" />}
                  {item.favorito && <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />}
                  <h3 className="text-white font-semibold">{item.titulo}</h3>
                </div>
                <div className="flex gap-1">
                  <button className="text-slate-400 hover:text-white p-1" title="Editar">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button className="text-slate-400 hover:text-red-400 p-1" title="Excluir">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Conteúdo específico por tipo */}
              {item.tipo === 'anotacao' && (
                <p className="text-slate-300 text-sm mb-3 whitespace-pre-wrap line-clamp-4">
                  {item.descricao}
                </p>
              )}

              {item.tipo === 'tarefa' && (
                <>
                  <p className="text-slate-300 text-sm mb-3 line-clamp-2">{item.descricao}</p>
                  <div className="space-y-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded border ${getPrioridadeCor((item as Tarefa).prioridade)}`}>
                        {(item as Tarefa).prioridade}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded border ${getStatusCor((item as Tarefa).status)}`}>
                        {(item as Tarefa).status}
                      </span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full transition-all"
                        style={{ width: `${(item as Tarefa).progresso}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-400">Progresso: {(item as Tarefa).progresso}%</p>
                  </div>
                  {(item as Tarefa).subtarefas && (
                    <div className="space-y-1 mb-3">
                      {(item as Tarefa).subtarefas?.map((sub) => (
                        <div key={sub.id} className="flex items-center gap-2 text-xs text-slate-400">
                          <input
                            type="checkbox"
                            checked={sub.concluida}
                            readOnly
                            className="rounded"
                          />
                          <span className={sub.concluida ? 'line-through' : ''}>{sub.texto}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {(item as Tarefa).dataVencimento && (
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-2">
                      <Calendar className="w-3 h-3" />
                      Vence em: {new Date((item as Tarefa).dataVencimento!).toLocaleDateString('pt-BR')}
                    </div>
                  )}
                  {(item as Tarefa).responsavel && (
                    <p className="text-xs text-slate-400 mt-1">
                      Responsável: {(item as Tarefa).responsavel}
                    </p>
                  )}
                </>
              )}

              {item.tipo === 'lembrete' && (
                <>
                  <p className="text-slate-300 text-sm mb-3">{item.descricao}</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <Calendar className="w-4 h-4" />
                      {new Date((item as Lembrete).dataLembrete).toLocaleDateString('pt-BR')}
                      <Clock className="w-4 h-4 ml-2" />
                      {(item as Lembrete).horaLembrete}
                    </div>
                    {(item as Lembrete).repetir !== 'Nunca' && (
                      <div className="flex items-center gap-2 text-xs text-purple-400">
                        <AlertCircle className="w-3 h-3" />
                        Repetir: {(item as Lembrete).repetir}
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Rodapé do Card */}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-700">
                <span className={`text-xs px-2 py-1 rounded ${getCorTexto(item.cor)}`}>
                  <Tag className="w-3 h-3 inline mr-1" />
                  {item.categoria}
                </span>
                <span className="text-xs text-slate-500">
                  {new Date(item.dataAtualizacao).toLocaleDateString('pt-BR')}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

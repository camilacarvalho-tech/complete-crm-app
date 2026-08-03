import { useState } from 'react'
import { 
  Shield, 
  Eye, 
  Clock, 
  AlertTriangle,
  Activity,
  Search,
  Filter,
  Download,
  User,
  FileText,
  Trash2,
  Edit,
  Plus,
  LogIn,
  LogOut,
  Monitor,
  Smartphone
} from 'lucide-react'

type TipoAcao = 
  | 'Login'
  | 'Logout'
  | 'Criar'
  | 'Editar'
  | 'Excluir'
  | 'Visualizar'
  | 'Exportar'
  | 'Upload'
  | 'Download'

type NivelSeveridade = 'Info' | 'Aviso' | 'Erro' | 'Crítico'

interface LogAuditoria {
  id: string
  usuario: string
  acao: TipoAcao
  modulo: string
  descricao: string
  dataHora: string
  ip: string
  dispositivo: string
  severidade: NivelSeveridade
  detalhes?: string
}

export default function LogsERP() {
  const [searchTerm, setSearchTerm] = useState('')
  const [filtroAcao, setFiltroAcao] = useState<TipoAcao | 'Todos'>('Todos')
  const [filtroSeveridade, setFiltroSeveridade] = useState<NivelSeveridade | 'Todos'>('Todos')
  const [mostrarFiltros, setMostrarFiltros] = useState(false)
  const [mostrarDetalhes, setMostrarDetalhes] = useState(false)
  const [logSelecionado, setLogSelecionado] = useState<LogAuditoria | null>(null)

  // Dados simulados
  const logs: LogAuditoria[] = [
    {
      id: '1',
      usuario: 'Dr. Carlos Silva',
      acao: 'Login',
      modulo: 'Sistema',
      descricao: 'Login realizado com sucesso',
      dataHora: '2024-02-01T09:15:23',
      ip: '192.168.1.45',
      dispositivo: 'Desktop - Windows',
      severidade: 'Info'
    },
    {
      id: '2',
      usuario: 'Dra. Ana Paula',
      acao: 'Criar',
      modulo: 'Clientes',
      descricao: 'Novo cliente cadastrado: João Pedro Santos',
      dataHora: '2024-02-01T09:45:12',
      ip: '192.168.1.52',
      dispositivo: 'Desktop - Windows',
      severidade: 'Info',
      detalhes: 'Cliente ID: 3248, CPF: 123.456.789-00'
    },
    {
      id: '3',
      usuario: 'Maria Santos',
      acao: 'Editar',
      modulo: 'Vendas',
      descricao: 'Venda #VND-245 alterada',
      dataHora: '2024-02-01T10:12:45',
      ip: '192.168.1.38',
      dispositivo: 'Tablet - Android',
      severidade: 'Info',
      detalhes: 'Valor alterado de R$ 500,00 para R$ 550,00'
    },
    {
      id: '4',
      usuario: 'Admin Sistema',
      acao: 'Excluir',
      modulo: 'Produtos',
      descricao: 'Produto removido do estoque',
      dataHora: '2024-02-01T10:30:18',
      ip: '192.168.1.45',
      dispositivo: 'Desktop - Windows',
      severidade: 'Aviso',
      detalhes: 'Produto: Teclado Mecânico RGB - ID: 789'
    },
    {
      id: '5',
      usuario: 'Pedro Costa',
      acao: 'Exportar',
      modulo: 'Relatórios',
      descricao: 'Relatório de vendas exportado',
      dataHora: '2024-02-01T11:05:33',
      ip: '192.168.1.67',
      dispositivo: 'Smartphone - iOS',
      severidade: 'Info',
      detalhes: 'Formato: Excel, Período: Janeiro/2024'
    },
    {
      id: '6',
      usuario: 'Sistema',
      acao: 'Criar',
      modulo: 'Backup',
      descricao: 'Backup automático executado',
      dataHora: '2024-02-01T02:00:00',
      ip: 'Sistema',
      dispositivo: 'Servidor',
      severidade: 'Info',
      detalhes: 'Tamanho: 2.5GB, Status: Sucesso'
    },
    {
      id: '7',
      usuario: 'Dra. Ana Paula',
      acao: 'Upload',
      modulo: 'Documentos',
      descricao: 'Documento enviado: Contrato_Cliente_2024.pdf',
      dataHora: '2024-02-01T13:22:15',
      ip: '192.168.1.52',
      dispositivo: 'Desktop - Windows',
      severidade: 'Info',
      detalhes: 'Tamanho: 3.2MB, Categoria: Contratos'
    },
    {
      id: '8',
      usuario: 'Usuário Desconhecido',
      acao: 'Login',
      modulo: 'Sistema',
      descricao: 'Tentativa de login falhou',
      dataHora: '2024-02-01T14:10:45',
      ip: '203.45.78.122',
      dispositivo: 'Desconhecido',
      severidade: 'Erro',
      detalhes: 'Usuário/senha incorretos - 3ª tentativa'
    },
    {
      id: '9',
      usuario: 'Dr. Carlos Silva',
      acao: 'Visualizar',
      modulo: 'Financeiro',
      descricao: 'Relatório DRE acessado',
      dataHora: '2024-02-01T15:45:30',
      ip: '192.168.1.45',
      dispositivo: 'Desktop - Windows',
      severidade: 'Info'
    },
    {
      id: '10',
      usuario: 'Sistema',
      acao: 'Criar',
      modulo: 'Sistema',
      descricao: 'Erro crítico: Falha na conexão com banco de dados',
      dataHora: '2024-02-01T16:05:12',
      ip: 'Sistema',
      dispositivo: 'Servidor',
      severidade: 'Crítico',
      detalhes: 'Tentativas de reconexão: 5, Duração: 3min'
    }
  ]

  // Filtros
  const logsFiltrados = logs.filter((log) => {
    const matchSearch = 
      log.usuario.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.modulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.descricao.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchAcao = filtroAcao === 'Todos' || log.acao === filtroAcao
    const matchSeveridade = filtroSeveridade === 'Todos' || log.severidade === filtroSeveridade

    return matchSearch && matchAcao && matchSeveridade
  })

  // KPIs
  const totalAcoesHoje = logs.length
  const acessos = logs.filter(l => l.acao === 'Login').length
  const alertas = logs.filter(l => l.severidade === 'Aviso' || l.severidade === 'Erro' || l.severidade === 'Crítico').length
  const tempoMedio = '2.3s' // Simulado

  const getSeveridadeColor = (severidade: NivelSeveridade) => {
    switch (severidade) {
      case 'Info': return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
      case 'Aviso': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
      case 'Erro': return 'bg-orange-500/10 text-orange-400 border-orange-500/20'
      case 'Crítico': return 'bg-red-500/10 text-red-400 border-red-500/20'
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20'
    }
  }

  const getAcaoIcone = (acao: TipoAcao) => {
    switch (acao) {
      case 'Login': return <LogIn className="w-4 h-4" />
      case 'Logout': return <LogOut className="w-4 h-4" />
      case 'Criar': return <Plus className="w-4 h-4" />
      case 'Editar': return <Edit className="w-4 h-4" />
      case 'Excluir': return <Trash2 className="w-4 h-4" />
      case 'Visualizar': return <Eye className="w-4 h-4" />
      case 'Exportar': return <Download className="w-4 h-4" />
      case 'Upload': return <FileText className="w-4 h-4" />
      case 'Download': return <Download className="w-4 h-4" />
      default: return <Activity className="w-4 h-4" />
    }
  }

  const getDispositivoIcone = (dispositivo: string) => {
    if (dispositivo.includes('Desktop')) return <Monitor className="w-4 h-4" />
    if (dispositivo.includes('Smartphone') || dispositivo.includes('Tablet')) return <Smartphone className="w-4 h-4" />
    return <Activity className="w-4 h-4" />
  }

  return (
    <div className="p-6 space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Shield className="w-8 h-8 text-purple-400" />
            Logs e Monitoramento
          </h1>
          <p className="text-slate-400 mt-1">Rastreabilidade completa de ações e alterações no sistema</p>
        </div>
        <button className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-colors">
          <Download className="w-5 h-5" />
          Exportar Logs
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Ações Hoje</p>
              <p className="text-2xl font-bold text-white mt-1">{totalAcoesHoje.toLocaleString('pt-BR')}</p>
            </div>
            <div className="bg-purple-500/10 p-3 rounded-lg">
              <Activity className="w-6 h-6 text-purple-400" />
            </div>
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Acessos</p>
              <p className="text-2xl font-bold text-white mt-1">{acessos}</p>
            </div>
            <div className="bg-blue-500/10 p-3 rounded-lg">
              <Eye className="w-6 h-6 text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Alertas</p>
              <p className="text-2xl font-bold text-white mt-1">{alertas}</p>
            </div>
            <div className="bg-yellow-500/10 p-3 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-yellow-400" />
            </div>
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Tempo Médio</p>
              <p className="text-2xl font-bold text-white mt-1">{tempoMedio}</p>
            </div>
            <div className="bg-green-500/10 p-3 rounded-lg">
              <Clock className="w-6 h-6 text-green-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Alerta de eventos críticos */}
      {logs.some(l => l.severidade === 'Crítico') && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-400 font-medium">Atenção: Eventos Críticos Detectados</p>
            <p className="text-red-400/80 text-sm mt-1">
              {logs.filter(l => l.severidade === 'Crítico').length} evento(s) crítico(s) necessitam de atenção imediata
            </p>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por usuário, módulo ou descrição..."
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
                <label className="block text-sm font-medium text-slate-300 mb-2">Tipo de Ação</label>
                <select
                  value={filtroAcao}
                  onChange={(e) => setFiltroAcao(e.target.value as TipoAcao | 'Todos')}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="Todos">Todas</option>
                  <option value="Login">Login</option>
                  <option value="Logout">Logout</option>
                  <option value="Criar">Criar</option>
                  <option value="Editar">Editar</option>
                  <option value="Excluir">Excluir</option>
                  <option value="Visualizar">Visualizar</option>
                  <option value="Exportar">Exportar</option>
                  <option value="Upload">Upload</option>
                  <option value="Download">Download</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Severidade</label>
                <select
                  value={filtroSeveridade}
                  onChange={(e) => setFiltroSeveridade(e.target.value as NivelSeveridade | 'Todos')}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="Todos">Todas</option>
                  <option value="Info">Info</option>
                  <option value="Aviso">Aviso</option>
                  <option value="Erro">Erro</option>
                  <option value="Crítico">Crítico</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tabela de Logs */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-900 border-b border-slate-700">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Data/Hora</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Usuário</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Ação</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Módulo</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Descrição</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">IP/Dispositivo</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Severidade</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {logsFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                    Nenhum log encontrado
                  </td>
                </tr>
              ) : (
                logsFiltrados.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-700/50 transition-colors">
                    <td className="px-6 py-4 text-slate-300 font-mono text-xs">
                      {new Date(log.dataHora).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-slate-400" />
                        <span className="text-white font-medium">{log.usuario}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-300">
                        {getAcaoIcone(log.acao)}
                        <span>{log.acao}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-300">{log.modulo}</td>
                    <td className="px-6 py-4 text-slate-300">{log.descricao}</td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-slate-400 text-xs">
                          <span className="font-mono">{log.ip}</span>
                        </div>
                        <div className="flex items-center gap-1 text-slate-400 text-xs">
                          {getDispositivoIcone(log.dispositivo)}
                          <span>{log.dispositivo}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getSeveridadeColor(log.severidade)}`}>
                        {log.severidade}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => {
                          setLogSelecionado(log)
                          setMostrarDetalhes(true)
                        }}
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

      {/* Modal Detalhes */}
      {mostrarDetalhes && logSelecionado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-lg max-w-2xl w-full">
            <div className="p-6 border-b border-slate-700">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">Detalhes do Log</h2>
                <button
                  onClick={() => setMostrarDetalhes(false)}
                  className="text-slate-400 hover:text-white transition-colors text-2xl"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-slate-400 text-sm">Data e Hora</p>
                  <p className="text-white font-medium mt-1 font-mono">
                    {new Date(logSelecionado.dataHora).toLocaleString('pt-BR')}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Severidade</p>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border mt-1 ${getSeveridadeColor(logSelecionado.severidade)}`}>
                    {logSelecionado.severidade}
                  </span>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Usuário</p>
                  <p className="text-white font-medium mt-1">{logSelecionado.usuario}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Ação</p>
                  <div className="flex items-center gap-2 text-white font-medium mt-1">
                    {getAcaoIcone(logSelecionado.acao)}
                    <span>{logSelecionado.acao}</span>
                  </div>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Módulo</p>
                  <p className="text-white font-medium mt-1">{logSelecionado.modulo}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Endereço IP</p>
                  <p className="text-white font-medium mt-1 font-mono">{logSelecionado.ip}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-slate-400 text-sm">Dispositivo</p>
                  <div className="flex items-center gap-2 text-white font-medium mt-1">
                    {getDispositivoIcone(logSelecionado.dispositivo)}
                    <span>{logSelecionado.dispositivo}</span>
                  </div>
                </div>
                <div className="col-span-2">
                  <p className="text-slate-400 text-sm">Descrição</p>
                  <p className="text-white font-medium mt-1">{logSelecionado.descricao}</p>
                </div>
                {logSelecionado.detalhes && (
                  <div className="col-span-2">
                    <p className="text-slate-400 text-sm">Detalhes Adicionais</p>
                    <p className="text-white font-medium mt-1 bg-slate-900 p-3 rounded-lg border border-slate-700">
                      {logSelecionado.detalhes}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  onClick={() => setMostrarDetalhes(false)}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  Fechar
                </button>
                <button className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2">
                  <Download className="w-5 h-5" />
                  Exportar Detalhes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Informações sobre Logs */}
      <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="bg-purple-500/20 p-3 rounded-lg">
            <Shield className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h3 className="text-white font-bold mb-2">Sistema de Logs e Auditoria</h3>
            <p className="text-slate-300 text-sm mb-3">
              Rastreamento completo de todas as ações realizadas no sistema com informações detalhadas de usuário, data/hora, IP, dispositivo e alterações realizadas.
            </p>
            <ul className="space-y-2 text-sm text-slate-300">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-purple-400 rounded-full" />
                Histórico completo de ações com before/after
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-purple-400 rounded-full" />
                Detecção automática de ações suspeitas
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-purple-400 rounded-full" />
                Conformidade LGPD com relatórios de acesso a dados
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-purple-400 rounded-full" />
                Exportação de logs para análise externa
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

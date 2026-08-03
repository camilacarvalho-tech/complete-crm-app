import { useState, useEffect } from 'react';
import { 
  Activity, Search, Filter, Download, 
  User, Clock, MapPin, Monitor, Shield,
  AlertCircle, CheckCircle, XCircle, Info
} from 'lucide-react';
import { db } from '../../../firebase';
import { collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore';
import * as XLSX from 'xlsx';

interface Log {
  id?: string;
  usuario: string;
  usuarioId: string;
  acao: string;
  modulo: string;
  descricao: string;
  ip: string;
  dispositivo: string;
  navegador: string;
  dataHora: string;
  tipo: 'sucesso' | 'erro' | 'aviso' | 'info';
  detalhes?: any;
}

const MODULOS = [
  'Todos',
  'Dashboard',
  'Clientes',
  'Atendimento',
  'Financeiro',
  'Estoque',
  'Compras',
  'Vendas',
  'RH',
  'Documentos',
  'Empresas',
  'Contratos',
  'Configurações',
  'Usuários'
];

const TIPOS_ACAO = [
  'Todos',
  'Login',
  'Logout',
  'Criação',
  'Edição',
  'Exclusão',
  'Visualização',
  'Exportação',
  'Importação',
  'Backup',
  'Configuração'
];

const TIPOS_LOG = ['Todos', 'sucesso', 'erro', 'aviso', 'info'];

export function LogsMonitoramento() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [busca, setBusca] = useState('');
  const [filtroModulo, setFiltroModulo] = useState('Todos');
  const [filtroAcao, setFiltroAcao] = useState('Todos');
  const [filtroTipo, setFiltroTipo] = useState('Todos');
  const [filtroUsuario, setFiltroUsuario] = useState('Todos');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [usuarios, setUsuarios] = useState<string[]>([]);
  const [logSelecionado, setLogSelecionado] = useState<Log | null>(null);

  useEffect(() => {
    carregarLogs();
  }, []);

  async function carregarLogs() {
    try {
      const snapshot = await getDocs(
        query(
          collection(db, 'logs'),
          orderBy('dataHora', 'desc'),
          limit(500)
        )
      );
      const lista = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Log[];
      setLogs(lista);
      
      // Extrair usuários únicos
      const usuariosUnicos = Array.from(new Set(lista.map(l => l.usuario)));
      setUsuarios(usuariosUnicos);
    } catch (error) {
      // Dados de exemplo para demonstração
      const logsExemplo: Log[] = [
        {
          id: '1',
          usuario: 'Admin Sistema',
          usuarioId: '1',
          acao: 'Login',
          modulo: 'Dashboard',
          descricao: 'Login realizado com sucesso',
          ip: '192.168.1.100',
          dispositivo: 'Windows 11',
          navegador: 'Chrome 120.0',
          dataHora: new Date().toISOString(),
          tipo: 'sucesso'
        },
        {
          id: '2',
          usuario: 'João Silva',
          usuarioId: '2',
          acao: 'Criação',
          modulo: 'Clientes',
          descricao: 'Novo cliente cadastrado: Maria Santos',
          ip: '192.168.1.101',
          dispositivo: 'Windows 10',
          navegador: 'Edge 119.0',
          dataHora: new Date(Date.now() - 3600000).toISOString(),
          tipo: 'sucesso'
        },
        {
          id: '3',
          usuario: 'Maria Oliveira',
          usuarioId: '3',
          acao: 'Exclusão',
          modulo: 'Financeiro',
          descricao: 'Tentativa de exclusão de registro bloqueada',
          ip: '192.168.1.102',
          dispositivo: 'macOS Sonoma',
          navegador: 'Safari 17.0',
          dataHora: new Date(Date.now() - 7200000).toISOString(),
          tipo: 'erro'
        },
        {
          id: '4',
          usuario: 'Carlos Costa',
          usuarioId: '4',
          acao: 'Edição',
          modulo: 'Estoque',
          descricao: 'Produto atualizado: Notebook Dell',
          ip: '192.168.1.103',
          dispositivo: 'Ubuntu 22.04',
          navegador: 'Firefox 121.0',
          dataHora: new Date(Date.now() - 10800000).toISOString(),
          tipo: 'sucesso'
        },
        {
          id: '5',
          usuario: 'Ana Paula',
          usuarioId: '5',
          acao: 'Exportação',
          modulo: 'RH',
          descricao: 'Relatório de funcionários exportado',
          ip: '192.168.1.104',
          dispositivo: 'Windows 11',
          navegador: 'Chrome 120.0',
          dataHora: new Date(Date.now() - 14400000).toISOString(),
          tipo: 'info'
        },
        {
          id: '6',
          usuario: 'Admin Sistema',
          usuarioId: '1',
          acao: 'Configuração',
          modulo: 'Configurações',
          descricao: 'Permissões de usuário atualizadas',
          ip: '192.168.1.100',
          dispositivo: 'Windows 11',
          navegador: 'Chrome 120.0',
          dataHora: new Date(Date.now() - 18000000).toISOString(),
          tipo: 'aviso'
        }
      ];
      
      setLogs(logsExemplo);
      const usuariosUnicos = Array.from(new Set(logsExemplo.map(l => l.usuario)));
      setUsuarios(usuariosUnicos);
      
      localStorage.setItem('logs', JSON.stringify(logsExemplo));
    }
  }

  function exportarParaExcel() {
    const dadosExcel = logsFiltrados.map(log => ({
      'Data/Hora': new Date(log.dataHora).toLocaleString('pt-BR'),
      'Usuário': log.usuario,
      'Módulo': log.modulo,
      'Ação': log.acao,
      'Descrição': log.descricao,
      'Tipo': log.tipo.toUpperCase(),
      'IP': log.ip,
      'Dispositivo': log.dispositivo,
      'Navegador': log.navegador
    }));

    const ws = XLSX.utils.json_to_sheet(dadosExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Logs');
    XLSX.writeFile(wb, `logs_sistema_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.xlsx`);
  }

  const logsFiltrados = logs.filter(log => {
    const matchBusca = busca === '' ||
      log.usuario.toLowerCase().includes(busca.toLowerCase()) ||
      log.acao.toLowerCase().includes(busca.toLowerCase()) ||
      log.descricao.toLowerCase().includes(busca.toLowerCase()) ||
      log.modulo.toLowerCase().includes(busca.toLowerCase());
    
    const matchModulo = filtroModulo === 'Todos' || log.modulo === filtroModulo;
    const matchAcao = filtroAcao === 'Todos' || log.acao === filtroAcao;
    const matchTipo = filtroTipo === 'Todos' || log.tipo === filtroTipo;
    const matchUsuario = filtroUsuario === 'Todos' || log.usuario === filtroUsuario;
    
    let matchData = true;
    if (dataInicio && dataFim) {
      const logData = new Date(log.dataHora).setHours(0, 0, 0, 0);
      const inicio = new Date(dataInicio).setHours(0, 0, 0, 0);
      const fim = new Date(dataFim).setHours(23, 59, 59, 999);
      matchData = logData >= inicio && logData <= fim;
    }
    
    return matchBusca && matchModulo && matchAcao && matchTipo && matchUsuario && matchData;
  });

  const totalLogs = logs.length;
  const logsSucesso = logs.filter(l => l.tipo === 'sucesso').length;
  const logsErro = logs.filter(l => l.tipo === 'erro').length;
  const usuariosAtivos = new Set(logs.map(l => l.usuarioId)).size;

  const TIPO_CONFIG = {
    sucesso: { cor: 'bg-green-100 text-green-800', icone: CheckCircle },
    erro: { cor: 'bg-red-100 text-red-800', icone: XCircle },
    aviso: { cor: 'bg-yellow-100 text-yellow-800', icone: AlertCircle },
    info: { cor: 'bg-blue-100 text-blue-800', icone: Info }
  };

  return (
    <div className="space-y-5">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Logs e Monitoramento</h2>
            <p className="text-sm text-gray-500">Acompanhe todas as atividades do sistema</p>
          </div>
        </div>
        <button
          onClick={exportarParaExcel}
          className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all font-medium shadow-lg"
        >
          <Download className="w-5 h-5" />
          Exportar Excel
        </button>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500">Total de Logs</span>
            <Activity className="w-5 h-5 text-indigo-500" />
          </div>
          <p className="text-2xl font-bold text-indigo-600">{totalLogs}</p>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500">Sucesso</span>
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-green-600">{logsSucesso}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500">Erros</span>
            <XCircle className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-2xl font-bold text-red-600">{logsErro}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500">Usuários Ativos</span>
            <User className="w-5 h-5 text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-purple-600">{usuariosAtivos}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-indigo-600" />
          <h3 className="text-lg font-bold text-gray-800">Filtros</h3>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar logs..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <select
            value={filtroModulo}
            onChange={(e) => setFiltroModulo(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {MODULOS.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>

          <select
            value={filtroAcao}
            onChange={(e) => setFiltroAcao(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {TIPOS_ACAO.map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>

          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {TIPOS_LOG.map(t => (
              <option key={t} value={t}>{t === 'Todos' ? 'Todos' : t.charAt(0).toUpperCase() + t.slice(1)}</option>
            ))}
          </select>

          <select
            value={filtroUsuario}
            onChange={(e) => setFiltroUsuario(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="Todos">Todos Usuários</option>
            {usuarios.map(u => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Data Início</label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Data Fim</label>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Lista de Logs */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {logsFiltrados.length === 0 ? (
          <div className="p-10 text-center text-gray-400">
            <Activity className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">Nenhum log encontrado</p>
            <p className="text-sm mt-1">Ajuste os filtros para ver mais resultados</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Data/Hora</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Usuário</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Módulo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Ação</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Descrição</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Tipo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logsFiltrados.map((log) => {
                  const config = TIPO_CONFIG[log.tipo];
                  const IconeTipo = config.icone;
                  
                  return (
                    <tr 
                      key={log.id} 
                      className="hover:bg-gray-50 transition-all cursor-pointer"
                      onClick={() => setLogSelecionado(log)}
                    >
                      <td className="px-4 py-3 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-gray-400" />
                          {new Date(log.dataHora).toLocaleString('pt-BR')}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          {log.usuario}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-800">
                        {log.modulo}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {log.acao}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {log.descricao}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${config.cor}`}>
                          <IconeTipo className="w-3 h-3" />
                          {log.tipo.charAt(0).toUpperCase() + log.tipo.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          {log.ip}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Detalhes do Log */}
      {logSelecionado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 flex items-center justify-between rounded-t-2xl">
              <div className="flex items-center gap-3">
                <Shield className="w-6 h-6" />
                <div>
                  <h3 className="text-xl font-bold">Detalhes do Log</h3>
                  <p className="text-sm text-indigo-100">Informações completas da atividade</p>
                </div>
              </div>
              <button
                onClick={() => setLogSelecionado(null)}
                className="p-2 hover:bg-white/20 rounded-lg transition-all"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Data e Hora</label>
                  <p className="text-sm text-gray-800">{new Date(logSelecionado.dataHora).toLocaleString('pt-BR')}</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Usuário</label>
                  <p className="text-sm text-gray-800">{logSelecionado.usuario}</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Módulo</label>
                  <p className="text-sm text-gray-800">{logSelecionado.modulo}</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Ação</label>
                  <p className="text-sm text-gray-800">{logSelecionado.acao}</p>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Descrição</label>
                  <p className="text-sm text-gray-800">{logSelecionado.descricao}</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Endereço IP</label>
                  <p className="text-sm text-gray-800">{logSelecionado.ip}</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Tipo</label>
                  <p className="text-sm text-gray-800">{logSelecionado.tipo.toUpperCase()}</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Dispositivo</label>
                  <p className="text-sm text-gray-800 flex items-center gap-2">
                    <Monitor className="w-4 h-4 text-gray-400" />
                    {logSelecionado.dispositivo}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Navegador</label>
                  <p className="text-sm text-gray-800">{logSelecionado.navegador}</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 px-6 py-4 flex items-center justify-end rounded-b-2xl border-t border-gray-200">
              <button
                onClick={() => setLogSelecionado(null)}
                className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all font-medium"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

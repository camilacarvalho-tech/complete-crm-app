import { useCRM } from '../../context/CRMContext';
import { DollarSign, Users, TrendingUp, CheckCircle, Phone, Mail, Calendar } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export function Dashboard() {
  const { clientes, leads, tarefas, metas } = useCRM();

  const clientesAtivos = clientes.filter(c => c.status === 'ativo').length;
  const leadsQualificados = leads.filter(l => l.status === 'qualificado' || l.status === 'proposta').length;
  const tarefasPendentes = tarefas.filter(t => t.status === 'pendente' || t.status === 'em_andamento').length;
  const valorTotal = clientes.reduce((acc, c) => acc + c.valor, 0);

  const leadsPorStatus = [
    { name: 'Novo', value: leads.filter(l => l.status === 'novo').length },
    { name: 'Contato', value: leads.filter(l => l.status === 'contato').length },
    { name: 'Qualificado', value: leads.filter(l => l.status === 'qualificado').length },
    { name: 'Proposta', value: leads.filter(l => l.status === 'proposta').length },
    { name: 'Ganho', value: leads.filter(l => l.status === 'ganho').length },
  ];

  const vendasMensais = [
    { mes: 'Jan', valor: 120000 },
    { mes: 'Fev', valor: 185000 },
    { mes: 'Mar', valor: 230000 },
  ];

  const tarefasPorTipo = [
    { tipo: 'Ligações', quantidade: tarefas.filter(t => t.tipo === 'ligacao').length },
    { tipo: 'E-mails', quantidade: tarefas.filter(t => t.tipo === 'email').length },
    { tipo: 'Reuniões', quantidade: tarefas.filter(t => t.tipo === 'reuniao').length },
    { tipo: 'Follow-ups', quantidade: tarefas.filter(t => t.tipo === 'follow-up').length },
  ];

  return (
    <div className="space-y-6">
      {/* Cards de Métricas */}
      <div className="grid grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Valor Total</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                R$ {(valorTotal / 1000).toFixed(0)}k
              </p>
              <p className="text-sm text-green-600 mt-2">+12.5% este mês</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Clientes Ativos</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{clientesAtivos}</p>
              <p className="text-sm text-green-600 mt-2">+3 este mês</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Leads Qualificados</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{leadsQualificados}</p>
              <p className="text-sm text-orange-600 mt-2">{leads.length} total</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Tarefas Pendentes</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{tarefasPendentes}</p>
              <p className="text-sm text-blue-600 mt-2">{tarefas.length} total</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Vendas Mensais</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={vendasMensais}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="valor" stroke="#3B82F6" strokeWidth={2} name="Vendas (R$)" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Leads por Status</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={leadsPorStatus}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {leadsPorStatus.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tarefas e Metas */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Tarefas por Tipo</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={tarefasPorTipo}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="tipo" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="quantidade" fill="#3B82F6" name="Quantidade" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Metas do Mês</h3>
          <div className="space-y-4">
            {metas.filter(m => m.periodo === 'mensal').map(meta => {
              const progresso = (meta.valorAtual / meta.valor) * 100;
              return (
                <div key={meta.id}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">{meta.titulo}</span>
                    <span className="text-sm text-gray-600">
                      {meta.valorAtual} / {meta.valor}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(progresso, 100)}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{progresso.toFixed(1)}% completo</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Próximas Tarefas */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Próximas Tarefas</h3>
        <div className="space-y-3">
          {tarefas
            .filter(t => t.status !== 'concluida' && t.status !== 'cancelada')
            .slice(0, 5)
            .map(tarefa => {
              const IconeTipo = tarefa.tipo === 'ligacao' ? Phone : tarefa.tipo === 'email' ? Mail : Calendar;
              const corPrioridade = 
                tarefa.prioridade === 'alta' ? 'text-red-600 bg-red-100' :
                tarefa.prioridade === 'media' ? 'text-orange-600 bg-orange-100' :
                'text-blue-600 bg-blue-100';
              
              return (
                <div key={tarefa.id} className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${corPrioridade}`}>
                    <IconeTipo className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{tarefa.titulo}</p>
                    <p className="text-sm text-gray-500">{tarefa.descricao}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">{new Date(tarefa.dataVencimento).toLocaleDateString('pt-BR')}</p>
                    <p className="text-xs text-gray-500 capitalize">{tarefa.prioridade}</p>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}

import { useCRM } from '../../context/CRMContext';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Users, Target, Calendar } from 'lucide-react';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export function Relatorios() {
  const { clientes, leads, tarefas, atividades } = useCRM();

  // Dados para gráficos
  const clientesPorStatus = [
    { name: 'Ativos', value: clientes.filter(c => c.status === 'ativo').length, color: '#10B981' },
    { name: 'Leads', value: clientes.filter(c => c.status === 'lead').length, color: '#3B82F6' },
    { name: 'Inativos', value: clientes.filter(c => c.status === 'inativo').length, color: '#6B7280' },
  ];

  const leadsPorOrigem = leads.reduce((acc, lead) => {
    const origem = lead.origem;
    const existente = acc.find(item => item.name === origem);
    if (existente) {
      existente.value += 1;
    } else {
      acc.push({ name: origem, value: 1 });
    }
    return acc;
  }, [] as { name: string; value: number }[]);

  const atividadesPorTipo = [
    { tipo: 'E-mails', quantidade: atividades.filter(a => a.tipo === 'email').length },
    { tipo: 'Ligações', quantidade: atividades.filter(a => a.tipo === 'ligacao').length },
    { tipo: 'Reuniões', quantidade: atividades.filter(a => a.tipo === 'reuniao').length },
    { tipo: 'Notas', quantidade: atividades.filter(a => a.tipo === 'nota').length },
  ];

  const leadsPorMes = [
    { mes: 'Jan', novos: 8, convertidos: 3 },
    { mes: 'Fev', novos: 12, convertidos: 5 },
    { mes: 'Mar', novos: 15, convertidos: 7 },
  ];

  const valorPorStatus = leads.reduce((acc, lead) => {
    const status = lead.status;
    const existente = acc.find(item => item.status === status);
    if (existente) {
      existente.valor += lead.valor;
    } else {
      acc.push({ status: status.charAt(0).toUpperCase() + status.slice(1), valor: lead.valor });
    }
    return acc;
  }, [] as { status: string; valor: number }[]);

  // Métricas
  const taxaConversao = leads.length > 0 
    ? ((leads.filter(l => l.status === 'ganho').length / leads.length) * 100).toFixed(1)
    : 0;

  const ticketMedio = clientes.length > 0
    ? clientes.reduce((acc, c) => acc + c.valor, 0) / clientes.length
    : 0;

  const leadsAtivos = leads.filter(l => 
    l.status !== 'ganho' && l.status !== 'perdido'
  ).length;

  return (
    <div className="space-y-6">
      {/* Cards de Métricas Principais */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-lg shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Taxa de Conversão</p>
              <p className="text-3xl font-bold mt-2">{taxaConversao}%</p>
            </div>
            <TrendingUp className="w-12 h-12 opacity-30" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-lg shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Ticket Médio</p>
              <p className="text-3xl font-bold mt-2">R$ {(ticketMedio / 1000).toFixed(0)}k</p>
            </div>
            <DollarSign className="w-12 h-12 opacity-30" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-lg shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">Leads Ativos</p>
              <p className="text-3xl font-bold mt-2">{leadsAtivos}</p>
            </div>
            <Target className="w-12 h-12 opacity-30" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-6 rounded-lg shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm">Total Clientes</p>
              <p className="text-3xl font-bold mt-2">{clientes.length}</p>
            </div>
            <Users className="w-12 h-12 opacity-30" />
          </div>
        </div>
      </div>

      {/* Gráficos Linha 1 */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Clientes por Status</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={clientesPorStatus}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {clientesPorStatus.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Leads por Origem</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={leadsPorOrigem}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#3B82F6" name="Quantidade" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Gráficos Linha 2 */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Performance de Leads (Mensal)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={leadsPorMes}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="novos" stroke="#3B82F6" strokeWidth={2} name="Novos Leads" />
              <Line type="monotone" dataKey="convertidos" stroke="#10B981" strokeWidth={2} name="Convertidos" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Atividades por Tipo</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={atividadesPorTipo}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="tipo" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="quantidade" fill="#8B5CF6" name="Quantidade" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Valor por Status do Pipeline */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Valor por Estágio do Pipeline</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={valorPorStatus}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="status" />
            <YAxis />
            <Tooltip 
              formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR')}`}
            />
            <Legend />
            <Bar dataKey="valor" fill="#10B981" name="Valor Total (R$)" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Tabela de Resumo */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Resumo Executivo</h3>
        <div className="grid grid-cols-3 gap-6">
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-600 font-medium">Total de Atividades</p>
            <p className="text-2xl font-bold text-blue-900 mt-2">{atividades.length}</p>
            <p className="text-xs text-blue-600 mt-1">Este mês</p>
          </div>

          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <p className="text-sm text-green-600 font-medium">Tarefas Concluídas</p>
            <p className="text-2xl font-bold text-green-900 mt-2">
              {tarefas.filter(t => t.status === 'concluida').length}
            </p>
            <p className="text-xs text-green-600 mt-1">
              {((tarefas.filter(t => t.status === 'concluida').length / tarefas.length) * 100).toFixed(0)}% do total
            </p>
          </div>

          <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
            <p className="text-sm text-purple-600 font-medium">Valor Médio por Lead</p>
            <p className="text-2xl font-bold text-purple-900 mt-2">
              R$ {leads.length > 0 ? (leads.reduce((acc, l) => acc + l.valor, 0) / leads.length / 1000).toFixed(0) : 0}k
            </p>
            <p className="text-xs text-purple-600 mt-1">Pipeline atual</p>
          </div>
        </div>
      </div>
    </div>
  );
}

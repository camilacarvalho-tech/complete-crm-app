import { useCRM } from '../../context/CRMContext';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { TrendingUp, DollarSign, Users, Target, CheckCircle, Clock } from 'lucide-react';

const CORES = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#3b82f6', '#ec4899', '#06b6d4'];

const ORIGEM_NOMES: Record<string, string> = {
  'crm':            'CRM',
  'CRM':            'CRM',
  'site':           'Site',
  'Site':           'Site',
  'Landing Page':   'Landing Page',
  'landing':        'Landing Page',
  'Landing':        'Landing Page',
  'lp':             'Landing Page',
  'Página inicial': 'Landing Page',
  'Pagina inicial': 'Landing Page',
  'página inicial': 'Landing Page',
  'land':           'Landing Page',
  'WhatsApp':       'WhatsApp',
  'whatsapp':       'WhatsApp',
  'wpp':            'WhatsApp',
  'Tráfego Pago':   'Tráfego Pago',
  'trafego':        'Tráfego Pago',
  'Trafego Pago':   'Tráfego Pago',
  'Google ADS':     'Google ADS',
  'google':         'Google ADS',
  'Google':         'Google ADS',
  'Instagram':      'Instagram',
  'instagram':      'Instagram',
  'Facebook':       'Facebook',
  'facebook':       'Facebook',
  'Indicação':      'Indicação',
  'indicacao':      'Indicação',
  'Outro':          'Outro',
  'outro':          'Outro',
  'Direto':         'Direto',
};

export function Relatorios() {
  const { clientes, tarefas } = useCRM();

  const total         = clientes.length;
  const pagos         = clientes.filter((c: any) => c.status === 'Pago').length;
  const aprovados     = clientes.filter((c: any) => c.status === 'Aprovado').length;
  const emAtendimento = clientes.filter((c: any) => c.status === 'Em Atendimento').length;
  const recusados     = clientes.filter((c: any) => c.status === 'Recusado').length;
  const taxa          = total > 0 ? ((pagos / total) * 100).toFixed(1) : '0';
  const taxaTarefas   = tarefas.length > 0
    ? ((tarefas.filter((t) => t.status === 'concluida').length / tarefas.length) * 100).toFixed(0)
    : '0';

  // Por status pizza
  const porStatus = [
    { name: 'Lead',            value: clientes.filter((c: any) => !c.status || c.status === 'Lead').length },
    { name: 'Em Atendimento',  value: emAtendimento },
    { name: 'Análise Bancária',value: clientes.filter((c: any) => c.status === 'Analise Bancaria').length },
    { name: 'Aprovado',        value: aprovados },
    { name: 'Pago',            value: pagos },
    { name: 'Recusado',        value: recusados },
  ].filter((s) => s.value > 0);

  // Por modalidade
  const modMap: Record<string, number> = {};
  clientes.forEach((c: any) => {
    const m = c.modalidade || 'Não informado';
    modMap[m] = (modMap[m] || 0) + 1;
  });
  const porModalidade = Object.entries(modMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // Por estado
  const estadoMap: Record<string, number> = {};
  clientes.forEach((c: any) => {
    const e = c.estado || 'Não informado';
    estadoMap[e] = (estadoMap[e] || 0) + 1;
  });
  const porEstado = Object.entries(estadoMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  // Por origem
  const origemMap: Record<string, number> = {};
  clientes.forEach((c: any) => {
    const raw = c.origem || 'Não informado';
    const o = ORIGEM_NOMES[raw] ?? raw;
    origemMap[o] = (origemMap[o] || 0) + 1;
  });
  const porOrigem = Object.entries(origemMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // Por status barras
  const porStatusBarra = [
    { name: 'Lead',       value: clientes.filter((c: any) => !c.status || c.status === 'Lead').length },
    { name: 'Em Atend.',  value: emAtendimento },
    { name: 'Aprovado',   value: aprovados },
    { name: 'Pago',       value: pagos },
    { name: 'Recusado',   value: recusados },
  ];

  // Tarefas
  const tarefasPorStatus = [
    { name: 'Pendente',    value: tarefas.filter((t) => t.status === 'pendente').length },
    { name: 'Em Andamento',value: tarefas.filter((t) => t.status === 'em_andamento').length },
    { name: 'Concluída',   value: tarefas.filter((t) => t.status === 'concluida').length },
    { name: 'Cancelada',   value: tarefas.filter((t) => t.status === 'cancelada').length },
  ].filter((t) => t.value > 0);

  const tarefasPorTipo = [
    { name: 'Ligação',   value: tarefas.filter((t) => t.tipo === 'ligacao').length },
    { name: 'E-mail',    value: tarefas.filter((t) => t.tipo === 'email').length },
    { name: 'Reunião',   value: tarefas.filter((t) => t.tipo === 'reuniao').length },
    { name: 'Follow-up', value: tarefas.filter((t) => t.tipo === 'follow-up').length },
    { name: 'Outro',     value: tarefas.filter((t) => t.tipo === 'outro').length },
  ].filter((t) => t.value > 0);

  return (
    <div className="space-y-6">

      {/* Cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total de Clientes',  value: total,          sub: 'No sistema',           from: '#6366f1', to: '#4f46e5', Icon: Users },
          { label: 'Taxa de Conversão',  value: `${taxa}%`,     sub: 'Pagos / Total',         from: '#10b981', to: '#059669', Icon: TrendingUp },
          { label: 'Aprovados',          value: aprovados,      sub: 'Aguardando pagamento',  from: '#8b5cf6', to: '#7c3aed', Icon: Target },
          { label: 'Pagos',              value: pagos,          sub: 'Contratos fechados',    from: '#f59e0b', to: '#d97706', Icon: DollarSign },
          { label: 'Em Atendimento',     value: emAtendimento,  sub: 'Em andamento',          from: '#3b82f6', to: '#2563eb', Icon: Clock },
          { label: 'Tarefas Concluídas', value: `${taxaTarefas}%`, sub: 'Do total de tarefas',from: '#ef4444', to: '#dc2626', Icon: CheckCircle },
        ].map((card) => (
          <div
            key={card.label}
            className="text-white p-5 rounded-xl shadow-lg flex items-center justify-between"
            style={{ background: `linear-gradient(135deg, ${card.from}, ${card.to})` }}
          >
            <div>
              <p className="text-white/70 text-xs font-medium">{card.label}</p>
              <p className="text-3xl font-black mt-1">{card.value}</p>
              <p className="text-white/60 text-[11px] mt-1">{card.sub}</p>
            </div>
            <card.Icon className="w-10 h-10 opacity-20" />
          </div>
        ))}
      </div>

      {/* Funil + Modalidade */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-5 rounded-full bg-amber-500" />
            <h3 className="text-sm font-bold text-gray-800">Funil de Conversão</h3>
          </div>
          {porStatus.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-16">Sem dados ainda</p>
          ) : (
            <div className="space-y-2.5">
              {porStatus.map((item, i) => {
                const max = porStatus[0]?.value || 1;
                return (
                  <div key={item.name}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-600 font-medium">{item.name}</span>
                      <span className="font-bold" style={{ color: CORES[i % CORES.length] }}>{item.value}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-4">
                      <div
                        className="h-4 rounded-full transition-all duration-500"
                        style={{
                          width: `${(item.value / max) * 100}%`,
                          backgroundColor: CORES[i % CORES.length],
                          boxShadow: `0 0 8px ${CORES[i % CORES.length]}66`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-5 rounded-full bg-amber-500" />
            <h3 className="text-sm font-bold text-gray-800">Clientes por Modalidade</h3>
          </div>
          {porModalidade.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-16">Sem dados ainda</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={porModalidade} layout="vertical" margin={{ left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="value" name="Clientes" radius={[0, 6, 6, 0]}>
                  {porModalidade.map((_, i) => <Cell key={i} fill={CORES[i % CORES.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Status barras + Origem */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-5 rounded-full bg-amber-500" />
            <h3 className="text-sm font-bold text-gray-800">Clientes por Status</h3>
          </div>
          {total === 0 ? (
            <p className="text-gray-400 text-sm text-center py-16">Sem dados ainda</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={porStatusBarra}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" name="Clientes" radius={[6, 6, 0, 0]}>
                  {porStatusBarra.map((_, i) => <Cell key={i} fill={CORES[i % CORES.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Origem do Tráfego — pizza + listagem */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-5 rounded-full bg-amber-500" />
            <h3 className="text-sm font-bold text-gray-800">Origem do Tráfego</h3>
          </div>
          {porOrigem.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-16">Sem dados ainda</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={porOrigem} cx="50%" cy="50%" outerRadius={75} dataKey="value">
                    {porOrigem.map((_, i) => <Cell key={i} fill={CORES[i % CORES.length]} />)}
                  </Pie>
                  <Tooltip formatter={(value, name) => [`${value} cliente${Number(value) !== 1 ? 's' : ''}`, name]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-3 space-y-2">
                {porOrigem.map((item, i) => (
                  <div key={item.name} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: CORES[i % CORES.length] }} />
                      <span className="text-sm text-gray-700 font-medium">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-black text-gray-900">{item.value}</span>
                      <span className="text-xs text-gray-400 w-8 text-right">
                        {total > 0 ? `${Math.round((item.value / total) * 100)}%` : '0%'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Por estado */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-5 rounded-full bg-amber-500" />
          <h3 className="text-sm font-bold text-gray-800">Clientes por Estado (UF)</h3>
        </div>
        {porEstado.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-10">Sem dados ainda</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={porEstado}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" name="Clientes" radius={[6, 6, 0, 0]}>
                {porEstado.map((_, i) => <Cell key={i} fill={CORES[i % CORES.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Tarefas */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-5 rounded-full bg-amber-500" />
            <h3 className="text-sm font-bold text-gray-800">Atendimentos por Status</h3>
          </div>
          {tarefasPorStatus.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-16">Sem dados ainda</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={tarefasPorStatus} cx="50%" cy="50%" outerRadius={90} dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                  {tarefasPorStatus.map((_, i) => <Cell key={i} fill={CORES[i % CORES.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-5 rounded-full bg-amber-500" />
            <h3 className="text-sm font-bold text-gray-800">Atendimentos por Tipo</h3>
          </div>
          {tarefasPorTipo.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-16">Sem dados ainda</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={tarefasPorTipo}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" name="Quantidade" radius={[6, 6, 0, 0]}>
                  {tarefasPorTipo.map((_, i) => <Cell key={i} fill={CORES[i % CORES.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Indicadores */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total de Atendimentos',   value: tarefas.length,                                          sub: 'Registrados',      cor: 'blue' },
          { label: 'Atendimentos Concluídos', value: tarefas.filter((t) => t.status === 'concluida').length,  sub: `${taxaTarefas}% do total`, cor: 'green' },
          { label: 'Recusados',               value: recusados,                                               sub: 'Não aprovados',    cor: 'red' },
        ].map((item) => (
          <div key={item.label} className={`p-5 bg-${item.cor}-50 rounded-xl border border-${item.cor}-100`}>
            <p className={`text-sm text-${item.cor}-600 font-semibold`}>{item.label}</p>
            <p className={`text-3xl font-black text-${item.cor}-900 mt-2`}>{item.value}</p>
            <p className={`text-xs text-${item.cor}-500 mt-1`}>{item.sub}</p>
          </div>
        ))}
      </div>

    </div>
  );
}

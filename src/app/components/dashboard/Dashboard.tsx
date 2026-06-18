import { useCRM } from '../../context/CRMContext';
import { Users, TrendingUp, CheckCircle, DollarSign, Clock, XCircle } from 'lucide-react';

const MOD_CORES: Record<string, string> = {
  'Antecipação FGTS':       '#3b82f6',
  'Crédito CLT':            '#22c55e',
  'INSS':                   '#8b5cf6',
  'SIAPE':                  '#f59e0b',
  'Servidor Municipal':     '#f97316',
  'Conta de Energia':       '#06b6d4',
  'Refinanciamento Veículo':'#ef4444',
  'Refinanciamento Imóvel': '#ec4899',
  'Placa Solar':            '#10b981',
};

const FUNIL = [
  { id: 'Lead',                    label: 'Lead',               cor: '#6366f1' },
  { id: 'Em Atendimento',          label: 'Em Atendimento',     cor: '#3b82f6' },
  { id: 'Proposta em Atendimento', label: 'Proposta',           cor: '#f59e0b' },
  { id: 'Fila de Atendimento',     label: 'Fila de Atendimento',cor: '#8b5cf6' },
  { id: 'Digitação',               label: 'Digitação',          cor: '#06b6d4' },
  { id: 'Analise Bancaria',        label: 'Análise Bancária',   cor: '#f97316' },
  { id: 'Aprovado',                label: 'Aprovado',           cor: '#22c55e' },
  { id: 'Pago',                    label: 'Pago',               cor: '#10b981' },
  { id: 'Recusado',                label: 'Recusado',           cor: '#ef4444' },
];

export function Dashboard() {
  const { clientes } = useCRM();

  const total        = clientes.length;
  const aprovados    = clientes.filter((c: any) => c.status === 'Aprovado').length;
  const pagos        = clientes.filter((c: any) => c.status === 'Pago').length;
  const emAtend      = clientes.filter((c: any) => c.status === 'Em Atendimento').length;
  const recusados    = clientes.filter((c: any) => c.status === 'Recusado').length;
  const taxa         = total > 0 ? ((pagos / total) * 100).toFixed(1) : '0';

  // Modalidade
  const modMap: Record<string, number> = {};
  clientes.forEach((c: any) => {
    const m = c.modalidade || 'Não informado';
    modMap[m] = (modMap[m] || 0) + 1;
  });
  const modEntries = Object.entries(modMap).sort((a, b) => b[1] - a[1]);
  const maxMod = modEntries[0]?.[1] || 1;

  // Funil
  const contar = (id: string) => clientes.filter((c: any) => (c.status || 'Lead') === id).length;
  const maxFunil = Math.max(...FUNIL.map((f) => contar(f.id)), 1);

  return (
    <div className="space-y-5">

      {/* Cards métricas */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total de Clientes',  value: total,     sub: 'Firebase Realtime',       cor: '#6366f1', Icon: Users },
          { label: 'Em Atendimento',     value: emAtend,   sub: 'Ativos agora',             cor: '#3b82f6', Icon: Clock },
          { label: 'Aprovados',          value: aprovados, sub: 'Aguardando pagamento',     cor: '#22c55e', Icon: CheckCircle },
          { label: 'Pagos',              value: pagos,     sub: 'Contratos fechados',       cor: '#10b981', Icon: DollarSign },
          { label: 'Recusados',          value: recusados, sub: 'Não aprovados',            cor: '#ef4444', Icon: XCircle },
          { label: 'Taxa de Conversão',  value: `${taxa}%`,sub: 'Pagos / Total',            cor: '#8b5cf6', Icon: TrendingUp },
        ].map((card) => (
          <div key={card.label} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">{card.label}</p>
              <p className="text-3xl font-black mt-1" style={{ color: card.cor }}>{card.value}</p>
              <p className="text-xs mt-1" style={{ color: card.cor }}>{card.sub}</p>
            </div>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: card.cor + '18' }}>
              <card.Icon className="w-6 h-6" style={{ color: card.cor }} />
            </div>
          </div>
        ))}
      </div>

      {/* Funil de métricas */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-1 h-5 rounded-full" style={{ background: 'linear-gradient(#f59e0b,#ef4444)' }} />
          <h3 className="text-base font-bold text-gray-800">Métricas do Funil de Vendas</h3>
        </div>
        <div className="space-y-3">
          {FUNIL.map((etapa) => {
            const count = contar(etapa.id);
            const pct = Math.round((count / (total || 1)) * 100);
            return (
              <div key={etapa.id} className="flex items-center gap-3">
                <div className="w-36 text-right flex-shrink-0">
                  <span className="text-xs font-semibold text-gray-600">{etapa.label}</span>
                </div>
                <div className="flex-1 bg-gray-100 rounded-full h-5 relative overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.max(count > 0 ? 4 : 0, (count / maxFunil) * 100)}%`,
                      backgroundColor: etapa.cor,
                      boxShadow: count > 0 ? `0 0 8px ${etapa.cor}88` : 'none',
                    }}
                  />
                  {count > 0 && (
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-black text-white">
                      {count}
                    </span>
                  )}
                </div>
                <div className="w-12 text-right flex-shrink-0">
                  <span className="text-xs font-bold" style={{ color: etapa.cor }}>{pct}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Clientes por modalidade */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-1 h-5 rounded-full" style={{ background: 'linear-gradient(#f59e0b,#ef4444)' }} />
          <h3 className="text-base font-bold text-gray-800">Clientes por Modalidade</h3>
        </div>
        {modEntries.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">Nenhum cliente cadastrado ainda</p>
        ) : (
          <div className="space-y-3">
            {modEntries.map(([mod, count]) => {
              const cor = MOD_CORES[mod] ?? '#f59e0b';
              return (
                <div key={mod}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600 truncate max-w-[220px]">{mod}</span>
                    <span className="font-bold" style={{ color: cor }}>{count}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3">
                    <div
                      className="h-3 rounded-full transition-all duration-500"
                      style={{
                        width: `${(count / maxMod) * 100}%`,
                        backgroundColor: cor,
                        boxShadow: `0 0 6px ${cor}66`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}

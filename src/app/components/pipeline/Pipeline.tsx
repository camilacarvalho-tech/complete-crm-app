import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useCRM } from '../../context/CRMContext';
import { Phone, User } from 'lucide-react';

const COLUNAS = [
  { id: 'Lead',                    titulo: 'Lead',               cor: '#6366f1', bg: '#eef2ff' },
  { id: 'Em Atendimento',          titulo: 'Em Atendimento',     cor: '#3b82f6', bg: '#eff6ff' },
  { id: 'Proposta em Atendimento', titulo: 'Proposta',           cor: '#f59e0b', bg: '#fffbeb' },
  { id: 'Fila de Atendimento',     titulo: 'Fila de Atendimento',cor: '#8b5cf6', bg: '#f5f3ff' },
  { id: 'Digitação',               titulo: 'Digitação',          cor: '#06b6d4', bg: '#ecfeff' },
  { id: 'Aprovado',                titulo: 'Aprovado',           cor: '#22c55e', bg: '#f0fdf4' },
  { id: 'Pago',                    titulo: 'Pago',               cor: '#10b981', bg: '#ecfdf5' },
  { id: 'Recusado',                titulo: 'Recusado',           cor: '#ef4444', bg: '#fef2f2' },
];

function ClienteCard({ cliente }: { cliente: any }) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'cliente',
    item: { id: cliente.id, status: cliente.status || 'Lead' },
    collect: (m) => ({ isDragging: m.isDragging() }),
  }));

  return (
    <div
      ref={drag}
      className={`bg-white p-3 rounded-xl border border-gray-100 shadow-sm cursor-move hover:shadow-md transition-all ${isDragging ? 'opacity-40' : ''}`}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
          <User className="w-3.5 h-3.5 text-amber-600" />
        </div>
        <p className="font-semibold text-gray-900 text-xs truncate">{cliente.nome || 'Sem nome'}</p>
      </div>
      <p className="text-[11px] text-gray-400 mb-0.5">CPF: {cliente.cpf || '—'}</p>
      <p className="text-[11px] text-gray-500 mb-2 truncate">{cliente.modalidade || '—'}</p>
      {cliente.whatsapp ? (
        <a
          href={`https://wa.me/55${cliente.whatsapp.replace(/\D/g, '')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-green-600 text-[11px] font-semibold"
        >
          <Phone className="w-3 h-3" /> WhatsApp
        </a>
      ) : (
        <p className="text-[11px] text-gray-300">Sem telefone</p>
      )}
    </div>
  );
}

function Coluna({ col, clientes, onDrop }: { col: typeof COLUNAS[0]; clientes: any[]; onDrop: (id: string, s: string) => void }) {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'cliente',
    drop: (item: any) => { if (item.status !== col.id) onDrop(item.id, col.id); },
    collect: (m) => ({ isOver: m.isOver() }),
  }));

  return (
    <div
      ref={drop}
      className={`flex-shrink-0 w-52 rounded-xl border-2 p-3 transition-all ${isOver ? 'scale-[1.02] shadow-lg' : ''}`}
      style={{ backgroundColor: col.bg, borderColor: isOver ? col.cor : col.cor + '44' }}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="font-bold text-xs" style={{ color: col.cor }}>{col.titulo}</p>
        <span
          className="text-white text-[10px] font-black px-2 py-0.5 rounded-full"
          style={{ backgroundColor: col.cor }}
        >
          {clientes.length}
        </span>
      </div>
      <div className="space-y-2 max-h-80 overflow-y-auto">
        {clientes.map((c) => <ClienteCard key={c.id} cliente={c} />)}
      </div>
      {clientes.length === 0 && (
        <div className="border-2 border-dashed rounded-xl p-3 text-center" style={{ borderColor: col.cor + '44' }}>
          <p className="text-[11px] text-gray-400">Arraste aqui</p>
        </div>
      )}
    </div>
  );
}

export function Pipeline() {
  const { clientes, atualizarCliente } = useCRM();
  const handleDrop = (id: string, status: string) => atualizarCliente(id, { status });
  const contar = (s: string) => clientes.filter((c: any) => (c.status || 'Lead') === s).length;
  const total = clientes.length || 1;

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-5">
        {/* Cards resumo */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Total de Clientes',  value: clientes.length,         cor: '#6366f1' },
            { label: 'Em Atendimento',     value: contar('Em Atendimento'), cor: '#3b82f6' },
            { label: 'Aprovados',          value: contar('Aprovado'),       cor: '#22c55e' },
            { label: 'Pagos',              value: contar('Pago'),           cor: '#10b981' },
          ].map((card) => (
            <div
              key={card.label}
              className="text-white p-5 rounded-xl shadow-lg"
              style={{ background: `linear-gradient(135deg, ${card.cor}dd, ${card.cor})` }}
            >
              <p className="text-white/70 text-xs font-medium">{card.label}</p>
              <p className="text-3xl font-black mt-1">{card.value}</p>
            </div>
          ))}
        </div>

        {/* Funil visual neon */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-1 h-5 rounded-full" style={{ background: 'linear-gradient(#f59e0b, #ef4444)' }} />
            <h3 className="text-base font-bold text-gray-800">Funil de Vendas</h3>
          </div>
          <div className="space-y-2.5">
            {COLUNAS.map((col) => {
              const count = contar(col.id);
              const pct = Math.round((count / total) * 100);
              return (
                <div key={col.id} className="flex items-center gap-3">
                  <div className="w-36 text-right">
                    <span className="text-xs font-semibold text-gray-600">{col.titulo}</span>
                  </div>
                  <div className="flex-1 bg-gray-100 rounded-full h-6 relative overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700 flex items-center"
                      style={{
                        width: `${Math.max(count > 0 ? 5 : 0, pct)}%`,
                        backgroundColor: col.cor,
                        boxShadow: count > 0 ? `0 0 8px ${col.cor}88` : 'none',
                      }}
                    />
                    {count > 0 && (
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-black text-white drop-shadow">
                        {count}
                      </span>
                    )}
                  </div>
                  <div className="w-10 text-right">
                    <span className="text-xs font-bold" style={{ color: col.cor }}>{pct}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Kanban */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-1 h-5 rounded-full" style={{ background: 'linear-gradient(#f59e0b, #ef4444)' }} />
            <h3 className="text-base font-bold text-gray-800">Kanban — Arraste os Clientes</h3>
            <span className="text-xs text-gray-400 ml-1">{clientes.length} cliente{clientes.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-3">
            {COLUNAS.map((col) => (
              <Coluna
                key={col.id}
                col={col}
                clientes={clientes.filter((c: any) => (c.status || 'Lead') === col.id)}
                onDrop={handleDrop}
              />
            ))}
          </div>
        </div>
      </div>
    </DndProvider>
  );
}

import { useState } from 'react';
import { useCRM } from '../../context/CRMContext';
import { Plus, Phone, Calendar, CheckCircle, Clock, AlertCircle, X, User } from 'lucide-react';
import { Tarefa } from '../../types';

const ABAS_STATUS = [
  { id: 'todos',                   label: 'Todos' },
  { id: 'em_atendimento',          label: 'Em Atendimento' },
  { id: 'proposta_em_atendimento', label: 'Proposta em Atendimento' },
  { id: 'fila_atendimento',        label: 'Fila de Atendimento' },
  { id: 'em_andamento',            label: 'Em Andamento' },
  { id: 'pendente',                label: 'Pendentes' },
  { id: 'aprovado',                label: 'Aprovado' },
  { id: 'recusado',                label: 'Recusado' },
  { id: 'digitacao',               label: 'Digitação' },
  { id: 'limpa_nome',              label: 'Limpa Nome' },
  { id: 'rating_bancario',         label: 'Rating Bancário' },
  { id: 'valores',                 label: 'Valores' },
  { id: 'concluida',               label: 'Concluídas' },
];

const STATUS_COR: Record<string, string> = {
  em_atendimento:          'bg-blue-100 text-blue-800',
  proposta_em_atendimento: 'bg-amber-100 text-amber-800',
  fila_atendimento:        'bg-purple-100 text-purple-800',
  em_andamento:            'bg-indigo-100 text-indigo-800',
  pendente:                'bg-yellow-100 text-yellow-800',
  aprovado:                'bg-green-100 text-green-800',
  recusado:                'bg-red-100 text-red-800',
  digitacao:               'bg-cyan-100 text-cyan-800',
  limpa_nome:              'bg-pink-100 text-pink-800',
  rating_bancario:         'bg-orange-100 text-orange-800',
  valores:                 'bg-teal-100 text-teal-800',
  concluida:               'bg-emerald-100 text-emerald-800',
  cancelada:               'bg-gray-100 text-gray-700',
};

const PRIORIDADE_COR: Record<string, string> = {
  alta:  'bg-red-100 text-red-700 border-red-200',
  media: 'bg-orange-100 text-orange-700 border-orange-200',
  baixa: 'bg-blue-100 text-blue-700 border-blue-200',
};

const FORM_VAZIO = {
  titulo: '',
  descricao: '',
  tipo: 'ligacao' as Tarefa['tipo'],
  prioridade: 'media' as Tarefa['prioridade'],
  status: 'pendente' as Tarefa['status'],
  dataVencimento: '',
  responsavel: '',
};

function formatarHorario(dataStr: string) {
  if (!dataStr) return '';
  const d = new Date(dataStr);
  return isNaN(d.getTime()) ? dataStr : d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function Tarefas() {
  const { tarefas, adicionarTarefa, atualizarTarefa } = useCRM();
  const [abaAtiva, setAbaAtiva] = useState('todos');
  const [filtroPrioridade, setFiltroPrioridade] = useState('todos');
  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState({ ...FORM_VAZIO });

  const tarefasFiltradas = tarefas.filter((t) => {
    const okAba = abaAtiva === 'todos' || t.status === abaAtiva;
    const okPrior = filtroPrioridade === 'todos' || t.prioridade === filtroPrioridade;
    return okAba && okPrior;
  });

  const contar = (s: string) =>
    s === 'todos' ? tarefas.length : tarefas.filter((t) => t.status === s).length;

  const isAtrasada = (t: Tarefa) =>
    (t.status === 'pendente' || t.status === 'em_andamento') &&
    !!t.dataVencimento && new Date(t.dataVencimento) < new Date();

  const porPrioridade = [
    { label: 'Alta',  count: tarefas.filter((t) => t.prioridade === 'alta').length,  cor: '#ef4444' },
    { label: 'Média', count: tarefas.filter((t) => t.prioridade === 'media').length, cor: '#f97316' },
    { label: 'Baixa', count: tarefas.filter((t) => t.prioridade === 'baixa').length, cor: '#3b82f6' },
  ];
  const porTipo = [
    { label: 'Ligação',   count: tarefas.filter((t) => t.tipo === 'ligacao').length,   cor: '#22c55e' },
    { label: 'E-mail',    count: tarefas.filter((t) => t.tipo === 'email').length,     cor: '#8b5cf6' },
    { label: 'Reunião',   count: tarefas.filter((t) => t.tipo === 'reuniao').length,   cor: '#f59e0b' },
    { label: 'Follow-up', count: tarefas.filter((t) => t.tipo === 'follow-up').length, cor: '#ec4899' },
    { label: 'Outro',     count: tarefas.filter((t) => t.tipo === 'outro').length,     cor: '#6b7280' },
  ];
  const maxPrior = Math.max(...porPrioridade.map((p) => p.count), 1);
  const maxTipo  = Math.max(...porTipo.map((p) => p.count), 1);

  const handleSalvar = () => {
    if (!form.titulo.trim()) return;
    adicionarTarefa({ ...form });
    setForm({ ...FORM_VAZIO });
    setMostrarForm(false);
  };

  const getIconeTipo = (tipo: Tarefa['tipo']) => {
    if (tipo === 'ligacao') return Phone;
    if (tipo === 'reuniao') return Calendar;
    return CheckCircle;
  };

  return (
    <div className="space-y-5">

      {/* Cards de contagem */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Pendentes',    count: contar('pendente'),                          cor: '#f59e0b', Icon: Clock },
          { label: 'Em Andamento', count: contar('em_andamento'),                      cor: '#3b82f6', Icon: AlertCircle },
          { label: 'Concluídas',   count: contar('concluida'),                         cor: '#22c55e', Icon: CheckCircle },
          { label: 'Atrasadas',    count: tarefas.filter((t) => isAtrasada(t)).length, cor: '#ef4444', Icon: AlertCircle },
        ].map((card) => (
          <div key={card.label} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">{card.label}</p>
              <p className="text-2xl font-black mt-1" style={{ color: card.cor }}>{card.count}</p>
            </div>
            <card.Icon className="w-10 h-10 opacity-10" style={{ color: card.cor }} />
          </div>
        ))}
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-2 gap-5">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-sm font-bold text-gray-700 mb-4">Atendimentos por Prioridade</h3>
          <div className="space-y-3">
            {porPrioridade.map((p) => (
              <div key={p.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-600 font-medium">{p.label}</span>
                  <span className="font-bold" style={{ color: p.cor }}>{p.count}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3">
                  <div
                    className="h-3 rounded-full transition-all duration-500"
                    style={{ width: `${(p.count / maxPrior) * 100}%`, backgroundColor: p.cor, boxShadow: `0 0 6px ${p.cor}66` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-sm font-bold text-gray-700 mb-4">Atendimentos por Tipo</h3>
          <div className="space-y-3">
            {porTipo.map((p) => (
              <div key={p.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-600 font-medium">{p.label}</span>
                  <span className="font-bold" style={{ color: p.cor }}>{p.count}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3">
                  <div
                    className="h-3 rounded-full transition-all duration-500"
                    style={{ width: `${(p.count / maxTipo) * 100}%`, backgroundColor: p.cor, boxShadow: `0 0 6px ${p.cor}66` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Lista com abas */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">

        {/* Abas */}
        <div className="flex overflow-x-auto border-b border-gray-100">
          {ABAS_STATUS.map((aba) => (
            <button
              key={aba.id}
              onClick={() => setAbaAtiva(aba.id)}
              className={`flex-shrink-0 px-4 py-3 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
                abaAtiva === aba.id
                  ? 'border-amber-500 text-amber-600 bg-amber-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {aba.label}
              <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                abaAtiva === aba.id ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-500'
              }`}>
                {contar(aba.id)}
              </span>
            </button>
          ))}
        </div>

        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <select
              value={filtroPrioridade}
              onChange={(e) => setFiltroPrioridade(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600"
            >
              <option value="todos">Todas as Prioridades</option>
              <option value="alta">Alta</option>
              <option value="media">Média</option>
              <option value="baixa">Baixa</option>
            </select>
            <button
              onClick={() => setMostrarForm(true)}
              className="flex items-center gap-2 px-4 py-2 text-black rounded-lg font-bold text-xs shadow-md hover:opacity-90 transition-all"
              style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}
            >
              <Plus className="w-4 h-4" /> Novo Atendimento
            </button>
          </div>

          <div className="space-y-2.5">
            {tarefasFiltradas.map((tarefa) => {
              const Icone = getIconeTipo(tarefa.tipo);
              const atrasado = isAtrasada(tarefa);
              return (
                <div
                  key={tarefa.id}
                  className={`p-4 border rounded-xl transition-all ${
                    tarefa.status === 'concluida'
                      ? 'bg-gray-50 opacity-70 border-gray-100'
                      : atrasado
                      ? 'border-red-200 bg-red-50'
                      : 'border-gray-100 bg-white hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => atualizarTarefa(tarefa.id, {
                        status: tarefa.status === 'concluida' ? 'pendente' : 'concluida',
                      })}
                      className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                        tarefa.status === 'concluida'
                          ? 'bg-green-500 border-green-500'
                          : 'border-gray-300 hover:border-amber-500'
                      }`}
                    >
                      {tarefa.status === 'concluida' && <CheckCircle className="w-3 h-3 text-white" />}
                    </button>

                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${PRIORIDADE_COR[tarefa.prioridade]}`}>
                      <Icone className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                          <p className={`font-semibold text-sm ${tarefa.status === 'concluida' ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                            {tarefa.titulo}
                          </p>
                          {tarefa.descricao && (
                            <p className="text-xs text-gray-500 mt-0.5">{tarefa.descricao}</p>
                          )}
                        </div>
                        <div className="flex gap-1.5 flex-wrap">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${PRIORIDADE_COR[tarefa.prioridade]}`}>
                            {tarefa.prioridade}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_COR[tarefa.status] ?? 'bg-gray-100 text-gray-600'}`}>
                            {tarefa.status.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-4 mt-2 flex-wrap">
                        {tarefa.dataVencimento && (
                          <span className={`flex items-center gap-1 text-[11px] ${atrasado ? 'text-red-600 font-semibold' : 'text-gray-400'}`}>
                            <Clock className="w-3 h-3" />
                            {formatarHorario(tarefa.dataVencimento)}
                            {atrasado && ' · Atrasada'}
                          </span>
                        )}
                        {tarefa.responsavel && (
                          <span className="flex items-center gap-1 text-[11px] text-gray-400">
                            <User className="w-3 h-3" /> {tarefa.responsavel}
                          </span>
                        )}
                        <span className="text-[11px] text-gray-400 capitalize">
                          {tarefa.tipo === 'ligacao' ? 'Ligação' : tarefa.tipo}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {tarefasFiltradas.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-400 text-sm">Nenhum atendimento nesta aba</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Novo Atendimento */}
      {mostrarForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-black text-gray-900">Novo Atendimento</h2>
              <button onClick={() => setMostrarForm(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <input
                value={form.titulo}
                onChange={(e) => setForm((p) => ({ ...p, titulo: e.target.value }))}
                placeholder="Título do atendimento *"
                className="border border-gray-200 p-2.5 rounded-lg w-full text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <textarea
                value={form.descricao}
                onChange={(e) => setForm((p) => ({ ...p, descricao: e.target.value }))}
                placeholder="Descrição (opcional)"
                className="border border-gray-200 p-2.5 rounded-lg w-full text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                rows={2}
              />
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={form.tipo}
                  onChange={(e) => setForm((p) => ({ ...p, tipo: e.target.value as any }))}
                  className="border border-gray-200 p-2.5 rounded-lg text-sm"
                >
                  <option value="ligacao">Ligação</option>
                  <option value="email">E-mail</option>
                  <option value="reuniao">Reunião</option>
                  <option value="follow-up">Follow-up</option>
                  <option value="outro">Outro</option>
                </select>
                <select
                  value={form.prioridade}
                  onChange={(e) => setForm((p) => ({ ...p, prioridade: e.target.value as any }))}
                  className="border border-gray-200 p-2.5 rounded-lg text-sm"
                >
                  <option value="alta">Alta</option>
                  <option value="media">Média</option>
                  <option value="baixa">Baixa</option>
                </select>
                <input
                  type="datetime-local"
                  value={form.dataVencimento}
                  onChange={(e) => setForm((p) => ({ ...p, dataVencimento: e.target.value }))}
                  className="border border-gray-200 p-2.5 rounded-lg text-sm"
                />
                <input
                  value={form.responsavel}
                  onChange={(e) => setForm((p) => ({ ...p, responsavel: e.target.value }))}
                  placeholder="Responsável"
                  className="border border-gray-200 p-2.5 rounded-lg text-sm"
                />
              </div>
              <select
                value={form.status}
                onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as any }))}
                className="border border-gray-200 p-2.5 rounded-lg text-sm w-full"
              >
                <option value="pendente">Pendente</option>
                <option value="em_atendimento">Em Atendimento</option>
                <option value="proposta_em_atendimento">Proposta em Atendimento</option>
                <option value="fila_atendimento">Fila de Atendimento</option>
                <option value="em_andamento">Em Andamento</option>
                <option value="aprovado">Aprovado</option>
                <option value="recusado">Recusado</option>
                <option value="digitacao">Digitação</option>
                <option value="limpa_nome">Limpa Nome</option>
                <option value="rating_bancario">Rating Bancário</option>
                <option value="valores">Valores</option>
              </select>
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={handleSalvar}
                className="flex-1 py-2.5 text-black rounded-lg font-bold text-sm"
                style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}
              >
                Salvar
              </button>
              <button
                onClick={() => setMostrarForm(false)}
                className="px-4 py-2.5 bg-gray-100 rounded-lg text-sm text-gray-600 hover:bg-gray-200"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { useCRM } from '../../context/CRMContext';
import { Plus, Phone, Mail, Calendar, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { Tarefa } from '../../types';

export function Tarefas() {
  const { tarefas, atualizarTarefa } = useCRM();
  const [filtroStatus, setFiltroStatus] = useState<'todos' | Tarefa['status']>('todos');
  const [filtroPrioridade, setFiltroPrioridade] = useState<'todos' | Tarefa['prioridade']>('todos');

  const tarefasFiltradas = tarefas.filter((tarefa) => {
    const matchStatus = filtroStatus === 'todos' || tarefa.status === filtroStatus;
    const matchPrioridade = filtroPrioridade === 'todos' || tarefa.prioridade === filtroPrioridade;
    return matchStatus && matchPrioridade;
  });

  const handleToggleStatus = (tarefaId: string, statusAtual: Tarefa['status']) => {
    const novoStatus = statusAtual === 'concluida' ? 'pendente' : 'concluida';
    atualizarTarefa(tarefaId, { status: novoStatus });
  };

  const getIconeTipo = (tipo: Tarefa['tipo']) => {
    switch (tipo) {
      case 'ligacao': return Phone;
      case 'email': return Mail;
      case 'reuniao': return Calendar;
      default: return CheckCircle;
    }
  };

  const getCorPrioridade = (prioridade: Tarefa['prioridade']) => {
    switch (prioridade) {
      case 'alta': return 'text-red-600 bg-red-100 border-red-200';
      case 'media': return 'text-orange-600 bg-orange-100 border-orange-200';
      case 'baixa': return 'text-blue-600 bg-blue-100 border-blue-200';
    }
  };

  const getCorStatus = (status: Tarefa['status']) => {
    switch (status) {
      case 'concluida': return 'bg-green-100 text-green-800 border-green-200';
      case 'em_andamento': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'cancelada': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  const tarefasPorStatus = {
    pendente: tarefas.filter(t => t.status === 'pendente').length,
    em_andamento: tarefas.filter(t => t.status === 'em_andamento').length,
    concluida: tarefas.filter(t => t.status === 'concluida').length,
    atrasada: tarefas.filter(t => 
      (t.status === 'pendente' || t.status === 'em_andamento') && 
      new Date(t.dataVencimento) < new Date()
    ).length,
  };

  return (
    <div className="space-y-6">
      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pendentes</p>
              <p className="text-2xl font-bold text-yellow-600 mt-1">{tarefasPorStatus.pendente}</p>
            </div>
            <Clock className="w-10 h-10 text-yellow-600 opacity-20" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Em Andamento</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{tarefasPorStatus.em_andamento}</p>
            </div>
            <AlertCircle className="w-10 h-10 text-blue-600 opacity-20" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Concluídas</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{tarefasPorStatus.concluida}</p>
            </div>
            <CheckCircle className="w-10 h-10 text-green-600 opacity-20" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Atrasadas</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{tarefasPorStatus.atrasada}</p>
            </div>
            <AlertCircle className="w-10 h-10 text-red-600 opacity-20" />
          </div>
        </div>
      </div>

      {/* Filtros e Lista */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-4">
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="todos">Todos os Status</option>
              <option value="pendente">Pendente</option>
              <option value="em_andamento">Em Andamento</option>
              <option value="concluida">Concluída</option>
              <option value="cancelada">Cancelada</option>
            </select>

            <select
              value={filtroPrioridade}
              onChange={(e) => setFiltroPrioridade(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="todos">Todas as Prioridades</option>
              <option value="alta">Alta</option>
              <option value="media">Média</option>
              <option value="baixa">Baixa</option>
            </select>
          </div>

          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <Plus className="w-5 h-5" />
            Nova Tarefa
          </button>
        </div>

        <div className="space-y-3">
          {tarefasFiltradas.map((tarefa) => {
            const IconeTipo = getIconeTipo(tarefa.tipo);
            const isAtrasada = 
              (tarefa.status === 'pendente' || tarefa.status === 'em_andamento') &&
              new Date(tarefa.dataVencimento) < new Date();

            return (
              <div
                key={tarefa.id}
                className={`p-4 border rounded-lg transition-all ${
                  tarefa.status === 'concluida' ? 'bg-gray-50 opacity-75' : 'bg-white hover:shadow-md'
                } ${isAtrasada ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
              >
                <div className="flex items-start gap-4">
                  <button
                    onClick={() => handleToggleStatus(tarefa.id, tarefa.status)}
                    className={`mt-1 flex-shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                      tarefa.status === 'concluida'
                        ? 'bg-green-500 border-green-500'
                        : 'border-gray-300 hover:border-blue-500'
                    }`}
                  >
                    {tarefa.status === 'concluida' && (
                      <CheckCircle className="w-4 h-4 text-white" />
                    )}
                  </button>

                  <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${getCorPrioridade(tarefa.prioridade)}`}>
                    <IconeTipo className="w-5 h-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h4 className={`font-medium ${tarefa.status === 'concluida' ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                          {tarefa.titulo}
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">{tarefa.descricao}</p>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize border ${getCorPrioridade(tarefa.prioridade)}`}>
                          {tarefa.prioridade}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize border ${getCorStatus(tarefa.status)}`}>
                          {tarefa.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 mt-3 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span className={isAtrasada ? 'text-red-600 font-medium' : ''}>
                          {new Date(tarefa.dataVencimento).toLocaleDateString('pt-BR')}
                          {isAtrasada && ' (Atrasada)'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">Responsável:</span>
                        <span>{tarefa.responsavel}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 capitalize">Tipo:</span>
                        <span className="capitalize">{tarefa.tipo}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {tarefasFiltradas.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">Nenhuma tarefa encontrada</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

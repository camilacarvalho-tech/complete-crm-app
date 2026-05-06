import { useState } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useCRM } from '../../context/CRMContext';
import { Lead } from '../../types';
import { Plus, DollarSign, TrendingUp } from 'lucide-react';

const COLUNAS = [
  { id: 'novo', titulo: 'Novo', cor: 'bg-gray-100' },
  { id: 'contato', titulo: 'Em Contato', cor: 'bg-blue-100' },
  { id: 'qualificado', titulo: 'Qualificado', cor: 'bg-purple-100' },
  { id: 'proposta', titulo: 'Proposta', cor: 'bg-orange-100' },
  { id: 'negociacao', titulo: 'Negociação', cor: 'bg-yellow-100' },
  { id: 'ganho', titulo: 'Ganho', cor: 'bg-green-100' },
];

interface LeadCardProps {
  lead: Lead;
}

function LeadCard({ lead }: LeadCardProps) {
  const [{ isDragging }, drag] = useDrag({
    type: 'lead',
    item: { id: lead.id, status: lead.status },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  return (
    <div
      ref={drag}
      className={`bg-white p-4 rounded-lg shadow-sm border border-gray-200 cursor-move hover:shadow-md transition-shadow ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <h4 className="font-medium text-gray-900 mb-2">{lead.nome}</h4>
      <p className="text-sm text-gray-600 mb-3">{lead.empresa}</p>
      
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-1 text-green-600">
          <DollarSign className="w-4 h-4" />
          <span>R$ {lead.valor.toLocaleString('pt-BR')}</span>
        </div>
        <div className="flex items-center gap-1 text-blue-600">
          <TrendingUp className="w-4 h-4" />
          <span>{lead.probabilidade}%</span>
        </div>
      </div>

      {lead.proximaAcao && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-500">Próxima ação:</p>
          <p className="text-sm text-gray-700 mt-1">{lead.proximaAcao}</p>
        </div>
      )}
    </div>
  );
}

interface ColunaProps {
  coluna: typeof COLUNAS[0];
  leads: Lead[];
  onDrop: (leadId: string, novoStatus: string) => void;
}

function Coluna({ coluna, leads, onDrop }: ColunaProps) {
  const [{ isOver }, drop] = useDrop({
    accept: 'lead',
    drop: (item: { id: string; status: string }) => {
      if (item.status !== coluna.id) {
        onDrop(item.id, coluna.id);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  const valorTotal = leads.reduce((acc, lead) => acc + lead.valor, 0);

  return (
    <div
      ref={drop}
      className={`flex-shrink-0 w-80 ${coluna.cor} rounded-lg p-4 ${
        isOver ? 'ring-2 ring-blue-500' : ''
      }`}
    >
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-gray-800">{coluna.titulo}</h3>
          <span className="bg-white px-2 py-1 rounded-full text-sm font-medium text-gray-700">
            {leads.length}
          </span>
        </div>
        <p className="text-sm text-gray-600">
          R$ {valorTotal.toLocaleString('pt-BR')}
        </p>
      </div>

      <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto">
        {leads.map((lead) => (
          <LeadCard key={lead.id} lead={lead} />
        ))}
      </div>

      <button className="w-full mt-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors flex items-center justify-center gap-2">
        <Plus className="w-4 h-4" />
        Adicionar Lead
      </button>
    </div>
  );
}

export function Pipeline() {
  const { leads, atualizarLead } = useCRM();

  const handleDrop = (leadId: string, novoStatus: string) => {
    atualizarLead(leadId, { status: novoStatus as Lead['status'] });
  };

  const leadsPorPerdido = leads.filter(l => l.status === 'perdido');
  const valorPerdido = leadsPorPerdido.reduce((acc, l) => acc + l.valor, 0);

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-6">
        {/* Estatísticas */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <p className="text-sm text-gray-600">Total de Leads</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{leads.length}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <p className="text-sm text-gray-600">Valor Total Pipeline</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              R$ {leads.reduce((acc, l) => acc + l.valor, 0).toLocaleString('pt-BR')}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <p className="text-sm text-gray-600">Taxa de Conversão</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {leads.length > 0 
                ? ((leads.filter(l => l.status === 'ganho').length / leads.length) * 100).toFixed(1)
                : 0}%
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <p className="text-sm text-gray-600">Oportunidades Perdidas</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{leadsPorPerdido.length}</p>
          </div>
        </div>

        {/* Pipeline Kanban */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-6">Pipeline de Vendas</h3>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {COLUNAS.map((coluna) => (
              <Coluna
                key={coluna.id}
                coluna={coluna}
                leads={leads.filter((lead) => lead.status === coluna.id)}
                onDrop={handleDrop}
              />
            ))}
          </div>
        </div>

        {/* Leads Perdidos */}
        {leadsPorPerdido.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Oportunidades Perdidas ({leadsPorPerdido.length})
            </h3>
            <div className="grid grid-cols-3 gap-4">
              {leadsPorPerdido.map((lead) => (
                <div key={lead.id} className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <h4 className="font-medium text-gray-900">{lead.nome}</h4>
                  <p className="text-sm text-gray-600">{lead.empresa}</p>
                  <p className="text-sm text-red-600 mt-2">
                    Valor perdido: R$ {lead.valor.toLocaleString('pt-BR')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DndProvider>
  );
}

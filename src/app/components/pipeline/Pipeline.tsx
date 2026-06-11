import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

import { useCRM } from '../../context/CRMContext';

import {
  Plus,
  Phone,
  User
} from 'lucide-react';

const COLUNAS = [
  {
    id: 'novo',
    titulo: 'Novo',
    cor: 'bg-gray-100'
  },
  {
    id: 'contato',
    titulo: 'Em Contato',
    cor: 'bg-blue-100'
  },
  {
    id: 'qualificado',
    titulo: 'Qualificado',
    cor: 'bg-purple-100'
  },
  {
    id: 'proposta',
    titulo: 'Proposta',
    cor: 'bg-orange-100'
  },
  {
    id: 'ganho',
    titulo: 'Ganho',
    cor: 'bg-green-100'
  }
];

interface LeadCardProps {
  lead: any;
}

function LeadCard({ lead }: LeadCardProps) {

  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'lead',

    item: {
      id: lead.id,
      status: lead.status || 'novo'
    },

    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  }));

  return (

    <div
      ref={drag}
      className={`bg-white p-4 rounded-lg shadow-sm border border-gray-200 cursor-move hover:shadow-md transition-shadow ${
        isDragging ? 'opacity-50' : ''
      }`}
    >

      <div className="flex items-center gap-2 mb-2">

        <User className="w-4 h-4 text-gray-500" />

        <h4 className="font-medium text-gray-900">
          {lead.nome || 'Sem Nome'}
        </h4>

      </div>

      <p className="text-sm text-gray-600 mb-2">
        CPF: {lead.cpf || 'Não informado'}
      </p>

      <p className="text-sm text-gray-600 mb-2">
        Modalidade: {lead.modalidade || 'Não informado'}
      </p>

      <p className="text-sm text-gray-600 mb-3">
        Nascimento: {lead.nascimento || 'Não informado'}
      </p>

      {lead.telefone ? (

        <a
          href={`https://wa.me/55${lead.telefone}`}
          target="_blank"
          className="flex items-center gap-2 text-green-600 hover:text-green-700 text-sm font-medium"
        >

          <Phone className="w-4 h-4" />

          WhatsApp

        </a>

      ) : (

        <p className="text-xs text-gray-400">
          Sem telefone
        </p>

      )}

    </div>
  );
}

interface ColunaProps {
  coluna: typeof COLUNAS[0];
  leads: any[];
  onDrop: (leadId: string, novoStatus: string) => void;
}

function Coluna({
  coluna,
  leads,
  onDrop
}: ColunaProps) {

  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'lead',

    drop: (item: any) => {

      if (item.status !== coluna.id) {
        onDrop(item.id, coluna.id);
      }

    },

    collect: (monitor) => ({
      isOver: monitor.isOver()
    })
  }));

  return (

    <div
      ref={drop}
      className={`flex-shrink-0 w-80 ${coluna.cor} rounded-lg p-4 ${
        isOver ? 'ring-2 ring-blue-500' : ''
      }`}
    >

      <div className="mb-4">

        <div className="flex items-center justify-between mb-2">

          <h3 className="font-semibold text-gray-800">
            {coluna.titulo}
          </h3>

          <span className="bg-white px-2 py-1 rounded-full text-sm font-medium text-gray-700">
            {leads.length}
          </span>

        </div>

      </div>

      <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto">

        {leads.map((lead) => (
          <LeadCard
            key={lead.id}
            lead={lead}
          />
        ))}

      </div>

      <button className="w-full mt-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors flex items-center justify-center gap-2">

        <Plus className="w-4 h-4" />

        Novo Lead

      </button>

    </div>
  );
}

export function Pipeline() {

  const {
    leads,
    atualizarLead
  } = useCRM();

  const handleDrop = (
    leadId: string,
    novoStatus: string
  ) => {

    atualizarLead(
      leadId,
      {
        status: novoStatus as any
      }
    );
  };

  return (

    <DndProvider backend={HTML5Backend}>

      <div className="space-y-6">

        {/* ESTATÍSTICAS */}
        <div className="grid grid-cols-4 gap-4">

          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">

            <p className="text-sm text-gray-600">
              Total de Leads
            </p>

            <p className="text-2xl font-bold text-gray-900 mt-1">
              {leads.length}
            </p>

          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">

            <p className="text-sm text-gray-600">
              Leads Novos
            </p>

            <p className="text-2xl font-bold text-blue-600 mt-1">
              {
                leads.filter(
                  (l: any) =>
                    (l.status || 'novo') === 'novo'
                ).length
              }
            </p>

          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">

            <p className="text-sm text-gray-600">
              Qualificados
            </p>

            <p className="text-2xl font-bold text-purple-600 mt-1">
              {
                leads.filter(
                  (l: any) =>
                    l.status === 'qualificado'
                ).length
              }
            </p>

          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">

            <p className="text-sm text-gray-600">
              Ganhos
            </p>

            <p className="text-2xl font-bold text-green-600 mt-1">
              {
                leads.filter(
                  (l: any) =>
                    l.status === 'ganho'
                ).length
              }
            </p>

          </div>

        </div>

        {/* PIPELINE */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">

          <h3 className="text-lg font-semibold text-gray-800 mb-6">
            Pipeline de Leads
          </h3>

          <div className="flex gap-4 overflow-x-auto pb-4">

            {COLUNAS.map((coluna) => (

              <Coluna
                key={coluna.id}
                coluna={coluna}
                leads={
                  leads.filter(
                    (lead: any) =>
                      (lead.status || 'novo') === coluna.id
                  )
                }
                onDrop={handleDrop}
              />

            ))}

          </div>

        </div>

      </div>

    </DndProvider>
  );
}
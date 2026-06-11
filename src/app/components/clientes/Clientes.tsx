import { useState } from 'react';
import { useCRM } from '../../context/CRMContext';
import {
  Search,
  Phone,
  Filter
} from 'lucide-react';

export function Clientes() {

  const { leads } = useCRM();

  const [busca, setBusca] = useState('');

  const leadsFiltrados = leads.filter((lead: any) => {

    return (
      lead.nome?.toLowerCase().includes(busca.toLowerCase()) ||
      lead.cpf?.includes(busca)
    );

  });

  return (

    <div className="space-y-6">

      {/* CABEÇALHO */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">

        <div className="flex items-center justify-between mb-6">

          <div>
            <h3 className="text-lg font-semibold text-gray-800">
              Leads Recebidos
            </h3>

            <p className="text-sm text-gray-500">
              {leads.length} leads no total
            </p>
          </div>

        </div>

        {/* BUSCA */}
        <div className="flex gap-4">

          <div className="flex-1 relative">

            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />

            <input
              type="text"
              placeholder="Buscar por nome ou CPF..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
            />

          </div>

          <div className="flex items-center gap-2">

            <Filter className="w-5 h-5 text-gray-500" />

            <span className="text-sm text-gray-500">
              Firebase Realtime
            </span>

          </div>

        </div>

      </div>

      {/* TABELA */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">

        <table className="w-full">

          <thead className="bg-gray-50 border-b border-gray-200">

            <tr>

              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Nome
              </th>

              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                CPF
              </th>

              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Modalidade
              </th>

              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Nascimento
              </th>

              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                WhatsApp
              </th>

            </tr>

          </thead>

          <tbody className="divide-y divide-gray-200">

            {leadsFiltrados.map((lead: any) => (

              <tr
                key={lead.id}
                className="hover:bg-gray-50 transition-colors"
              >

                <td className="px-6 py-4 font-medium text-gray-900">
                  {lead.nome}
                </td>

                <td className="px-6 py-4">
                  {lead.cpf}
                </td>

                <td className="px-6 py-4">
                  {lead.modalidade}
                </td>

                <td className="px-6 py-4">
                  {lead.nascimento}
                </td>

                <td className="px-6 py-4">

                  {lead.telefone ? (

                    <a
                      href={`https://wa.me/55${lead.telefone}`}
                      target="_blank"
                      className="flex items-center gap-2 text-green-600 hover:text-green-700"
                    >

                      <Phone className="w-4 h-4" />

                      WhatsApp

                    </a>

                  ) : (

                    <span className="text-gray-400 text-sm">
                      Sem telefone
                    </span>

                  )}

                </td>

              </tr>

            ))}

          </tbody>

        </table>

        {leadsFiltrados.length === 0 && (

          <div className="text-center py-12">

            <p className="text-gray-500">
              Nenhum lead encontrado
            </p>

          </div>

        )}

      </div>

    </div>

  );
}
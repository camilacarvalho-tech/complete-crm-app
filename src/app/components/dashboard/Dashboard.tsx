<h1 className="text-red-500 text-5xl">
  DASHBOARD NOVO FUNCIONANDO
</h1>

import { useCRM } from '../../context/CRMContext';

import {
  Users,
  TrendingUp,
  CheckCircle,
  Phone
} from 'lucide-react';

export function Dashboard() {

  const { leads } = useCRM();

  const totalLeads = leads.length;

  const leadsNovos = leads.filter(
    (lead: any) =>
      (lead.status || 'novo') === 'novo'
  ).length;

  const leadsQualificados = leads.filter(
    (lead: any) =>
      lead.status === 'qualificado'
  ).length;

  const leadsGanhos = leads.filter(
    (lead: any) =>
      lead.status === 'ganho'
  ).length;

  const taxaConversao =
    totalLeads > 0
      ? (
          (leadsGanhos / totalLeads) * 100
        ).toFixed(1)
      : '0';

  return (

    <div className="space-y-6">

      {/* CARDS */}
      <div className="grid grid-cols-4 gap-6">

        {/* TOTAL LEADS */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-sm text-gray-600">
                Total de Leads
              </p>

              <p className="text-3xl font-bold text-gray-900 mt-2">
                {totalLeads}
              </p>

              <p className="text-sm text-blue-600 mt-2">
                Firebase Realtime
              </p>

            </div>

            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">

              <Users className="w-6 h-6 text-blue-600" />

            </div>

          </div>

        </div>

        {/* LEADS NOVOS */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-sm text-gray-600">
                Leads Novos
              </p>

              <p className="text-3xl font-bold text-gray-900 mt-2">
                {leadsNovos}
              </p>

              <p className="text-sm text-orange-600 mt-2">
                Entrada do Site
              </p>

            </div>

            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">

              <TrendingUp className="w-6 h-6 text-orange-600" />

            </div>

          </div>

        </div>

        {/* QUALIFICADOS */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-sm text-gray-600">
                Qualificados
              </p>

              <p className="text-3xl font-bold text-gray-900 mt-2">
                {leadsQualificados}
              </p>

              <p className="text-sm text-purple-600 mt-2">
                Em andamento
              </p>

            </div>

            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">

              <CheckCircle className="w-6 h-6 text-purple-600" />

            </div>

          </div>

        </div>

        {/* CONVERSÃO */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-sm text-gray-600">
                Conversão
              </p>

              <p className="text-3xl font-bold text-gray-900 mt-2">
                {taxaConversao}%
              </p>

              <p className="text-sm text-green-600 mt-2">
                Leads ganhos
              </p>

            </div>

            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">

              <Phone className="w-6 h-6 text-green-600" />

            </div>

          </div>

        </div>

      </div>

      {/* LISTA LEADS */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">

        <h3 className="text-lg font-semibold text-gray-800 mb-6">
          Últimos Leads Recebidos
        </h3>

        <div className="space-y-4">

          {leads.length === 0 && (

            <div className="text-center py-10">

              <p className="text-gray-500">
                Nenhum lead recebido ainda
              </p>

            </div>

          )}

          {leads.slice(0, 10).map((lead: any) => (

            <div
              key={lead.id}
              className="border border-gray-200 rounded-lg p-4 flex items-center justify-between"
            >

              <div>

                <h4 className="font-semibold text-gray-900">
                  {lead.nome || 'Sem Nome'}
                </h4>

                <p className="text-sm text-gray-600">
                  CPF: {lead.cpf || 'Não informado'}
                </p>

                <p className="text-sm text-gray-600">
                  Modalidade: {lead.modalidade || 'Não informado'}
                </p>

              </div>

              <div>

                <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm capitalize">

                  {lead.status || 'novo'}

                </span>

              </div>

            </div>

          ))}

        </div>

      </div>

    </div>

  );
}
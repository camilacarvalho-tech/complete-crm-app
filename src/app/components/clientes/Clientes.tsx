import { useState } from 'react';
import { useCRM } from '../../context/CRMContext';
import { ClienteForm } from './ClienteForm';
import { Search, Phone, Eye, Plus } from 'lucide-react';

const ABAS = [
  { label: 'Todos', status: null },
  { label: 'Lead', status: 'Lead' },
  { label: 'Em Atendimento', status: 'Em Atendimento' },
  { label: 'Doc. Recebida', status: 'Documentacao Recebida' },
  { label: 'Analise Bancaria', status: 'Analise Bancaria' },
  { label: 'Aprovado', status: 'Aprovado' },
  { label: 'Pago', status: 'Pago' },
  { label: 'Recusado', status: 'Recusado' },
];

const STATUS_CORES: Record<string, string> = {
  'Lead': 'bg-gray-100 text-gray-700',
  'Em Atendimento': 'bg-blue-100 text-blue-700',
  'Documentacao Recebida': 'bg-yellow-100 text-yellow-700',
  'Analise Bancaria': 'bg-purple-100 text-purple-700',
  'Aprovado': 'bg-green-100 text-green-700',
  'Pago': 'bg-emerald-100 text-emerald-700',
  'Recusado': 'bg-red-100 text-red-700',
};

export function Clientes() {
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [clienteEditando, setClienteEditando] = useState<any>(null);
  const { clientes } = useCRM();
  const [busca, setBusca] = useState('');
  const [abaAtiva, setAbaAtiva] = useState<string | null>(null);

  const clientesFiltrados = clientes.filter((cl: any) => {
    const buscaOk =
      cl.nome?.toLowerCase().includes(busca.toLowerCase()) ||
      cl.cpf?.includes(busca) ||
      cl.whatsapp?.includes(busca);
    const abaOk = abaAtiva === null || cl.status === abaAtiva;
    return buscaOk && abaOk;
  });

  const contar = (status: string | null) =>
    status === null ? clientes.length : clientes.filter((cl: any) => cl.status === status).length;

  return (
    <div className="space-y-4">
      <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Clientes</h3>
            <p className="text-sm text-gray-500">{clientes.length} registros</p>
          </div>
          <button
            onClick={() => { setClienteEditando(null); setMostrarFormulario(true); }}
            className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-black px-4 py-2 rounded-lg font-semibold"
          >
            <Plus className="w-4 h-4" /> Novo Cliente
          </button>
        </div>
        <div className="relative">
          <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nome, CPF ou WhatsApp..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {ABAS.map((aba) => (
          <button
            key={aba.label}
            onClick={() => setAbaAtiva(aba.status)}
            className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
              abaAtiva === aba.status
                ? 'bg-yellow-500 border-yellow-500 text-black'
                : 'bg-white border-gray-200 text-gray-600 hover:border-yellow-400'
            }`}
          >
            {aba.label}
            <span className="ml-2 bg-black/10 rounded-full px-2 py-0.5 text-xs">
              {contar(aba.status)}
            </span>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">CPF</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">WhatsApp</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Modalidade</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {clientesFiltrados.map((cl: any) => (
              <tr key={cl.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 font-medium text-gray-900">{cl.nome}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{cl.cpf}</td>
                <td className="px-6 py-4">
                  {cl.whatsapp ? (
                    <a
                      href={`https://wa.me/55${cl.whatsapp.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-green-600 text-sm"
                    >
                      <Phone className="w-4 h-4" /> {cl.whatsapp}
                    </a>
                  ) : (
                    <span className="text-gray-400 text-sm">—</span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{cl.modalidade || '—'}</td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_CORES[cl.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {cl.status || 'Lead'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => { setClienteEditando(cl); setMostrarFormulario(true); }}
                    className="flex items-center gap-1 bg-yellow-500 hover:bg-yellow-600 text-black px-3 py-1.5 rounded-lg text-sm font-medium"
                  >
                    <Eye className="w-4 h-4" /> Abrir
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {clientesFiltrados.length === 0 && (
          <div className="text-center py-16">
            <p className="text-gray-400 text-sm">Nenhum cliente encontrado</p>
          </div>
        )}
      </div>

      {mostrarFormulario && (
        <ClienteForm cliente={clienteEditando} onClose={() => setMostrarFormulario(false)} />
      )}
    </div>
  );
}

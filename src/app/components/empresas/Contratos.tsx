import { useState, useEffect } from 'react';
import { 
  Plus, Edit, Trash2, Search, FileText, 
  Download, Calendar, Building, DollarSign,
  X, Save, CheckCircle, AlertCircle, Paperclip
} from 'lucide-react';
import { db } from '../../../firebase';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';

interface Contrato {
  id?: string;
  numeroContrato: string;
  empresa: string;
  cnpj: string;
  plano: string;
  valorMensal: number;
  dataInicio: string;
  dataTermino: string;
  renovacaoAutomatica: boolean;
  status: string;
  arquivoPDF: string;
  observacoes: string;
  responsavel: string;
  formaPagamento: string;
}

const FORM_VAZIO: Contrato = {
  numeroContrato: '',
  empresa: '',
  cnpj: '',
  plano: '',
  valorMensal: 0,
  dataInicio: '',
  dataTermino: '',
  renovacaoAutomatica: false,
  status: 'Ativo',
  arquivoPDF: '',
  observacoes: '',
  responsavel: '',
  formaPagamento: 'Boleto'
};

const PLANOS = [
  'Básico',
  'Profissional',
  'Empresarial',
  'Premium',
  'Enterprise'
];

const STATUS_OPCOES = ['Todos', 'Ativo', 'Pendente', 'Vencido', 'Cancelado', 'Suspenso'];
const FORMAS_PAGAMENTO = ['Boleto', 'PIX', 'Transferência', 'Cartão de Crédito', 'Débito Automático'];

export function Contratos() {
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState<Contrato>(FORM_VAZIO);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('Todos');

  useEffect(() => {
    carregarContratos();
  }, []);

  async function carregarContratos() {
    try {
      const snapshot = await getDocs(collection(db, 'contratos'));
      const lista = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Contrato[];
      setContratos(lista);
    } catch (error) {
      const localData = localStorage.getItem('contratos');
      if (localData) {
        setContratos(JSON.parse(localData));
      }
    }
  }

  function gerarNumeroContrato() {
    const ano = new Date().getFullYear();
    const numero = (contratos.length + 1).toString().padStart(5, '0');
    return `CTR${ano}-${numero}`;
  }

  async function salvarContrato() {
    if (!form.empresa || !form.plano || !form.dataInicio) {
      alert('Preencha os campos obrigatórios: Empresa, Plano e Data de Início');
      return;
    }

    const contratoParaSalvar = {
      ...form,
      numeroContrato: form.numeroContrato || gerarNumeroContrato()
    };

    try {
      if (editandoId) {
        await updateDoc(doc(db, 'contratos', editandoId), contratoParaSalvar);
        alert('Contrato atualizado!');
      } else {
        await addDoc(collection(db, 'contratos'), {
          ...contratoParaSalvar,
          criadoEm: serverTimestamp()
        });
        alert('Contrato cadastrado!');
      }
      await carregarContratos();
      fecharForm();
    } catch (error) {
      const lista = [...contratos];
      if (editandoId) {
        const index = lista.findIndex(c => c.id === editandoId);
        if (index !== -1) lista[index] = { ...contratoParaSalvar, id: editandoId };
      } else {
        lista.push({ ...contratoParaSalvar, id: Date.now().toString() });
      }
      setContratos(lista);
      localStorage.setItem('contratos', JSON.stringify(lista));
      alert('Contrato salvo localmente!');
      fecharForm();
    }
  }

  async function excluirContrato(id: string) {
    if (!confirm('Deseja realmente excluir este contrato?')) return;

    try {
      await deleteDoc(doc(db, 'contratos', id));
      await carregarContratos();
      alert('Contrato excluído!');
    } catch (error) {
      const lista = contratos.filter(c => c.id !== id);
      setContratos(lista);
      localStorage.setItem('contratos', JSON.stringify(lista));
      alert('Contrato excluído!');
    }
  }

  function editarContrato(contrato: Contrato) {
    setForm(contrato);
    setEditandoId(contrato.id || null);
    setMostrarForm(true);
  }

  function fecharForm() {
    setForm(FORM_VAZIO);
    setEditandoId(null);
    setMostrarForm(false);
  }

  function handleArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (arquivo) {
      setForm({ ...form, arquivoPDF: arquivo.name });
    }
  }

  const contratosFiltrados = contratos.filter(c => {
    const matchBusca = busca === '' ||
      c.numeroContrato.toLowerCase().includes(busca.toLowerCase()) ||
      c.empresa.toLowerCase().includes(busca.toLowerCase());
    
    const matchStatus = filtroStatus === 'Todos' || c.status === filtroStatus;
    
    return matchBusca && matchStatus;
  });

  const contratosAtivos = contratos.filter(c => c.status === 'Ativo').length;
  const receitaMensal = contratos
    .filter(c => c.status === 'Ativo')
    .reduce((sum, c) => sum + c.valorMensal, 0);

  const real = (n: number) => 
    'R$ ' + Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });

  const STATUS_CORES: Record<string, string> = {
    Ativo: 'bg-green-100 text-green-800',
    Pendente: 'bg-yellow-100 text-yellow-800',
    Vencido: 'bg-red-100 text-red-800',
    Cancelado: 'bg-gray-100 text-gray-800',
    Suspenso: 'bg-orange-100 text-orange-800'
  };

  return (
    <div className="space-y-5">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl shadow-lg">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Contratos de Empresas</h2>
            <p className="text-sm text-gray-500">Gerencie contratos e acordos comerciais</p>
          </div>
        </div>
        <button
          onClick={() => {
            setForm({ ...FORM_VAZIO, numeroContrato: gerarNumeroContrato() });
            setMostrarForm(true);
          }}
          className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg hover:from-cyan-700 hover:to-blue-700 transition-all font-medium shadow-lg"
        >
          <Plus className="w-5 h-5" />
          Novo Contrato
        </button>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500">Contratos Ativos</span>
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-green-600">{contratosAtivos}</p>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500">Receita Mensal</span>
            <DollarSign className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-blue-600">{real(receitaMensal)}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500">Total de Contratos</span>
            <FileText className="w-5 h-5 text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-purple-600">{contratos.length}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500">Ticket Médio</span>
            <DollarSign className="w-5 h-5 text-orange-500" />
          </div>
          <p className="text-2xl font-bold text-orange-600">
            {real(contratos.length > 0 ? receitaMensal / contratosAtivos || 0 : 0)}
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar contrato ou empresa..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            {STATUS_OPCOES.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Lista de Contratos */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {contratosFiltrados.length === 0 ? (
          <div className="p-10 text-center text-gray-400">
            <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">Nenhum contrato encontrado</p>
            <p className="text-sm mt-1">Clique em "Novo Contrato" para cadastrar</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Nº Contrato</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Empresa</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Plano</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Valor</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Início</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Término</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {contratosFiltrados.map((contrato) => (
                  <tr key={contrato.id} className="hover:bg-gray-50 transition-all">
                    <td className="px-4 py-3 text-sm font-medium text-gray-800">
                      {contrato.numeroContrato}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {contrato.empresa}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {contrato.plano}
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-right text-cyan-600">
                      {real(contrato.valorMensal)}/mês
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(contrato.dataInicio).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {contrato.dataTermino ? new Date(contrato.dataTermino).toLocaleDateString('pt-BR') : 'Indeterminado'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${STATUS_CORES[contrato.status]}`}>
                        {contrato.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => editarContrato(contrato)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => excluirContrato(contrato.id!)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Formulário */}
      {mostrarForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-gradient-to-r from-cyan-50 to-blue-50 p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">
                      {editandoId ? 'Editar Contrato' : 'Novo Contrato'}
                    </h3>
                    <p className="text-sm text-gray-600">Contrato Nº {form.numeroContrato}</p>
                  </div>
                </div>
                <button onClick={fecharForm} className="p-2 hover:bg-white/50 rounded-lg transition-all">
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Dados da Empresa */}
              <div className="bg-gray-50 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Building className="w-5 h-5 text-cyan-600" />
                  <h4 className="font-bold text-gray-800">Dados da Empresa</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Empresa *</label>
                    <input
                      type="text"
                      value={form.empresa}
                      onChange={(e) => setForm({ ...form, empresa: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      placeholder="Nome da empresa"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">CNPJ</label>
                    <input
                      type="text"
                      value={form.cnpj}
                      onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      placeholder="00.000.000/0000-00"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Responsável</label>
                    <input
                      type="text"
                      value={form.responsavel}
                      onChange={(e) => setForm({ ...form, responsavel: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      placeholder="Nome do responsável"
                    />
                  </div>
                </div>
              </div>

              {/* Plano e Valores */}
              <div className="bg-gray-50 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  <h4 className="font-bold text-gray-800">Plano e Valores</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Plano *</label>
                    <select
                      value={form.plano}
                      onChange={(e) => setForm({ ...form, plano: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      required
                    >
                      <option value="">Selecione...</option>
                      {PLANOS.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Valor Mensal *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={form.valorMensal || ''}
                      onChange={(e) => setForm({ ...form, valorMensal: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      placeholder="0,00"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Forma de Pagamento</label>
                    <select
                      value={form.formaPagamento}
                      onChange={(e) => setForm({ ...form, formaPagamento: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    >
                      {FORMAS_PAGAMENTO.map(f => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Vigência do Contrato */}
              <div className="bg-gray-50 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  <h4 className="font-bold text-gray-800">Vigência do Contrato</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Data de Início *</label>
                    <input
                      type="date"
                      value={form.dataInicio}
                      onChange={(e) => setForm({ ...form, dataInicio: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Data de Término</label>
                    <input
                      type="date"
                      value={form.dataTermino}
                      onChange={(e) => setForm({ ...form, dataTermino: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                    <select
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    >
                      <option value="Ativo">Ativo</option>
                      <option value="Pendente">Pendente</option>
                      <option value="Vencido">Vencido</option>
                      <option value="Cancelado">Cancelado</option>
                      <option value="Suspenso">Suspenso</option>
                    </select>
                  </div>

                  <div className="sm:col-span-3 flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="renovacao"
                      checked={form.renovacaoAutomatica}
                      onChange={(e) => setForm({ ...form, renovacaoAutomatica: e.target.checked })}
                      className="w-4 h-4 text-cyan-600 border-gray-300 rounded focus:ring-cyan-500"
                    />
                    <label htmlFor="renovacao" className="text-sm text-gray-700 cursor-pointer">
                      Renovação Automática
                    </label>
                  </div>
                </div>
              </div>

              {/* Arquivo e Observações */}
              <div className="bg-gray-50 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Paperclip className="w-5 h-5 text-purple-600" />
                  <h4 className="font-bold text-gray-800">Documentos e Observações</h4>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-2">Arquivo PDF do Contrato</label>
                    <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer transition-all border border-gray-300">
                      <Paperclip className="w-4 h-4 text-gray-600" />
                      <span className="text-sm font-medium text-gray-700">
                        {form.arquivoPDF || 'Selecionar arquivo PDF'}
                      </span>
                      <input
                        type="file"
                        onChange={handleArquivo}
                        className="hidden"
                        accept=".pdf"
                      />
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Observações</label>
                    <textarea
                      value={form.observacoes}
                      onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      rows={3}
                      placeholder="Observações gerais sobre o contrato..."
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 p-6 border-t border-gray-200 flex gap-3">
              <button
                onClick={salvarContrato}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg hover:from-cyan-700 hover:to-blue-700 transition-all font-medium"
              >
                <Save className="w-5 h-5" />
                {editandoId ? 'Atualizar' : 'Salvar'}
              </button>
              <button
                onClick={fecharForm}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all font-medium"
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

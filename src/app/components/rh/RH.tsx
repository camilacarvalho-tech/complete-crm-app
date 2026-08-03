import { useState, useEffect } from 'react';
import { 
  Plus, Edit, Trash2, Search, Users, 
  Calendar, DollarSign, Briefcase, Mail,
  X, Save, Phone, MapPin, FileText, Award
} from 'lucide-react';
import { db } from '../../../firebase';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';

interface Funcionario {
  id?: string;
  matricula: string;
  nome: string;
  cpf: string;
  rg: string;
  dataNascimento: string;
  cargo: string;
  departamento: string;
  dataAdmissao: string;
  salario: number;
  situacao: string;
  telefone: string;
  email: string;
  endereco: string;
  beneficios: string[];
  observacoes: string;
}

const FORM_VAZIO: Funcionario = {
  matricula: '',
  nome: '',
  cpf: '',
  rg: '',
  dataNascimento: '',
  cargo: '',
  departamento: '',
  dataAdmissao: '',
  salario: 0,
  situacao: 'Ativo',
  telefone: '',
  email: '',
  endereco: '',
  beneficios: [],
  observacoes: ''
};

const CARGOS = [
  'Diretor', 'Gerente', 'Coordenador', 'Supervisor',
  'Analista Sênior', 'Analista Pleno', 'Analista Júnior',
  'Assistente', 'Auxiliar', 'Estagiário', 'Trainee'
];

const DEPARTAMENTOS = [
  'Administrativo', 'Comercial', 'Financeiro', 'Marketing',
  'TI', 'RH', 'Operacional', 'Atendimento', 'Logística'
];

const BENEFICIOS_OPCOES = [
  'Vale Transporte', 'Vale Alimentação', 'Vale Refeição',
  'Plano de Saúde', 'Plano Odontológico', 'Seguro de Vida',
  'Auxílio Creche', 'Gympass', 'Home Office'
];

const SITUACOES = ['Todos', 'Ativo', 'Férias', 'Afastado', 'Desligado'];

export function RH() {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState<Funcionario>(FORM_VAZIO);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [filtroSituacao, setFiltroSituacao] = useState('Todos');
  const [filtroDepartamento, setFiltroDepartamento] = useState('Todos');

  useEffect(() => {
    carregarFuncionarios();
  }, []);

  async function carregarFuncionarios() {
    try {
      const snapshot = await getDocs(collection(db, 'funcionarios'));
      const lista = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Funcionario[];
      setFuncionarios(lista);
    } catch (error) {
      const localData = localStorage.getItem('funcionarios');
      if (localData) {
        setFuncionarios(JSON.parse(localData));
      }
    }
  }

  function gerarMatricula() {
    const ano = new Date().getFullYear();
    const numero = (funcionarios.length + 1).toString().padStart(4, '0');
    return `${ano}${numero}`;
  }

  function mascaraCPF(valor: string) {
    return valor
      .replace(/\D/g, '')
      .replace(/^(\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1-$2')
      .substring(0, 14);
  }

  function mascaraTelefone(valor: string) {
    return valor
      .replace(/\D/g, '')
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .substring(0, 15);
  }

  function toggleBeneficio(beneficio: string) {
    const beneficios = form.beneficios.includes(beneficio)
      ? form.beneficios.filter(b => b !== beneficio)
      : [...form.beneficios, beneficio];
    setForm({ ...form, beneficios });
  }

  async function salvarFuncionario() {
    if (!form.nome || !form.cargo || !form.departamento) {
      alert('Preencha os campos obrigatórios: Nome, Cargo e Departamento');
      return;
    }

    const funcionarioParaSalvar = {
      ...form,
      matricula: form.matricula || gerarMatricula()
    };

    try {
      if (editandoId) {
        await updateDoc(doc(db, 'funcionarios', editandoId), funcionarioParaSalvar);
        alert('Funcionário atualizado!');
      } else {
        await addDoc(collection(db, 'funcionarios'), {
          ...funcionarioParaSalvar,
          criadoEm: serverTimestamp()
        });
        alert('Funcionário cadastrado!');
      }
      await carregarFuncionarios();
      fecharForm();
    } catch (error) {
      const lista = [...funcionarios];
      if (editandoId) {
        const index = lista.findIndex(f => f.id === editandoId);
        if (index !== -1) lista[index] = { ...funcionarioParaSalvar, id: editandoId };
      } else {
        lista.push({ ...funcionarioParaSalvar, id: Date.now().toString() });
      }
      setFuncionarios(lista);
      localStorage.setItem('funcionarios', JSON.stringify(lista));
      alert('Funcionário salvo localmente!');
      fecharForm();
    }
  }

  async function excluirFuncionario(id: string) {
    if (!confirm('Deseja realmente excluir este funcionário?')) return;

    try {
      await deleteDoc(doc(db, 'funcionarios', id));
      await carregarFuncionarios();
      alert('Funcionário excluído!');
    } catch (error) {
      const lista = funcionarios.filter(f => f.id !== id);
      setFuncionarios(lista);
      localStorage.setItem('funcionarios', JSON.stringify(lista));
      alert('Funcionário excluído!');
    }
  }

  function editarFuncionario(funcionario: Funcionario) {
    setForm(funcionario);
    setEditandoId(funcionario.id || null);
    setMostrarForm(true);
  }

  function fecharForm() {
    setForm(FORM_VAZIO);
    setEditandoId(null);
    setMostrarForm(false);
  }

  const funcionariosFiltrados = funcionarios.filter(f => {
    const matchBusca = busca === '' ||
      f.nome.toLowerCase().includes(busca.toLowerCase()) ||
      f.matricula.includes(busca) ||
      f.cargo.toLowerCase().includes(busca.toLowerCase());
    
    const matchSituacao = filtroSituacao === 'Todos' || f.situacao === filtroSituacao;
    const matchDepartamento = filtroDepartamento === 'Todos' || f.departamento === filtroDepartamento;
    
    return matchBusca && matchSituacao && matchDepartamento;
  });

  const funcionariosAtivos = funcionarios.filter(f => f.situacao === 'Ativo').length;
  const folhaPagamento = funcionarios
    .filter(f => f.situacao === 'Ativo')
    .reduce((sum, f) => sum + f.salario, 0);

  const real = (n: number) => 
    'R$ ' + Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });

  const SITUACAO_CORES: Record<string, string> = {
    Ativo: 'bg-green-100 text-green-800',
    Férias: 'bg-blue-100 text-blue-800',
    Afastado: 'bg-yellow-100 text-yellow-800',
    Desligado: 'bg-gray-100 text-gray-800'
  };

  return (
    <div className="space-y-5">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl shadow-lg">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Recursos Humanos</h2>
            <p className="text-sm text-gray-500">Gerencie funcionários e folha de pagamento</p>
          </div>
        </div>
        <button
          onClick={() => {
            setForm({ ...FORM_VAZIO, matricula: gerarMatricula() });
            setMostrarForm(true);
          }}
          className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all font-medium shadow-lg"
        >
          <Plus className="w-5 h-5" />
          Novo Funcionário
        </button>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500">Funcionários Ativos</span>
            <Users className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-green-600">{funcionariosAtivos}</p>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500">Folha de Pagamento</span>
            <DollarSign className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-blue-600">{real(folhaPagamento)}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500">Total de Funcionários</span>
            <FileText className="w-5 h-5 text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-purple-600">{funcionarios.length}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500">Salário Médio</span>
            <Award className="w-5 h-5 text-orange-500" />
          </div>
          <p className="text-2xl font-bold text-orange-600">
            {real(funcionariosAtivos > 0 ? folhaPagamento / funcionariosAtivos : 0)}
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar funcionário..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <select
            value={filtroSituacao}
            onChange={(e) => setFiltroSituacao(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {SITUACOES.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <select
            value={filtroDepartamento}
            onChange={(e) => setFiltroDepartamento(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="Todos">Todos Departamentos</option>
            {DEPARTAMENTOS.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Lista de Funcionários */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {funcionariosFiltrados.length === 0 ? (
          <div className="p-10 text-center text-gray-400">
            <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">Nenhum funcionário encontrado</p>
            <p className="text-sm mt-1">Clique em "Novo Funcionário" para cadastrar</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Matrícula</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Nome</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Cargo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Departamento</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Salário</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Admissão</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Situação</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {funcionariosFiltrados.map((funcionario) => (
                  <tr key={funcionario.id} className="hover:bg-gray-50 transition-all">
                    <td className="px-4 py-3 text-sm font-medium text-gray-800">
                      {funcionario.matricula}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {funcionario.nome}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {funcionario.cargo}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {funcionario.departamento}
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-right text-purple-600">
                      {real(funcionario.salario)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(funcionario.dataAdmissao).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${SITUACAO_CORES[funcionario.situacao]}`}>
                        {funcionario.situacao}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => editarFuncionario(funcionario)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => excluirFuncionario(funcionario.id!)}
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            {/* Cabeçalho do Modal */}
            <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6 flex items-center justify-between rounded-t-2xl">
              <div className="flex items-center gap-3">
                <Users className="w-6 h-6" />
                <div>
                  <h3 className="text-xl font-bold">
                    {editandoId ? 'Editar Funcionário' : 'Novo Funcionário'}
                  </h3>
                  <p className="text-sm text-purple-100">
                    Preencha os dados do funcionário
                  </p>
                </div>
              </div>
              <button
                onClick={fecharForm}
                className="p-2 hover:bg-white/20 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Corpo do Modal */}
            <div className="p-6 space-y-6">
              {/* Dados Pessoais */}
              <div>
                <h4 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-600" />
                  Dados Pessoais
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nome Completo *
                    </label>
                    <input
                      type="text"
                      value={form.nome}
                      onChange={(e) => setForm({ ...form, nome: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Digite o nome completo"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      CPF
                    </label>
                    <input
                      type="text"
                      value={form.cpf}
                      onChange={(e) => setForm({ ...form, cpf: mascaraCPF(e.target.value) })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="000.000.000-00"
                      maxLength={14}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      RG
                    </label>
                    <input
                      type="text"
                      value={form.rg}
                      onChange={(e) => setForm({ ...form, rg: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Digite o RG"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Data de Nascimento
                    </label>
                    <div className="relative">
                      <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                      <input
                        type="date"
                        value={form.dataNascimento}
                        onChange={(e) => setForm({ ...form, dataNascimento: e.target.value })}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Telefone
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                      <input
                        type="text"
                        value={form.telefone}
                        onChange={(e) => setForm({ ...form, telefone: mascaraTelefone(e.target.value) })}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="(00) 00000-0000"
                        maxLength={15}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      E-mail
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="email@exemplo.com"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Endereço
                    </label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        value={form.endereco}
                        onChange={(e) => setForm({ ...form, endereco: e.target.value })}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Rua, número, bairro, cidade - UF"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Dados Profissionais */}
              <div>
                <h4 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-purple-600" />
                  Dados Profissionais
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Matrícula
                    </label>
                    <input
                      type="text"
                      value={form.matricula}
                      readOnly
                      className="w-full px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-500"
                      placeholder="Gerado automaticamente"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cargo *
                    </label>
                    <select
                      value={form.cargo}
                      onChange={(e) => setForm({ ...form, cargo: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="">Selecione um cargo</option>
                      {CARGOS.map(cargo => (
                        <option key={cargo} value={cargo}>{cargo}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Departamento *
                    </label>
                    <select
                      value={form.departamento}
                      onChange={(e) => setForm({ ...form, departamento: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="">Selecione um departamento</option>
                      {DEPARTAMENTOS.map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Data de Admissão
                    </label>
                    <div className="relative">
                      <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                      <input
                        type="date"
                        value={form.dataAdmissao}
                        onChange={(e) => setForm({ ...form, dataAdmissao: e.target.value })}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Salário
                    </label>
                    <div className="relative">
                      <DollarSign className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                      <input
                        type="number"
                        value={form.salario || ''}
                        onChange={(e) => setForm({ ...form, salario: parseFloat(e.target.value) || 0 })}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="0.00"
                        step="0.01"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Benefícios */}
              <div>
                <h4 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Award className="w-5 h-5 text-purple-600" />
                  Benefícios
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {BENEFICIOS_OPCOES.map(beneficio => (
                    <label
                      key={beneficio}
                      className="flex items-center gap-2 p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-purple-50 transition-all"
                    >
                      <input
                        type="checkbox"
                        checked={form.beneficios.includes(beneficio)}
                        onChange={() => toggleBeneficio(beneficio)}
                        className="w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                      />
                      <span className="text-sm text-gray-700">{beneficio}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Situação */}
              <div>
                <h4 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-purple-600" />
                  Situação
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      value={form.situacao}
                      onChange={(e) => setForm({ ...form, situacao: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="Ativo">Ativo</option>
                      <option value="Férias">Férias</option>
                      <option value="Afastado">Afastado</option>
                      <option value="Desligado">Desligado</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Observações
                    </label>
                    <textarea
                      value={form.observacoes}
                      onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                      placeholder="Informações adicionais sobre o funcionário..."
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Rodapé do Modal */}
            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 flex items-center justify-end gap-3 rounded-b-2xl border-t border-gray-200">
              <button
                onClick={fecharForm}
                className="px-5 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={salvarFuncionario}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all font-medium shadow-lg"
              >
                <Save className="w-4 h-4" />
                {editandoId ? 'Atualizar' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

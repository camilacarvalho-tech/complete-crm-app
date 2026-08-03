import { useState, useEffect } from 'react';
import { 
  Plus, Edit, Trash2, Search, FileText, 
  Upload, Download, Eye, X, Save, AlertCircle
} from 'lucide-react';
import { db, storage } from '../../../firebase';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, where, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

interface Documento {
  id?: string;
  funcionarioId: string;
  funcionarioNome: string;
  tipo: string;
  descricao: string;
  arquivo: string;
  arquivoNome: string;
  tamanho: number;
  dataUpload: string;
  observacoes: string;
}

interface Funcionario {
  id: string;
  nome: string;
  matricula: string;
  cargo: string;
}

const FORM_VAZIO: Documento = {
  funcionarioId: '',
  funcionarioNome: '',
  tipo: '',
  descricao: '',
  arquivo: '',
  arquivoNome: '',
  tamanho: 0,
  dataUpload: '',
  observacoes: ''
};

const TIPOS_DOCUMENTO = [
  'RG',
  'CPF',
  'CNH',
  'Carteira de Trabalho',
  'Comprovante de Residência',
  'Contrato de Trabalho',
  'Termo de Confidencialidade',
  'Holerite',
  'Certificado',
  'Diploma',
  'Exame Admissional',
  'Exame Periódico',
  'Atestado Médico',
  'Título de Eleitor',
  'Certidão de Nascimento',
  'Certidão de Casamento',
  'Comprovante de Escolaridade',
  'Outros'
];

export function Documentos() {
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState<Documento>(FORM_VAZIO);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('Todos');
  const [filtroFuncionario, setFiltroFuncionario] = useState('Todos');
  const [uploadProgress, setUploadProgress] = useState(false);
  const [arquivoSelecionado, setArquivoSelecionado] = useState<File | null>(null);

  useEffect(() => {
    carregarDocumentos();
    carregarFuncionarios();
  }, []);

  async function carregarDocumentos() {
    try {
      const snapshot = await getDocs(collection(db, 'documentos'));
      const lista = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Documento[];
      setDocumentos(lista);
    } catch (error) {
      const localData = localStorage.getItem('documentos');
      if (localData) {
        setDocumentos(JSON.parse(localData));
      }
    }
  }

  async function carregarFuncionarios() {
    try {
      const snapshot = await getDocs(collection(db, 'funcionarios'));
      const lista = snapshot.docs.map(doc => ({
        id: doc.id,
        nome: doc.data().nome,
        matricula: doc.data().matricula,
        cargo: doc.data().cargo
      })) as Funcionario[];
      setFuncionarios(lista);
    } catch (error) {
      const localData = localStorage.getItem('funcionarios');
      if (localData) {
        const parsed = JSON.parse(localData);
        const lista = parsed.map((f: any) => ({
          id: f.id,
          nome: f.nome,
          matricula: f.matricula,
          cargo: f.cargo
        }));
        setFuncionarios(lista);
      }
    }
  }

  function formatarTamanho(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  function handleArquivoSelecionado(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (arquivo) {
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (arquivo.size > maxSize) {
        alert('Arquivo muito grande! Tamanho máximo: 10MB');
        return;
      }
      
      const tiposPermitidos = [
        'application/pdf',
        'image/jpeg',
        'image/jpg',
        'image/png',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];
      
      if (!tiposPermitidos.includes(arquivo.type)) {
        alert('Tipo de arquivo não permitido! Use: PDF, JPG, PNG ou DOCX');
        return;
      }

      setArquivoSelecionado(arquivo);
      setForm({ 
        ...form, 
        arquivoNome: arquivo.name,
        tamanho: arquivo.size
      });
    }
  }

  async function uploadArquivo(arquivo: File): Promise<string> {
    try {
      // Para Firebase Storage
      const storageRef = ref(storage, `documentos/${Date.now()}_${arquivo.name}`);
      await uploadBytes(storageRef, arquivo);
      const url = await getDownloadURL(storageRef);
      return url;
    } catch (error) {
      // Fallback para base64 no localStorage
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve(reader.result as string);
        };
        reader.readAsDataURL(arquivo);
      });
    }
  }

  async function salvarDocumento() {
    if (!form.funcionarioId || !form.tipo || !arquivoSelecionado) {
      alert('Preencha os campos obrigatórios: Funcionário, Tipo e Arquivo');
      return;
    }

    setUploadProgress(true);

    try {
      const urlArquivo = await uploadArquivo(arquivoSelecionado);
      
      const documentoParaSalvar = {
        ...form,
        arquivo: urlArquivo,
        dataUpload: new Date().toISOString()
      };

      if (editandoId) {
        await updateDoc(doc(db, 'documentos', editandoId), documentoParaSalvar);
        alert('Documento atualizado!');
      } else {
        await addDoc(collection(db, 'documentos'), {
          ...documentoParaSalvar,
          criadoEm: serverTimestamp()
        });
        alert('Documento enviado com sucesso!');
      }
      
      await carregarDocumentos();
      fecharForm();
    } catch (error) {
      // Salvar localmente em caso de erro
      const urlArquivo = await uploadArquivo(arquivoSelecionado);
      const lista = [...documentos];
      
      const documentoParaSalvar = {
        ...form,
        arquivo: urlArquivo,
        dataUpload: new Date().toISOString()
      };

      if (editandoId) {
        const index = lista.findIndex(d => d.id === editandoId);
        if (index !== -1) lista[index] = { ...documentoParaSalvar, id: editandoId };
      } else {
        lista.push({ ...documentoParaSalvar, id: Date.now().toString() });
      }
      
      setDocumentos(lista);
      localStorage.setItem('documentos', JSON.stringify(lista));
      alert('Documento salvo localmente!');
      fecharForm();
    } finally {
      setUploadProgress(false);
    }
  }

  async function excluirDocumento(id: string, arquivoUrl: string) {
    if (!confirm('Deseja realmente excluir este documento?')) return;

    try {
      // Tentar excluir do Firebase Storage
      if (arquivoUrl.startsWith('http')) {
        const storageRef = ref(storage, arquivoUrl);
        await deleteObject(storageRef);
      }
      
      await deleteDoc(doc(db, 'documentos', id));
      await carregarDocumentos();
      alert('Documento excluído!');
    } catch (error) {
      const lista = documentos.filter(d => d.id !== id);
      setDocumentos(lista);
      localStorage.setItem('documentos', JSON.stringify(lista));
      alert('Documento excluído!');
    }
  }

  function editarDocumento(documento: Documento) {
    setForm(documento);
    setEditandoId(documento.id || null);
    setMostrarForm(true);
  }

  function visualizarDocumento(url: string) {
    window.open(url, '_blank');
  }

  function downloadDocumento(url: string, nome: string) {
    const link = document.createElement('a');
    link.href = url;
    link.download = nome;
    link.click();
  }

  function fecharForm() {
    setForm(FORM_VAZIO);
    setEditandoId(null);
    setArquivoSelecionado(null);
    setMostrarForm(false);
  }

  function selecionarFuncionario(funcId: string) {
    const funcionario = funcionarios.find(f => f.id === funcId);
    if (funcionario) {
      setForm({ 
        ...form, 
        funcionarioId: funcId,
        funcionarioNome: funcionario.nome 
      });
    }
  }

  const documentosFiltrados = documentos.filter(d => {
    const matchBusca = busca === '' ||
      d.funcionarioNome.toLowerCase().includes(busca.toLowerCase()) ||
      d.tipo.toLowerCase().includes(busca.toLowerCase()) ||
      d.descricao.toLowerCase().includes(busca.toLowerCase());
    
    const matchTipo = filtroTipo === 'Todos' || d.tipo === filtroTipo;
    const matchFuncionario = filtroFuncionario === 'Todos' || d.funcionarioId === filtroFuncionario;
    
    return matchBusca && matchTipo && matchFuncionario;
  });

  const totalDocumentos = documentos.length;
  const tamanhoTotal = documentos.reduce((sum, d) => sum + d.tamanho, 0);
  const documentosPorTipo = TIPOS_DOCUMENTO.map(tipo => ({
    tipo,
    quantidade: documentos.filter(d => d.tipo === tipo).length
  })).filter(item => item.quantidade > 0);

  const TIPO_ICONE: Record<string, string> = {
    'RG': '🪪',
    'CPF': '📋',
    'CNH': '🚗',
    'Carteira de Trabalho': '💼',
    'Comprovante de Residência': '🏠',
    'Contrato de Trabalho': '📄',
    'Holerite': '💰',
    'Certificado': '🏆',
    'Diploma': '🎓',
    'Exame Admissional': '🏥',
    'Outros': '📎'
  };

  return (
    <div className="space-y-5">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl shadow-lg">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Documentos</h2>
            <p className="text-sm text-gray-500">Gerencie documentos dos funcionários</p>
          </div>
        </div>
        <button
          onClick={() => {
            setForm(FORM_VAZIO);
            setMostrarForm(true);
          }}
          className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all font-medium shadow-lg"
        >
          <Plus className="w-5 h-5" />
          Novo Documento
        </button>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500">Total de Documentos</span>
            <FileText className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-blue-600">{totalDocumentos}</p>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500">Tamanho Total</span>
            <Upload className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-green-600">{formatarTamanho(tamanhoTotal)}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500">Tipos Cadastrados</span>
            <AlertCircle className="w-5 h-5 text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-purple-600">{documentosPorTipo.length}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500">Funcionários com Docs</span>
            <FileText className="w-5 h-5 text-orange-500" />
          </div>
          <p className="text-2xl font-bold text-orange-600">
            {new Set(documentos.map(d => d.funcionarioId)).size}
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
              placeholder="Buscar documento..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="Todos">Todos os Tipos</option>
            {TIPOS_DOCUMENTO.map(tipo => (
              <option key={tipo} value={tipo}>{tipo}</option>
            ))}
          </select>

          <select
            value={filtroFuncionario}
            onChange={(e) => setFiltroFuncionario(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="Todos">Todos Funcionários</option>
            {funcionarios.map(f => (
              <option key={f.id} value={f.id}>{f.nome}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Lista de Documentos */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {documentosFiltrados.length === 0 ? (
          <div className="p-10 text-center text-gray-400">
            <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">Nenhum documento encontrado</p>
            <p className="text-sm mt-1">Clique em "Novo Documento" para adicionar</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Tipo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Funcionário</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Descrição</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Arquivo</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Tamanho</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Data Upload</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {documentosFiltrados.map((documento) => (
                  <tr key={documento.id} className="hover:bg-gray-50 transition-all">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{TIPO_ICONE[documento.tipo] || '📎'}</span>
                        <span className="text-sm font-medium text-gray-800">{documento.tipo}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {documento.funcionarioNome}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {documento.descricao || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {documento.arquivoNome}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-600">
                      {formatarTamanho(documento.tamanho)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(documento.dataUpload).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => visualizarDocumento(documento.arquivo)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          title="Visualizar"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => downloadDocumento(documento.arquivo, documento.arquivoNome)}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-all"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => excluirDocumento(documento.id!, documento.arquivo)}
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
            {/* Cabeçalho do Modal */}
            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-6 flex items-center justify-between rounded-t-2xl">
              <div className="flex items-center gap-3">
                <Upload className="w-6 h-6" />
                <div>
                  <h3 className="text-xl font-bold">Novo Documento</h3>
                  <p className="text-sm text-blue-100">Faça o upload do documento</p>
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
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Funcionário *
                </label>
                <select
                  value={form.funcionarioId}
                  onChange={(e) => selecionarFuncionario(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione um funcionário</option>
                  {funcionarios.map(f => (
                    <option key={f.id} value={f.id}>
                      {f.nome} - {f.matricula} ({f.cargo})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Documento *
                </label>
                <select
                  value={form.tipo}
                  onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione o tipo</option>
                  {TIPOS_DOCUMENTO.map(tipo => (
                    <option key={tipo} value={tipo}>
                      {TIPO_ICONE[tipo] || '📎'} {tipo}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descrição
                </label>
                <input
                  type="text"
                  value={form.descricao}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Breve descrição do documento"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Arquivo * (PDF, JPG, PNG, DOCX - Máx. 10MB)
                </label>
                <div className="relative">
                  <input
                    type="file"
                    onChange={handleArquivoSelecionado}
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>
                {arquivoSelecionado && (
                  <p className="text-sm text-gray-500 mt-2">
                    Arquivo selecionado: {arquivoSelecionado.name} ({formatarTamanho(arquivoSelecionado.size)})
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Observações
                </label>
                <textarea
                  value={form.observacoes}
                  onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Informações adicionais sobre o documento..."
                />
              </div>
            </div>

            {/* Rodapé do Modal */}
            <div className="bg-gray-50 px-6 py-4 flex items-center justify-end gap-3 rounded-b-2xl border-t border-gray-200">
              <button
                onClick={fecharForm}
                className="px-5 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all font-medium"
                disabled={uploadProgress}
              >
                Cancelar
              </button>
              <button
                onClick={salvarDocumento}
                disabled={uploadProgress}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploadProgress ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Salvar Documento
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

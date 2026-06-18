import { useState } from 'react';
import { useCRM } from '../../context/CRMContext';
import { uploadDocumento } from '../../services/uploadDocumento';
import { Cliente } from '../../types';

interface ClienteFormProps {
  cliente: Cliente | null;
  onClose: () => void;
}

const FORM_VAZIO = {
  nome: '', cpf: '', rg: '', whatsapp: '', telefone: '', email: '',
  cep: '', endereco: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '',
  modalidade: '', status: 'Lead', bancoCrm: '', origem: 'Site',
  dataContato: new Date().toISOString().split('T')[0], observacoes: '',
  banco: '', agencia: '', tipoConta: '', numeroConta: '', valorSolicitado: '',
  senhaGov: '', loginGov: '', senhaSiape: '', matriculaSiape: '',
  senhaPrefeitura: '', matriculaPrefeitura: '', senhaAppBanco: '', senhaInss: '',
};

export function ClienteForm({ cliente, onClose }: ClienteFormProps) {
  const { adicionarCliente, atualizarCliente } = useCRM();
  const [form, setForm] = useState({ ...FORM_VAZIO, ...(cliente ?? {}) });
  const [arquivos, setArquivos] = useState<Record<string, File | null>>({
    docRg: null, docCnh: null, docHolerite: null,
    docExtratoConsignado: null, docComprovResidencia: null,
  });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  };

  const handleArquivo = (campo: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setArquivos((p) => ({ ...p, [campo]: e.target.files?.[0] ?? null }));
  };

  const handleSalvar = async () => {
    if (!form.nome.trim() || !form.cpf.trim()) {
      setErro('Nome e CPF são obrigatórios.');
      return;
    }
    setErro('');
    setSalvando(true);
    try {
      const dadosCliente = { ...form } as Omit<Cliente, 'id'>;
      let clienteId = cliente?.id ?? '';
      if (!clienteId) {
        clienteId = await adicionarCliente(dadosCliente);
      } else {
        await atualizarCliente(clienteId, dadosCliente);
      }
      const urlsDocs: Partial<Cliente> = {};
      for (const [campo, arquivo] of Object.entries(arquivos)) {
        if (arquivo) {
          const resultado = await uploadDocumento(arquivo, clienteId, campo);
          if (resultado.sucesso) urlsDocs[campo as keyof Cliente] = resultado.url;
        }
      }
      if (Object.keys(urlsDocs).length > 0) await atualizarCliente(clienteId, urlsDocs);
      onClose();
    } catch (e) {
      console.error(e);
      setErro('Erro ao salvar. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-6 overflow-y-auto">
      <div className="bg-white rounded-xl p-6 w-full max-w-2xl shadow-2xl">

        {/* Cabeçalho */}
        <div className="mb-5">
          <h2 className="text-2xl font-black text-gray-900">Análise de Crédito</h2>
          <p className="text-sm text-gray-400">Cadastro de Clientes</p>
        </div>

        {erro && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg mb-4 text-sm">
            {erro}
          </div>
        )}

        {/* Dados pessoais */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <input name="nome" value={form.nome} onChange={handleChange}
            placeholder="Nome Completo" className="border p-2.5 rounded-lg col-span-2 text-sm" />
          <input name="cpf" value={form.cpf} onChange={handleChange}
            placeholder="CPF" className="border p-2.5 rounded-lg text-sm" />
          <input name="rg" value={form.rg} onChange={handleChange}
            placeholder="RG" className="border p-2.5 rounded-lg text-sm" />
          <input name="whatsapp" value={form.whatsapp} onChange={handleChange}
            placeholder="WhatsApp" className="border p-2.5 rounded-lg text-sm" />
          <input name="cep" value={form.cep} onChange={handleChange}
            placeholder="CEP" className="border p-2.5 rounded-lg text-sm" />
          <input name="endereco" value={form.endereco} onChange={handleChange}
            placeholder="Endereço" className="border p-2.5 rounded-lg col-span-2 text-sm" />
          <input name="numero" value={form.numero} onChange={handleChange}
            placeholder="Número" className="border p-2.5 rounded-lg text-sm" />
          <input name="complemento" value={form.complemento} onChange={handleChange}
            placeholder="Complemento" className="border p-2.5 rounded-lg text-sm" />
          <input name="bairro" value={form.bairro} onChange={handleChange}
            placeholder="Bairro" className="border p-2.5 rounded-lg text-sm" />
          <input name="cidade" value={form.cidade} onChange={handleChange}
            placeholder="Cidade" className="border p-2.5 rounded-lg text-sm" />
          <input name="estado" value={form.estado} onChange={handleChange}
            placeholder="Estado (UF)" className="border p-2.5 rounded-lg text-sm" />

          <select name="modalidade" value={form.modalidade} onChange={handleChange}
            className="border p-2.5 rounded-lg text-sm">
            <option value="">Selecione a modalidade</option>
            <option>Antecipação FGTS</option>
            <option>Crédito CLT</option>
            <option>INSS</option>
            <option>Conta de Energia</option>
            <option>Refinanciamento Veículo</option>
            <option>Refinanciamento Imóvel</option>
            <option>Placa Solar</option>
            <option>SIAPE</option>
            <option>Servidor Municipal</option>
          </select>

          <select name="status" value={form.status} onChange={handleChange}
            className="border p-2.5 rounded-lg text-sm">
            <option>Lead</option>
            <option>Em Atendimento</option>
            <option>Proposta em Atendimento</option>
            <option>Fila de Atendimento</option>
            <option>Documentação Recebida</option>
            <option>Análise Bancária</option>
            <option>Digitação</option>
            <option>Aprovado</option>
            <option>Pago</option>
            <option>Recusado</option>
          </select>

          {/* Origem do tráfego */}
          <select name="origem" value={form.origem} onChange={handleChange}
            className="border p-2.5 rounded-lg text-sm col-span-2">
            <option value="Site">Site</option>
            <option value="Landing Page">Landing Page</option>
            <option value="WhatsApp">WhatsApp</option>
            <option value="Tráfego Pago">Tráfego Pago</option>
            <option value="Indicação">Indicação</option>
            <option value="Instagram">Instagram</option>
            <option value="Facebook">Facebook</option>
            <option value="Outro">Outro</option>
          </select>

          {/* Dados bancários */}
          <div className="col-span-2 border-t pt-4 mt-1">
            <h3 className="font-bold text-gray-700 mb-3">Dados Bancários do Cliente</h3>
            <div className="grid grid-cols-2 gap-3">
              <input name="banco" value={form.banco} onChange={handleChange}
                placeholder="Banco" className="border p-2.5 rounded-lg text-sm" />
              <input name="agencia" value={form.agencia} onChange={handleChange}
                placeholder="Agência" className="border p-2.5 rounded-lg text-sm" />
              <select name="tipoConta" value={form.tipoConta} onChange={handleChange}
                className="border p-2.5 rounded-lg text-sm">
                <option value="">Tipo de conta</option>
                <option>Conta Corrente</option>
                <option>Conta Poupança</option>
              </select>
              <input name="numeroConta" value={form.numeroConta} onChange={handleChange}
                placeholder="Número da Conta" className="border p-2.5 rounded-lg text-sm" />
              <input name="valorSolicitado" value={form.valorSolicitado} onChange={handleChange}
                placeholder="Valor Solicitado" className="border p-2.5 rounded-lg text-sm col-span-2" />
            </div>
          </div>
        </div>

        {/* Documentação */}
        <div className="border-t pt-4 mb-4">
          <h3 className="font-bold text-gray-700 mb-3">Documentação do Cliente</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'RG',                      campo: 'docRg' },
              { label: 'CNH',                     campo: 'docCnh' },
              { label: 'Holerite',                campo: 'docHolerite' },
              { label: 'Extrato Consignado',      campo: 'docExtratoConsignado' },
              { label: 'Comprovante de Residência',campo: 'docComprovResidencia' },
            ].map((doc) => (
              <div key={doc.campo}>
                <label className="text-xs text-gray-500 mb-1 block">{doc.label}</label>
                <input type="file" onChange={handleArquivo(doc.campo)} className="border p-2 rounded-lg w-full text-sm" />
              </div>
            ))}
          </div>
        </div>

        {/* Senhas */}
        <div className="border-t pt-4 mb-4">
          <h3 className="font-bold text-gray-700 mb-3">Senhas do Cliente</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Senha GOV.BR</label>
              <input name="senhaGov" type="password" value={form.senhaGov} onChange={handleChange}
                placeholder="Senha GOV.BR" className="border p-2.5 rounded-lg w-full text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Login GOV.BR (CPF)</label>
              <input name="loginGov" type="text" value={form.loginGov} onChange={handleChange}
                placeholder="CPF GOV.BR" className="border p-2.5 rounded-lg w-full text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Senha SIAPE</label>
              <input name="senhaSiape" type="password" value={form.senhaSiape} onChange={handleChange}
                placeholder="Senha SIAPE" className="border p-2.5 rounded-lg w-full text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Matrícula SIAPE</label>
              <input name="matriculaSiape" type="text" value={form.matriculaSiape} onChange={handleChange}
                placeholder="Matrícula SIAPE" className="border p-2.5 rounded-lg w-full text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Senha Prefeitura</label>
              <input name="senhaPrefeitura" type="password" value={form.senhaPrefeitura} onChange={handleChange}
                placeholder="Senha Prefeitura" className="border p-2.5 rounded-lg w-full text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Matrícula Prefeitura</label>
              <input name="matriculaPrefeitura" type="text" value={form.matriculaPrefeitura} onChange={handleChange}
                placeholder="Matrícula Prefeitura" className="border p-2.5 rounded-lg w-full text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Senha App Banco</label>
              <input name="senhaAppBanco" type="password" value={form.senhaAppBanco} onChange={handleChange}
                placeholder="Senha App Banco" className="border p-2.5 rounded-lg w-full text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Senha INSS (Meu INSS)</label>
              <input name="senhaInss" type="password" value={form.senhaInss} onChange={handleChange}
                placeholder="Senha Meu INSS" className="border p-2.5 rounded-lg w-full text-sm" />
            </div>
          </div>
        </div>

        {/* Observações */}
        <textarea name="observacoes" value={form.observacoes} onChange={handleChange}
          placeholder="Observações" className="border p-2.5 rounded-lg w-full mb-4 text-sm" rows={3} />

        {/* Botões */}
        <div className="flex gap-3">
          <button
            onClick={handleSalvar}
            disabled={salvando}
            className="flex-1 py-2.5 text-black rounded-lg font-black text-sm disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}
          >
            {salvando ? 'Salvando...' : 'Salvar Cliente'}
          </button>
          <button onClick={onClose} disabled={salvando}
            className="px-6 py-2.5 bg-gray-100 rounded-lg text-sm text-gray-600 hover:bg-gray-200 disabled:opacity-50">
            Cancelar
          </button>
        </div>

      </div>
    </div>
  );
}

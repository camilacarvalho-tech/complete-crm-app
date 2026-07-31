import { db } from '../../../firebase';
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';


import { useEffect, useState } from 'react';
import { uploadDocumento } from '../../services/uploadDocumento';

export function ClienteDetalhes() {

  const [cliente, setCliente] = useState<any>(null);

  const [documentos, setDocumentos] = useState<any[]>([]);
  const [mensagens, setMensagens] = useState<any[]>([]);
  const [novaMensagem, setNovaMensagem] = useState('');

  useEffect(() => {

    const dados = localStorage.getItem('clienteSelecionado');

    if (dados) {
      setCliente(JSON.parse(dados));
    }

  }, []);

  async function handleUpload(
    event: any,
    tipoDocumento: string
  ) {

    const arquivo = event.target.files?.[0];

    if (!arquivo) return;

    const resultado = await uploadDocumento(
      arquivo,
      cliente.id || cliente.cpf,
      tipoDocumento
    );

    if (resultado.sucesso) {

      setDocumentos((anterior) => [
        ...anterior,
        resultado
      ]);

      alert('Documento enviado com sucesso!');

    } else {

      alert('Erro ao enviar documento');

    }

  }
async function carregarMensagens() {

  if (!cliente) return;

  const mensagensRef = collection(
    db,
    'clientes',
    String(cliente.cpf),
    'mensagens'
  );

  const q = query(
    mensagensRef,
    orderBy('data', 'asc')
  );

  const snapshot = await getDocs(q);

  const lista = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  setMensagens(lista);
}

async function enviarMensagem() {
await addDoc(
  collection(
    db,
    'clientes',
    String(cliente.cpf),
    'mensagens'
  ),
  {
    texto: novaMensagem,
    autor: 'atendente',
    data: serverTimestamp()
  }
);

await fetch(
  'http://127.0.0.1:8000/mensagens',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      cpf: cliente.cpf,
      autor: 'atendente',
      texto: novaMensagem
    })
  }
);

setNovaMensagem('');

carregarMensagens();
  if (!novaMensagem.trim()) return;

  await addDoc(
    collection(
      db,
      'clientes',
      String(cliente.cpf),
      'mensagens'
    ),
    {
      texto: novaMensagem,
      autor: 'atendente',
      data: serverTimestamp()
    }
  );

  setNovaMensagem('');

  carregarMensagens();
}
  if (!cliente) {

    return (
      <div className="p-6">
        Carregando cliente...
      </div>
    );

  }

  return (

    <div className="space-y-6">

      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">

        <h1 className="text-3xl font-bold text-gray-800 mb-6">
          Dossiê do Cliente
        </h1>

        <div className="grid grid-cols-2 gap-6">

          <div>
            <strong>Nome:</strong> {cliente.nome || 'Não informado'}
          </div>

          <div>
            <strong>CPF:</strong> {cliente.cpf || 'Não informado'}
          </div>

          <div>
            <strong>Telefone:</strong> {cliente.telefone || 'Sem telefone'}
          </div>

          <div>
            <strong>WhatsApp:</strong> {cliente.telefone ? 'Sim' : 'Não'}
          </div>

          <div>
            <strong>Modalidade:</strong> {cliente.modalidade || 'Não informado'}
          </div>

          <div>
            <strong>Banco:</strong> {cliente.banco || 'Não informado'}
          </div>

          <div>
            <strong>Valor Aprovado:</strong> {cliente.valor || 'Não informado'}
          </div>

          <div>
            <strong>Status:</strong> {cliente.status || 'Novo'}
          </div>

        </div>

      </div>

      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">

        <h2 className="text-xl font-bold text-gray-800 mb-4">
          📁 Documentos do Cliente
        </h2>

        <div className="flex gap-3 mb-4 flex-wrap">

          <label className="bg-yellow-500 hover:bg-yellow-600 text-black px-4 py-2 rounded-lg font-medium cursor-pointer">

            Anexar RG

            <input
              type="file"
              hidden
              onChange={(e) =>
                handleUpload(e, 'RG')
              }
            />

          </label>

          <label className="bg-yellow-500 hover:bg-yellow-600 text-black px-4 py-2 rounded-lg font-medium cursor-pointer">

            Anexar CPF

            <input
              type="file"
              hidden
              onChange={(e) =>
                handleUpload(e, 'CPF')
              }
            />

          </label>

          <label className="bg-yellow-500 hover:bg-yellow-600 text-black px-4 py-2 rounded-lg font-medium cursor-pointer">

            Comprovante

            <input
              type="file"
              hidden
              onChange={(e) =>
                handleUpload(e, 'COMPROVANTE')
              }
            />

          </label>

          <label className="bg-yellow-500 hover:bg-yellow-600 text-black px-4 py-2 rounded-lg font-medium cursor-pointer">

            Contracheque

            <input
              type="file"
              hidden
              onChange={(e) =>
                handleUpload(e, 'CONTRACHEQUE')
              }
            />

          </label>

        </div>

        <div className="border rounded-lg p-4 bg-gray-50">

          {documentos.length === 0 ? (

            <p className="text-gray-500">
              Nenhum documento anexado.
            </p>

          ) : (

            documentos.map((doc, index) => (

              <div
                key={index}
                className="flex justify-between items-center border-b py-2"
              >

                <span>
                  📄 {doc.nome}
                </span>

                <a
                  href={doc.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 font-medium"
                >
                  Baixar
                </a>

              </div>

            ))

          )}

        </div>

      </div>
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">

  <h2 className="text-xl font-bold text-gray-800 mb-4">
    💬 Atendimento Recomece Cred
  </h2>

  <div className="border rounded-lg p-4 bg-gray-50 h-80 overflow-y-auto mb-4">

    {mensagens.length === 0 ? (

      <p className="text-gray-500">
        Nenhuma conversa registrada.
      </p>

    ) : (

      mensagens.map((msg: any) => (

        <div
          key={msg.id}
          className="mb-3 p-3 bg-white rounded border"
        >
          <strong>{msg.autor}</strong>

          <p>{msg.texto}</p>
        </div>

      ))

    )}

  </div>

  <div className="flex gap-3">

    <input
  type="text"
  value={novaMensagem}
  onChange={(e) => setNovaMensagem(e.target.value)}
  onKeyDown={(e) => {
    if (e.key === 'Enter') {
      enviarMensagem();
    }
  }}
  placeholder="Digite uma mensagem..."
  className="flex-1 border border-gray-300 rounded-lg p-3"
/>

    <button
      onClick={enviarMensagem}
      className="bg-green-600 hover:bg-green-700 text-white px-6 rounded-lg"
    >
      Enviar
    </button>

  </div>

</div>

<div className="bg-white p-6 rounded-lg shadow border border-gray-200">

  <h2 className="text-xl font-bold text-gray-800 mb-4">
    📝 Observações
  </h2>

  <textarea
    className="w-full border border-gray-300 rounded-lg p-3"
    rows={5}
    placeholder="Digite observações sobre este cliente..."
  />

</div>

</div>

);
}
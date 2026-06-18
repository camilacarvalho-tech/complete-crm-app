import { storage } from "../../firebase";

import {
  ref,
  uploadBytes,
  getDownloadURL
} from "firebase/storage";

export async function uploadDocumento(
  arquivo,
  clienteId,
  tipoDocumento
) {

  try {

    const caminho = `clientes/${clienteId}/${tipoDocumento}_${Date.now()}_${arquivo.name}`;

    const arquivoRef = ref(
      storage,
      caminho
    );

    await uploadBytes(
      arquivoRef,
      arquivo
    );

    const url = await getDownloadURL(
      arquivoRef
    );

    return {
      sucesso: true,
      url,
      nome: arquivo.name
    };

  } catch (erro) {

    console.error(
      "Erro ao enviar documento:",
      erro
    );

    return {
      sucesso: false
    };

  }

}
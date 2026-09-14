import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'

export async function writeAudit(params: {
  empresaId: string | null
  usuarioId?: string
  usuarioNome?: string
  modulo: string
  acao: string
  entidade?: string
  entidadeId?: string
  antes?: unknown
  depois?: unknown
}) {
  if (!params.empresaId) return
  try {
    await addDoc(collection(db, 'empresas', params.empresaId, 'auditoria'), {
      ...params,
      quando: serverTimestamp(),
    })
  } catch (error) {
    console.warn('[audit]', error)
  }
}

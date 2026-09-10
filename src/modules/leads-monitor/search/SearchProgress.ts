import { doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '../../../firebase'
import { COL_SEARCH_RUNS } from '../constants'

export async function requestSearchCancel(opts: { empresaId: string; searchRunId: string; actor?: { usuarioId?: string; usuarioNome?: string } }): Promise<void> {
  await updateDoc(doc(db, 'empresas', opts.empresaId, COL_SEARCH_RUNS, opts.searchRunId), { status: 'cancelled', canceladoPor: opts.actor?.usuarioId || null, atualizadoEm: serverTimestamp(), finalizadoEm: serverTimestamp() })
}

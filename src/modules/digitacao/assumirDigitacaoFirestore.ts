import { doc, runTransaction } from 'firebase/firestore'
import { db } from '../../firebase'
import { assumirProposta, mudarStatus, type PropostaProd } from './producaoEsteira'

export async function assumirDigitacaoFirestore(input: {
  empresaId: string
  colecao: 'digitacoes' | 'propostas'
  id: string
  operadorId: string
  operadorNome: string
  agora: string
}): Promise<{ ok: boolean; motivo?: string }> {
  const ref = doc(db, 'empresas', input.empresaId, input.colecao, input.id)
  try {
    return await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref)
      if (!snap.exists()) return { ok: false, motivo: 'Digitação não encontrada.' }
      const atual = { id: snap.id, ...(snap.data() as Omit<PropostaProd, 'id'>) }
      const decisao = assumirProposta(atual, input.operadorId, input.operadorNome, input.agora)
      if (!decisao.ok || !decisao.patch) {
        return { ok: false, motivo: decisao.motivo || 'Esta digitação já foi atribuída a outro operador.' }
      }
      const hist = mudarStatus(atual, 'EM_DIGITACAO', input.operadorNome, 'Operador assumiu', input.agora)
      tx.update(ref, {
        ...decisao.patch,
        historicoEsteira: hist.ok ? hist.historico : atual.historicoEsteira || [],
        atualizadoEm: input.agora,
      })
      return { ok: true }
    })
  } catch {
    return { ok: false, motivo: 'Não foi possível confirmar a atribuição.' }
  }
}

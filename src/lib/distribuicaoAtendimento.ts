import { collection, getDocs } from 'firebase/firestore'
import { db } from '../firebase'

export type RegraDistribuicao = 'responsavel_informado' | 'menor_quantidade' | 'sem_atendente'

export type UsuarioFila = { id: string; nome?: string; ativo?: unknown; perfil?: string }

/** Menor carga em conversas abertas. Não é aleatório. */
export async function escolherResponsavel(opts: {
  empresaId: string
  preferidoId?: string
  preferidoNome?: string
  usuarios: UsuarioFila[]
}): Promise<{
  assignedToId?: string
  assignedTo?: string
  regra: RegraDistribuicao
}> {
  if (opts.preferidoId || opts.preferidoNome) {
    return {
      assignedToId: opts.preferidoId,
      assignedTo: opts.preferidoNome,
      regra: 'responsavel_informado',
    }
  }
  const ativos = opts.usuarios.filter((u) => u.ativo !== false && u.perfil !== 'CONSULTA')
  if (!ativos.length) return { regra: 'sem_atendente' }

  const snap = await getDocs(collection(db, 'empresas', opts.empresaId, 'conversas'))
  const carga = new Map<string, number>()
  for (const u of ativos) carga.set(u.id, 0)
  for (const d of snap.docs) {
    const data = d.data()
    if (data.canal === 'interno') continue
    if (data.status === 'finalizado') continue
    const id = String(data.assignedToId || '')
    if (id && carga.has(id)) carga.set(id, (carga.get(id) || 0) + 1)
  }
  const escolhido = [...ativos].sort((a, b) => (carga.get(a.id) || 0) - (carga.get(b.id) || 0) || a.id.localeCompare(b.id))[0]
  return { assignedToId: escolhido.id, assignedTo: escolhido.nome, regra: 'menor_quantidade' }
}

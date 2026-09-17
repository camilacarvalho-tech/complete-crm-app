import { addDoc, collection, getDocs, query, serverTimestamp, where } from 'firebase/firestore'
import { db } from '../firebase'
import { writeAudit } from './audit'
import { escolherResponsavel } from './distribuicaoAtendimento'
import { origemPrincipalDe } from './origemLead'

export function filaAtendimentoDe(opts: {
  origemLead?: string
  operacao?: string
  segmento?: string
  produto?: string
}): string {
  const blob = `${opts.operacao || ''} ${opts.segmento || ''} ${opts.produto || ''}`.toLowerCase()
  if (blob.includes('inss')) return 'FILA INSS'
  if (blob.includes('clt')) return 'FILA CLT'
  if (/\bcode\b/.test(blob) || blob.includes('crm') || blob.includes('erp')) return 'FILA CODE'
  return 'FILA COMERCIAL'
}

function omitEmpty(data: Record<string, unknown>) {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined || v === '') continue
    out[k] = v
  }
  return out
}

/** Reutiliza empresas/{id}/conversas — a fila operacional vive no Chat Clientes. */
export async function garantirConversaFila(opts: {
  empresaId: string
  clienteId: string
  titulo?: string
  telefone?: string
  origemLead?: string
  origemDetalhe?: string
  fonte?: string
  fonteId?: string
  campanhaId?: string
  campanhaNome?: string
  segmento?: string
  produto?: string
  operacao?: string
  estado?: string
  cidade?: string
  bairro?: string
  cep?: string
  pais?: string
  equipe?: string
  responsavel?: string
  responsavelId?: string
  usuarioId?: string
  usuarioNome?: string
}): Promise<{ conversaId: string; criada: boolean }> {
  const col = collection(db, 'empresas', opts.empresaId, 'conversas')
  const snap = await getDocs(query(col, where('clienteId', '==', opts.clienteId)))
  const existente = snap.docs.find((d) => d.data().canal !== 'interno')
  if (existente) {
    await writeAudit({
      empresaId: opts.empresaId,
      usuarioId: opts.usuarioId,
      usuarioNome: opts.usuarioNome,
      modulo: 'atendimento',
      acao: 'queue.entered',
      entidade: 'conversa',
      entidadeId: existente.id,
      depois: { clienteId: opts.clienteId, duplicada: false },
    })
    return { conversaId: existente.id, criada: false }
  }

  const usersSnap = await getDocs(collection(db, 'empresas', opts.empresaId, 'usuariosEmpresa'))
  const usuarios = usersSnap.docs.map((d) => ({ id: d.id, ...(d.data() as { nome?: string; ativo?: unknown; perfil?: string }) }))
  const dist = await escolherResponsavel({
    empresaId: opts.empresaId,
    preferidoId: opts.responsavelId,
    preferidoNome: opts.responsavel,
    usuarios,
  })

  const fila = filaAtendimentoDe(opts)
  const origem = origemPrincipalDe({ origemLead: opts.origemLead })
  const ref = await addDoc(
    col,
    omitEmpty({
      clienteId: opts.clienteId,
      canal: 'whatsapp',
      channel: 'WHATSAPP',
      canalEntrada: 'whatsapp',
      status: 'aguardando_triagem',
      fila,
      titulo: opts.titulo || 'Atendimento',
      telefone: opts.telefone,
      origemLead: origem,
      origemDetalhe: opts.origemDetalhe,
      fonte: opts.fonte,
      fonteId: opts.fonteId,
      campanhaId: opts.campanhaId,
      campanhaNome: opts.campanhaNome,
      campanha: opts.campanhaNome,
      segmento: opts.segmento,
      produto: opts.produto,
      modalidade: opts.segmento || opts.produto,
      estado: opts.estado,
      cidade: opts.cidade,
      bairro: opts.bairro,
      cep: opts.cep,
      pais: opts.pais || 'Brasil',
      equipe: opts.equipe,
      assignedTo: dist.assignedTo,
      assignedToId: dist.assignedToId,
      lastAssignedTo: dist.assignedTo,
      distribuicaoRegra: dist.regra,
      naoLidas: 1,
      lastMessage: 'Cliente na fila de atendimento',
      roboPausado: false,
      triagemStatus: 'aguardando',
      criadoEm: serverTimestamp(),
      atualizadoEm: serverTimestamp(),
    })
  )

  await writeAudit({
    empresaId: opts.empresaId,
    usuarioId: opts.usuarioId,
    usuarioNome: opts.usuarioNome,
    modulo: 'atendimento',
    acao: dist.assignedToId ? 'assignment.created' : 'queue.entered',
    entidade: 'conversa',
    entidadeId: ref.id,
    depois: { clienteId: opts.clienteId, fila, origemLead: origem, regra: dist.regra, assignedTo: dist.assignedTo },
  })

  return { conversaId: ref.id, criada: true }
}

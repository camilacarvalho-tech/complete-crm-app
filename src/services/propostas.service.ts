import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { db } from '../firebase'
import type { Proposta, PropostaInput } from '../types/proposta.types'

function getEmpresaId() {
  return localStorage.getItem('empresaId') || 'default'
}

function mapDoc(id: string, data: Record<string, unknown>): Proposta {
  const criadoEm = data.criadoEm as Timestamp | undefined
  const enviadoEm = data.enviadoEm as Timestamp | undefined
  return {
    id,
    clienteId: String(data.clienteId || ''),
    clienteNome: String(data.clienteNome || ''),
    valor: Number(data.valor || 0),
    modalidade: String(data.modalidade || ''),
    status: (data.status as Proposta['status']) || 'rascunho',
    templateId: data.templateId ? String(data.templateId) : undefined,
    conteudo: String(data.conteudo || ''),
    criadoEm: criadoEm?.toDate() ?? null,
    enviadoEm: enviadoEm?.toDate() ?? null,
  }
}

export function subscribePropostas(callback: (propostas: Proposta[]) => void) {
  const empresaId = getEmpresaId()
  const q = query(
    collection(db, 'empresas', empresaId, 'propostas'),
    orderBy('criadoEm', 'desc')
  )
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => mapDoc(d.id, d.data())))
  })
}

export async function criarProposta(input: PropostaInput) {
  const empresaId = getEmpresaId()
  await addDoc(collection(db, 'empresas', empresaId, 'propostas'), {
    ...input,
    criadoEm: serverTimestamp(),
  })
}

export async function atualizarProposta(id: string, input: Partial<PropostaInput>) {
  const empresaId = getEmpresaId()
  const ref = doc(db, 'empresas', empresaId, 'propostas', id)
  const payload: Record<string, unknown> = { ...input }
  if (input.status === 'enviada') {
    payload.enviadoEm = serverTimestamp()
  }
  await updateDoc(ref, payload)
}

export async function excluirProposta(id: string) {
  const empresaId = getEmpresaId()
  await deleteDoc(doc(db, 'empresas', empresaId, 'propostas', id))
}

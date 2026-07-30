/**
 * Etapa 6 — Aprovação (estado no Monitor; ainda não envia ao CRM).
 */
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '../../../firebase'
import { COL_OPORTUNIDADES } from '../constants'
import type { OportunidadeMonitor } from '../types'

export async function aprovarOportunidade(
  empresaId: string,
  oportunidade: OportunidadeMonitor
): Promise<void> {
  if (!oportunidade.consentimentoLgpd) {
    throw new Error('Oportunidade sem base legal LGPD — não pode ser aprovada.')
  }
  await updateDoc(doc(db, 'empresas', empresaId, COL_OPORTUNIDADES, oportunidade.id), {
    status: 'aprovado',
    atualizadoEm: serverTimestamp(),
  })
}

export async function rejeitarOportunidade(
  empresaId: string,
  oportunidade: OportunidadeMonitor,
  motivo?: string
): Promise<void> {
  await updateDoc(doc(db, 'empresas', empresaId, COL_OPORTUNIDADES, oportunidade.id), {
    status: 'rejeitado',
    rejeitadoMotivo: motivo || 'Rejeitado no monitor',
    atualizadoEm: serverTimestamp(),
  })
}

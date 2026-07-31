/**
 * Etapa 6 — Aprovação (estado no Monitor; ainda não envia ao CRM).
 */
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '../../../firebase'
import { COL_OPORTUNIDADES } from '../constants'
import { writeLeadsMonitorAudit } from '../services/auditTrail'
import type { OportunidadeMonitor } from '../types'

export async function aprovarOportunidade(
  empresaId: string,
  oportunidade: OportunidadeMonitor,
  actor?: { usuarioId?: string; usuarioNome?: string }
): Promise<void> {
  if (!oportunidade.consentimentoLgpd) {
    throw new Error('Oportunidade sem base legal LGPD — não pode ser aprovada.')
  }
  await updateDoc(doc(db, 'empresas', empresaId, COL_OPORTUNIDADES, oportunidade.id), {
    status: 'aprovado',
    atualizadoEm: serverTimestamp(),
  })
  await writeLeadsMonitorAudit({
    empresaId,
    action: 'oportunidade.approve',
    origem: 'ui',
    connectorId: oportunidade.connectorId,
    usuarioId: actor?.usuarioId,
    usuarioNome: actor?.usuarioNome,
    entidade: 'oportunidade',
    entidadeId: oportunidade.id,
    before: { status: oportunidade.status },
    after: { status: 'aprovado' },
  })
}

export async function rejeitarOportunidade(
  empresaId: string,
  oportunidade: OportunidadeMonitor,
  motivo?: string,
  actor?: { usuarioId?: string; usuarioNome?: string }
): Promise<void> {
  const rejeitadoMotivo = motivo || 'Rejeitado no monitor'
  await updateDoc(doc(db, 'empresas', empresaId, COL_OPORTUNIDADES, oportunidade.id), {
    status: 'rejeitado',
    rejeitadoMotivo,
    atualizadoEm: serverTimestamp(),
  })
  await writeLeadsMonitorAudit({
    empresaId,
    action: 'oportunidade.reject',
    origem: 'ui',
    connectorId: oportunidade.connectorId,
    usuarioId: actor?.usuarioId,
    usuarioNome: actor?.usuarioNome,
    entidade: 'oportunidade',
    entidadeId: oportunidade.id,
    before: { status: oportunidade.status },
    after: { status: 'rejeitado', rejeitadoMotivo },
  })
}

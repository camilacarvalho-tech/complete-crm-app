/**
 * Etapa 7 — Envio ao Nexus CRM (somente oportunidades aprovadas).
 * O CRM não lê a coleção do Monitor; apenas recebe o lead criado.
 */
import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db } from '../../../firebase'
import { COL_OPORTUNIDADES } from '../constants'
import { writeLeadsMonitorAudit } from '../services/auditTrail'
import type { OportunidadeMonitor } from '../types'

export interface EnviarCrmResult {
  clienteId: string
  jaExistia: boolean
}

function phoneDigits(t?: string) {
  return (t || '').replace(/\D/g, '')
}

export async function enviarOportunidadeParaCrm(
  empresaId: string,
  oportunidade: OportunidadeMonitor,
  usuarioNome?: string,
  actor?: { usuarioId?: string; usuarioNome?: string }
): Promise<EnviarCrmResult> {
  if (!oportunidade.consentimentoLgpd) {
    throw new Error('Oportunidade sem base legal LGPD — não pode ser enviada ao CRM.')
  }
  if (oportunidade.status !== 'aprovado' && oportunidade.status !== 'enviado_crm') {
    throw new Error('Aprove a oportunidade no Monitor antes de enviar ao CRM.')
  }

  const tel = phoneDigits(oportunidade.telefone)
  const origemLabel = oportunidade.origemLabel || oportunidade.connectorId || 'Leads Monitor'
  const auditActor = {
    usuarioId: actor?.usuarioId,
    usuarioNome: actor?.usuarioNome || usuarioNome,
  }

  if (tel.length >= 10) {
    const qTel = query(
      collection(db, 'empresas', empresaId, 'clientes'),
      where('telefone', '==', tel)
    )
    const snap = await getDocs(qTel)
    if (!snap.empty) {
      const existingId = snap.docs[0].id
      await updateDoc(doc(db, 'empresas', empresaId, COL_OPORTUNIDADES, oportunidade.id), {
        status: 'enviado_crm',
        crmClienteId: existingId,
        atualizadoEm: serverTimestamp(),
      })
      await writeLeadsMonitorAudit({
        empresaId,
        action: 'oportunidade.send_crm',
        origem: 'ui',
        connectorId: oportunidade.connectorId,
        ...auditActor,
        entidade: 'oportunidade',
        entidadeId: oportunidade.id,
        after: { status: 'enviado_crm', crmClienteId: existingId, jaExistia: true },
      })
      return { clienteId: existingId, jaExistia: true }
    }
  }

  const ref = await addDoc(collection(db, 'empresas', empresaId, 'clientes'), {
    nome: oportunidade.nome,
    telefone: tel || oportunidade.telefone || '',
    whatsapp: tel || '',
    email: oportunidade.email || '',
    cidade: oportunidade.cidade,
    estado: oportunidade.estado,
    modalidade: oportunidade.segmento,
    origem: `Leads Monitor · ${origemLabel}`,
    status: 'Lead',
    pipeline: 'Novo Lead',
    score: oportunidade.score,
    temperatura: oportunidade.temperatura,
    classificacao: oportunidade.classificacao,
    observacoes: [
      oportunidade.observacoes,
      `Score Nexus AI: ${oportunidade.score}`,
      `Base legal: ${oportunidade.baseLegal}`,
      oportunidade.cnpj ? `CNPJ: ${oportunidade.cnpj}` : null,
    ]
      .filter(Boolean)
      .join('\n'),
    camposExtras: {
      leadsMonitorId: oportunidade.id,
      tipoOportunidade: oportunidade.tipo,
      connectorId: oportunidade.connectorId,
      motivosScore: oportunidade.motivosScore,
    },
    atendente: usuarioNome || '',
    criadoPor: usuarioNome || 'leads-monitor',
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp(),
  })

  await updateDoc(doc(db, 'empresas', empresaId, COL_OPORTUNIDADES, oportunidade.id), {
    status: 'enviado_crm',
    crmClienteId: ref.id,
    atualizadoEm: serverTimestamp(),
  })

  await writeLeadsMonitorAudit({
    empresaId,
    action: 'oportunidade.send_crm',
    origem: 'ui',
    connectorId: oportunidade.connectorId,
    ...auditActor,
    entidade: 'oportunidade',
    entidadeId: oportunidade.id,
    after: { status: 'enviado_crm', crmClienteId: ref.id, jaExistia: false },
  })

  return { clienteId: ref.id, jaExistia: false }
}

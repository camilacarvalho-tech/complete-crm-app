/**
 * Etapa 7 — Envio ao Nexus CRM (somente oportunidades aprovadas).
 * Clique manual "Aprovar → CRM" não é bloqueado por score mínimo.
 */
import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '../../../firebase'
import { writeAudit } from '../../../lib/audit'
import { COL_OPORTUNIDADES } from '../constants'
import { writeLeadsMonitorAudit } from '../services/auditTrail'
import type { OportunidadeMonitor } from '../types'
import { garantirConversaFila } from '../../../lib/garantirConversaFila'
import {
  applyClienteMerge,
  asText,
  findExistingCliente,
  payloadEmpresaCliente,
} from './crmClientePayload'

export interface EnviarCrmResult {
  clienteId: string
  jaExistia: boolean
}

function asScore(value: unknown): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

async function registrarFalhaEnvioCrm(
  empresaId: string,
  oportunidade: OportunidadeMonitor,
  message: string,
  actor?: { usuarioId?: string; usuarioNome?: string }
): Promise<void> {
  await updateDoc(doc(db, 'empresas', empresaId, COL_OPORTUNIDADES, oportunidade.id), {
    status: 'aprovado',
    envioCrmErro: message.slice(0, 500),
    atualizadoEm: serverTimestamp(),
  })
  await writeLeadsMonitorAudit({
    empresaId,
    action: 'opportunity.send_crm_fail',
    origem: 'ui',
    connectorId: oportunidade.connectorId,
    usuarioId: actor?.usuarioId,
    usuarioNome: actor?.usuarioNome,
    entidade: 'oportunidade',
    entidadeId: oportunidade.id,
    after: { status: 'aprovado', envioCrmErro: message.slice(0, 200) },
  })
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

  const auditActor = {
    usuarioId: actor?.usuarioId,
    usuarioNome: actor?.usuarioNome || usuarioNome,
  }
  const score = asScore(oportunidade.score)
  const connectorId = asText(oportunidade.connectorId) || 'monitor'

  try {
    const incoming = payloadEmpresaCliente(empresaId, oportunidade, asText(auditActor.usuarioNome))
    const existing = await findExistingCliente({
      empresaId,
      kind: oportunidade.tipo === 'pessoa' ? 'pessoa' : 'empresa',
      telefone: oportunidade.telefone,
      whatsapp: oportunidade.telefone,
      email: oportunidade.email,
      nome: oportunidade.nome,
      empresaCnpj: oportunidade.cnpj,
      leadsMonitorOpportunityId: oportunidade.id,
    })

    let clienteId: string
    let jaExistia = false
    if (existing) {
      await applyClienteMerge(empresaId, existing.id, existing.data, incoming)
      clienteId = existing.id
      jaExistia = true
    } else {
      const ref = await addDoc(collection(db, 'empresas', empresaId, 'clientes'), incoming)
      clienteId = ref.id
    }

    await updateDoc(doc(db, 'empresas', empresaId, COL_OPORTUNIDADES, oportunidade.id), {
      status: 'enviado_crm',
      crmClienteId: clienteId,
      envioCrmErro: null,
      atualizadoEm: serverTimestamp(),
    })

    await garantirConversaFila({
      empresaId,
      clienteId,
      titulo: asText(incoming.nome),
      telefone: asText(incoming.telefone || incoming.whatsapp),
      origemLead: 'leads_monitor',
      origemDetalhe: asText(incoming.origemDetalhe),
      fonte: asText(incoming.fonte || incoming.fontePesquisa),
      fonteId: asText(incoming.fonteId),
      campanhaId: asText(incoming.campanhaId),
      campanhaNome: asText(incoming.campanhaNome || incoming.campanha),
      segmento: asText(incoming.modalidade),
      produto: asText(incoming.produto),
      operacao: asText(oportunidade.metadados?.operacao),
      estado: asText(incoming.estado),
      cidade: asText(incoming.cidade),
      bairro: asText(incoming.bairro),
      cep: asText(incoming.cep),
      pais: 'Brasil',
      responsavel: asText(incoming.responsavel),
      usuarioId: auditActor.usuarioId,
      usuarioNome: auditActor.usuarioNome,
    })

    await writeAudit({
      empresaId,
      usuarioId: auditActor.usuarioId,
      usuarioNome: auditActor.usuarioNome,
      modulo: 'clientes',
      acao: jaExistia ? 'client.updated' : 'client.created',
      entidade: 'cliente',
      entidadeId: clienteId,
      depois: { origem: 'leads_monitor', origemLead: 'leads_monitor', leadsMonitorOpportunityId: oportunidade.id, score },
    })

    await writeLeadsMonitorAudit({
      empresaId,
      action: 'opportunity.send_crm',
      origem: 'ui',
      connectorId,
      ...auditActor,
      entidade: 'oportunidade',
      entidadeId: oportunidade.id,
      after: { status: 'enviado_crm', crmClienteId: clienteId, jaExistia, score },
      meta: { event: 'data.sent_to_crm' },
    })

    return { clienteId, jaExistia }
  } catch (e: any) {
    const message = e?.message || String(e)
    await registrarFalhaEnvioCrm(empresaId, oportunidade, message, actor)
    throw e
  }
}

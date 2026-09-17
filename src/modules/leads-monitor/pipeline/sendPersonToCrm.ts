/**
 * Envio manual de pessoa pesquisada para o CRM (coleção clientes).
 * Score da empresa não bloqueia. Origem canônica: leads_monitor.
 */
import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '../../../firebase'
import { writeAudit } from '../../../lib/audit'
import { COL_PEOPLE_RESEARCH } from '../constants'
import { writeLeadsMonitorAudit } from '../services/auditTrail'
import type { CompanyPeopleResearch } from '../types/peopleResearch'
import type { OportunidadeMonitor } from '../types'
import { garantirConversaFila } from '../../../lib/garantirConversaFila'
import {
  applyClienteMerge,
  asText,
  findExistingCliente,
  payloadPessoaCliente,
} from './crmClientePayload'

export interface EnviarPessoaCrmResult {
  clienteId: string
  jaExistia: boolean
}

export async function enviarPessoaParaCrm(
  empresaId: string,
  person: CompanyPeopleResearch,
  company: OportunidadeMonitor,
  actor?: { usuarioId?: string; usuarioNome?: string }
): Promise<EnviarPessoaCrmResult> {
  const nome = asText(person.personName)
  if (!nome) throw new Error('Pessoa sem nome — não é possível enviar ao CRM.')

  const incoming = payloadPessoaCliente(empresaId, person, company, asText(actor?.usuarioNome))
  const existing = await findExistingCliente({
    empresaId,
    kind: 'pessoa',
    telefone: person.phone,
    whatsapp: person.whatsapp,
    email: asText((person as { email?: string }).email),
    nome,
    empresaCnpj: asText(person.companyCnpj || company.cnpj),
    leadsMonitorPersonId: person.id,
    leadsMonitorOpportunityId: company.id,
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

  await updateDoc(doc(db, 'empresas', empresaId, COL_PEOPLE_RESEARCH, person.id), {
    status: 'enviado_crm',
    crmPersonId: clienteId,
    atualizadoEm: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  await garantirConversaFila({
    empresaId,
    clienteId,
    titulo: nome,
    telefone: asText(incoming.telefone || incoming.whatsapp),
    origemLead: 'leads_monitor',
    origemDetalhe: asText(incoming.origemDetalhe),
    fonte: asText(incoming.fonte || incoming.fontePesquisa),
    fonteId: asText(incoming.fonteId),
    campanhaId: asText(incoming.campanhaId),
    campanhaNome: asText(incoming.campanhaNome || company.nome),
    segmento: asText(incoming.modalidade),
    estado: asText(incoming.estado),
    cidade: asText(incoming.cidade),
    bairro: asText(incoming.bairro),
    cep: asText(incoming.cep),
    pais: 'Brasil',
    responsavel: asText(incoming.responsavel),
    usuarioId: actor?.usuarioId,
    usuarioNome: actor?.usuarioNome,
  })

  await writeAudit({
    empresaId,
    usuarioId: actor?.usuarioId,
    usuarioNome: actor?.usuarioNome,
    modulo: 'clientes',
    acao: jaExistia ? 'client.updated' : 'client.created',
    entidade: 'cliente',
    entidadeId: clienteId,
    depois: { origem: 'leads_monitor', leadsMonitorPersonId: person.id, empresa: company.nome },
  })

  await writeLeadsMonitorAudit({
    empresaId,
    action: 'people.send_crm',
    origem: 'ui',
    usuarioId: actor?.usuarioId,
    usuarioNome: actor?.usuarioNome,
    entidade: 'pessoa',
    entidadeId: person.id,
    after: { status: 'enviado_crm', crmPersonId: clienteId, jaExistia },
  })

  return { clienteId, jaExistia }
}

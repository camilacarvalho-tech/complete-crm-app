/**
 * Payload de cliente Nexus a partir do Leads Monitor.
 * Origem canônica: leads_monitor (rótulo LEADS MONITOR).
 */
import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore'
import { db } from '../../../firebase'
import { agoraEntrada, eventoOrigem, preservarOrigemPrincipal } from '../../../lib/origemLead'
import { digitsOnly, normalizeCompanyName } from './normalizeFields'
import type { CompanyPeopleResearch } from '../types/peopleResearch'
import type { OportunidadeMonitor } from '../types'

export function asText(value: unknown): string {
  if (typeof value === 'string') return value
  if (value == null) return ''
  return String(value)
}

export function phoneDigits(t?: string) {
  return digitsOnly(t)
}

function firstDoc(
  ...snaps: Array<{ empty: boolean; docs: QueryDocumentSnapshot<DocumentData>[] }>
): QueryDocumentSnapshot<DocumentData> | null {
  for (const s of snaps) {
    if (!s.empty) return s.docs[0]
  }
  return null
}

function extrasTipo(data: Record<string, unknown>): string {
  const extras = (data.camposExtras as Record<string, unknown> | undefined) || {}
  return asText(extras.tipoOportunidade)
}

function samePersonRecord(
  data: Record<string, unknown>,
  opts: { nome?: string; kind: 'pessoa' | 'empresa' }
): boolean {
  const nome = normalizeCompanyName(opts.nome).toLowerCase()
  const existingNome = normalizeCompanyName(asText(data.nome)).toLowerCase()
  const tipo = extrasTipo(data)
  const personId = asText(data.leadsMonitorPersonId)
  if (opts.kind === 'pessoa') {
    if (personId) return nome ? existingNome === nome : true
    if (tipo === 'empresa' && existingNome && nome && existingNome !== nome) return false
    return !nome || existingNome === nome
  }
  if (personId && existingNome && nome && existingNome !== nome) return false
  if (tipo === 'pessoa' && existingNome && nome && existingNome !== nome) return false
  return !nome || existingNome === nome
}

export async function findExistingCliente(opts: {
  empresaId: string
  kind: 'pessoa' | 'empresa'
  telefone?: string
  whatsapp?: string
  email?: string
  nome?: string
  empresaCnpj?: string
  leadsMonitorPersonId?: string
  leadsMonitorOpportunityId?: string
}): Promise<{ id: string; data: Record<string, unknown> } | null> {
  const col = collection(db, 'empresas', opts.empresaId, 'clientes')
  if (opts.kind === 'pessoa' && opts.leadsMonitorPersonId) {
    const snap = await getDocs(query(col, where('leadsMonitorPersonId', '==', opts.leadsMonitorPersonId)))
    const hit = firstDoc(snap)
    if (hit) return { id: hit.id, data: hit.data() }
  }
  if (opts.kind === 'empresa' && opts.leadsMonitorOpportunityId) {
    const snap = await getDocs(
      query(col, where('leadsMonitorOpportunityId', '==', opts.leadsMonitorOpportunityId))
    )
    const hit = snap.docs.find((d) => extrasTipo(d.data()) !== 'pessoa' && !asText(d.data().leadsMonitorPersonId))
    if (hit) return { id: hit.id, data: hit.data() }
  }
  const cnpj = phoneDigits(opts.empresaCnpj)
  if (opts.kind === 'empresa' && cnpj.length === 14) {
    const snap = await getDocs(query(col, where('empresaCnpj', '==', cnpj)))
    const hit = snap.docs.find((d) => extrasTipo(d.data()) !== 'pessoa' && !asText(d.data().leadsMonitorPersonId))
    if (hit) return { id: hit.id, data: hit.data() }
  }
  const email = asText(opts.email).trim().toLowerCase()
  if (email.includes('@')) {
    const snap = await getDocs(query(col, where('email', '==', email)))
    const hit = snap.docs.find((d) => samePersonRecord(d.data(), opts))
    if (hit) return { id: hit.id, data: hit.data() }
  }
  const nome = normalizeCompanyName(opts.nome).toLowerCase()
  if (nome && opts.leadsMonitorOpportunityId) {
    const snap = await getDocs(
      query(col, where('leadsMonitorOpportunityId', '==', opts.leadsMonitorOpportunityId))
    )
    const hit = snap.docs.find(
      (d) => normalizeCompanyName(String(d.data().nome || '')).toLowerCase() === nome
    )
    if (hit) return { id: hit.id, data: hit.data() }
  }
  const tel = phoneDigits(opts.telefone || opts.whatsapp)
  if (tel.length >= 10) {
    const [byTel, byWa] = await Promise.all([
      getDocs(query(col, where('telefone', '==', tel))),
      getDocs(query(col, where('whatsapp', '==', tel))),
    ])
    const docs = [...byTel.docs, ...byWa.docs]
    const hit = docs.find((d) => samePersonRecord(d.data(), opts))
    if (hit) return { id: hit.id, data: hit.data() }
  }
  return null
}

function fillIfEmpty(existing: unknown, incoming: string): string {
  const cur = asText(existing)
  return cur || incoming
}

export function mergeClientePermitido(
  existing: Record<string, unknown>,
  incoming: Record<string, unknown>
): Record<string, unknown> {
  const next: Record<string, unknown> = { atualizadoEm: serverTimestamp() }
  const keys = [
    'telefone',
    'whatsapp',
    'email',
    'cidade',
    'estado',
    'bairro',
    'cep',
    'pais',
    'origemDetalhe',
    'fonte',
    'fonteId',
    'campanhaId',
    'campanhaNome',
    'dataEntrada',
    'horaEntrada',
    'endereco',
    'profissao',
    'cargo',
    'empresaNome',
    'empresaCnpj',
    'relacaoEmpresa',
    'fontePesquisa',
    'fonteUrl',
    'linkedinUrl',
    'instagramUrl',
    'facebookUrl',
    'youtubeUrl',
    'tiktokUrl',
    'twitterUrl',
    'leadsMonitorPersonId',
    'leadsMonitorOpportunityId',
  ]
  for (const key of keys) {
    next[key] = fillIfEmpty(existing[key], asText(incoming[key]))
  }
  if (incoming.score != null && existing.score == null) next.score = incoming.score
  Object.assign(next, preservarOrigemPrincipal(existing, incoming))
  next.camposExtras = {
    ...((existing.camposExtras as Record<string, unknown>) || {}),
    ...((incoming.camposExtras as Record<string, unknown>) || {}),
  }
  return next
}

export function payloadEmpresaCliente(
  empresaId: string,
  oportunidade: OportunidadeMonitor,
  actorNome: string
): Record<string, unknown> {
  const tel = phoneDigits(oportunidade.telefone)
  const cnpj = digitsOnly(oportunidade.cnpj)
  const score = Number.isFinite(Number(oportunidade.score)) ? Number(oportunidade.score) : 0
  return {
    tenant_id: empresaId,
    empresaId,
    nome: asText(oportunidade.nome) || 'Sem nome',
    telefone: tel,
    whatsapp: tel,
    email: asText(oportunidade.email),
    cidade: asText(oportunidade.cidade),
    estado: asText(oportunidade.estado),
    bairro: asText(oportunidade.bairro),
    pais: 'Brasil',
    cidadeOrigem: asText(oportunidade.cidade),
    estadoOrigem: asText(oportunidade.estado),
    endereco: asText(oportunidade.endereco),
    cep: asText(oportunidade.cep),
    origemLead: 'leads_monitor',
    origemDetalhe: asText(oportunidade.metadados?.campanha) || asText(oportunidade.origemLabel) || 'Busca do Leads Monitor',
    fonte: asText(oportunidade.origemLabel || oportunidade.connectorId),
    fonteId: asText(oportunidade.connectorId),
    campanhaId: asText(oportunidade.pesquisaId),
    campanhaNome: asText(oportunidade.metadados?.campanha),
    ...agoraEntrada(),
    timestampEntrada: serverTimestamp(),
    historicoOrigens: [
      eventoOrigem({
        origem: 'leads_monitor',
        origemDetalhe: asText(oportunidade.metadados?.campanha) || asText(oportunidade.origemLabel),
        campanha: asText(oportunidade.metadados?.campanha),
        campanhaId: asText(oportunidade.pesquisaId),
        fonte: asText(oportunidade.origemLabel || oportunidade.connectorId),
        fonteId: asText(oportunidade.connectorId),
      }),
    ],
    empresaNome: asText(oportunidade.empresaNome || oportunidade.nome),
    empresaCnpj: cnpj,
    profissao: '',
    cargo: '',
    relacaoEmpresa: '',
    fontePesquisa: asText(oportunidade.origemLabel || oportunidade.connectorId),
    fonteUrl: asText(oportunidade.website),
    linkedinUrl: '',
    instagramUrl: asText(oportunidade.instagram || oportunidade.metadados?.instagram),
    facebookUrl: asText(oportunidade.facebook || oportunidade.metadados?.facebook),
    youtubeUrl: '',
    tiktokUrl: '',
    twitterUrl: '',
    leadsMonitorOpportunityId: asText(oportunidade.id),
    leadsMonitorPersonId: '',
    modalidade: asText(oportunidade.segmento),
    campanha: asText(oportunidade.metadados?.campanha) || asText(oportunidade.pesquisaId),
    produto: asText(oportunidade.metadados?.produto || oportunidade.segmento),
    banco: asText(oportunidade.metadados?.banco),
    convenio: asText(oportunidade.metadados?.operacao) === 'INSS' ? 'inss' : asText(oportunidade.segmento),
    modalidades: asText(oportunidade.segmento) ? [asText(oportunidade.segmento)] : [],
    origem: 'leads_monitor',
    source: 'leads_monitor',
    utm_source: 'leads_monitor',
    utm_medium: asText(oportunidade.connectorId) || 'monitor',
    utm_campaign: asText(oportunidade.origemLabel),
    status: 'Lead',
    pipeline: 'NOVO LEAD',
    pipelineStage: 'novo_lead',
    score,
    temperatura: asText(oportunidade.temperatura),
    observacoes: [
      asText(oportunidade.observacoes),
      `Score Nexus AI: ${score}`,
      cnpj ? `CNPJ: ${cnpj}` : '',
    ]
      .filter((l) => l.length > 0)
      .join('\n'),
    camposExtras: {
      tipoOportunidade: oportunidade.tipo === 'pessoa' ? 'pessoa' : 'empresa',
      connectorId: asText(oportunidade.connectorId),
      cnaePrincipal: asText(oportunidade.dadosEnriquecidos?.cnaePrincipal),
      razaoSocial: asText(oportunidade.dadosEnriquecidos?.razaoSocial),
      nomeFantasia: asText(oportunidade.dadosEnriquecidos?.nomeFantasia),
      situacaoCadastral: asText(oportunidade.dadosEnriquecidos?.situacaoCadastral),
    },
    atendente: actorNome,
    responsavel: actorNome,
    criadoPor: actorNome || 'leads-monitor',
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp(),
  }
}

export function payloadPessoaCliente(
  empresaId: string,
  person: CompanyPeopleResearch,
  company: OportunidadeMonitor,
  actorNome: string
): Record<string, unknown> {
  const tel = phoneDigits(person.phone || person.whatsapp)
  const wa = phoneDigits(person.whatsapp || person.phone)
  const score = Number.isFinite(Number(company.score)) ? Number(company.score) : 0
  return {
    tenant_id: empresaId,
    empresaId,
    nome: asText(person.personName),
    telefone: tel,
    whatsapp: wa,
    email: asText((person as { email?: string }).email),
    cidade: asText(company.cidade),
    estado: asText(company.estado),
    bairro: asText(company.bairro),
    cep: asText(company.cep),
    pais: 'Brasil',
    origemLead: 'leads_monitor',
    origemDetalhe: asText(person.sourceName || company.metadados?.campanha) || 'Pessoa — Leads Monitor',
    fonte: asText(person.sourceName || person.source),
    fonteId: asText(person.source),
    campanhaId: asText(company.pesquisaId),
    campanhaNome: asText(company.metadados?.campanha),
    ...agoraEntrada(),
    timestampEntrada: serverTimestamp(),
    historicoOrigens: [
      eventoOrigem({
        origem: 'leads_monitor',
        origemDetalhe: asText(person.sourceName),
        campanha: asText(company.metadados?.campanha),
        campanhaId: asText(company.pesquisaId),
        fonte: asText(person.sourceName || person.source),
        fonteId: asText(person.source),
      }),
    ],
    cidadeOrigem: asText(company.cidade),
    estadoOrigem: asText(company.estado),
    endereco: asText(company.endereco),
    empresaNome: asText(person.companyName || company.nome),
    empresaCnpj: digitsOnly(person.companyCnpj || company.cnpj),
    profissao: asText(person.jobTitle),
    cargo: asText(person.jobTitle),
    relacaoEmpresa: asText(person.relationToCompany),
    fontePesquisa: asText(person.sourceName || person.source),
    fonteUrl: asText(person.sourceUrl),
    linkedinUrl: asText(person.linkedinUrl),
    instagramUrl: asText(person.instagramUrl),
    facebookUrl: asText(person.facebookUrl),
    youtubeUrl: '',
    tiktokUrl: '',
    twitterUrl: '',
    leadsMonitorPersonId: asText(person.id),
    leadsMonitorOpportunityId: asText(company.id),
    modalidade: asText(company.segmento),
    modalidades: asText(company.segmento) ? [asText(company.segmento)] : [],
    origem: 'leads_monitor',
    source: 'leads_monitor',
    utm_source: 'leads_monitor',
    utm_medium: asText(person.source) || 'people_search',
    utm_campaign: asText(company.nome),
    status: 'Lead',
    pipeline: 'NOVO LEAD',
    pipelineStage: 'novo_lead',
    score,
    temperatura: asText(company.temperatura),
    observacoes: [
      `Empresa: ${asText(company.nome)}`,
      person.jobTitle ? `Cargo: ${asText(person.jobTitle)}` : '',
      `Relação: ${asText(person.relationToCompany)}`,
      `Fonte: ${asText(person.sourceName || person.source)}`,
      person.sourceUrl ? `URL: ${asText(person.sourceUrl)}` : '',
      `Score da empresa (contexto): ${score}`,
    ]
      .filter((l) => l.length > 0)
      .join('\n'),
    camposExtras: {
      tipoOportunidade: 'pessoa',
      companyPeopleId: asText(person.id),
      relationToCompany: asText(person.relationToCompany),
      evidência: asText(person.sourceName),
    },
    atendente: actorNome,
    responsavel: actorNome,
    criadoPor: actorNome || 'leads-monitor',
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp(),
  }
}

export async function applyClienteMerge(
  empresaId: string,
  existingId: string,
  existingData: Record<string, unknown>,
  incoming: Record<string, unknown>
): Promise<void> {
  await updateDoc(doc(db, 'empresas', empresaId, 'clientes', existingId), mergeClientePermitido(existingData, incoming))
}

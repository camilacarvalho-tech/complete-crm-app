/**
 * Person Discovery Engine — cascata empresa → pessoa → contato.
 * Não inventa CPF/WhatsApp. Telefone da empresa não vira contato pessoal.
 */
import { addDoc, collection, doc, getDocs, query, serverTimestamp, updateDoc, where } from 'firebase/firestore'
import { db } from '../../../firebase'
import { COL_OPORTUNIDADES, COL_PEOPLE_RESEARCH } from '../constants'
import { qualificationFromScore } from '../catalog/produtosMonitor'
import { personLeadDedupeKeys } from '../pipeline/personLead'
import { enviarPessoaParaCrm } from '../pipeline/sendPersonToCrm'
import { writeLeadsMonitorAudit } from '../services/auditTrail'
import { writeLeadsMonitorLog } from '../services/opsLogs'
import type { OportunidadeMonitor } from '../types'
import type { CompanyPeopleResearch } from '../types/peopleResearch'
import type { PersonLead } from '../types/personLead'
import { resolvePersonContact } from './personContactResolver'
import { contactStatusOf, emptyPersonDiscoveryResult, type PersonDiscoveryResult, type PersonSourceQueryResult } from './personDiscoveryResult'
import { enrichPerson } from './personEnrichment'
import type { DiscoveredPersonRaw, PersonDiscoveryInput, PersonDiscoveryStatus } from './personSourceTypes'
import { authorizedEmployeeSource, searchRaisCagedIntelligence } from './providers/authorizedEmployeeSource'
import { searchInssIntelligence } from './providers/inssIntelligenceProvider'
import { searchPublicOfficialPersons } from './providers/publicOfficialPersonProvider'
import { searchReceitaCnpjQsa } from './providers/receitaCnpjQsa'

function omitEmpty(data: Record<string, unknown>) {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined) continue
    out[k] = v
  }
  return out
}

function discoveryScore(p: {
  nome: string
  empresa: string
  cargo: string
  vinculoVerificado: boolean
  telefone: string
  whatsapp: string
  email: string
  origem: string
}): number {
  let s = 0
  if (p.nome) s += 20
  if (p.empresa) s += 10
  if (p.cargo) s += 10
  if (p.vinculoVerificado) s += 15
  if (p.telefone) s += 15
  if (p.whatsapp) s += 20
  if (p.email) s += 5
  if (p.origem) s += 5
  return Math.min(100, Math.max(0, s))
}

function toRelationStore(rel: string): CompanyPeopleResearch['relationToCompany'] {
  const r = rel.toLowerCase()
  if (r.includes('admin')) return 'administrador'
  if (r.includes('socio') || r.includes('sócio')) return 'socio'
  if (r.includes('respons')) return 'gestor'
  if (r.includes('funcion')) return 'funcionario'
  return 'nao_confirmado'
}

function rawToLead(raw: DiscoveredPersonRaw, input: PersonDiscoveryInput, contact: ReturnType<typeof resolvePersonContact>): PersonLead {
  const score = discoveryScore({
    nome: raw.personName,
    empresa: input.companyName,
    cargo: raw.jobTitle || '',
    vinculoVerificado: raw.vinculoVerificado,
    telefone: contact.telefone,
    whatsapp: contact.whatsapp,
    email: contact.email,
    origem: raw.source,
  })
  const classification = qualificationFromScore(score)
  const isClt = input.product === 'CREDITO_CLT' || input.operation === 'CREDITO_CLT'
  return {
    id: '',
    nome: raw.personName,
    cpf: raw.cpf || '',
    whatsapp: contact.whatsapp,
    telefone: contact.telefone,
    email: contact.email,
    endereco: '',
    numero: '',
    complemento: '',
    bairro: '',
    cep: '',
    cidade: input.city || '',
    estado: input.state || '',
    empresaId: input.empresaId,
    empresa: input.companyName,
    cnpj: input.companyCnpj || '',
    cargo: raw.jobTitle || '',
    vinculo: raw.relationToCompany,
    vinculoVerificado: raw.vinculoVerificado,
    fonteVinculo: raw.fonteVinculo,
    segmento: '',
    produto: input.product || '',
    operacao: input.operation || '',
    campanhaId: input.campaignId || '',
    campanha: '',
    origem: 'leads_monitor',
    fonte: raw.source,
    source: raw.source,
    sourceUrl: raw.sourceUrl,
    collectedAt: raw.collectedAt || null,
    score,
    classification,
    status: contact.contactStatus === 'NONE' ? 'PENDENTE' : 'encontrado',
    contextoCLT: isClt
      ? {
          cargo: raw.jobTitle || '',
          empresa: input.companyName,
          cnpj: input.companyCnpj || '',
          vinculo: raw.relationToCompany,
          vinculoVerificado: raw.vinculoVerificado,
          fonteVinculo: raw.fonteVinculo,
        }
      : null,
    contextoINSS: null,
    contextoProduto: input.product
      ? { produto: input.product, operacao: input.operation || '', notas: '' }
      : null,
    enrichmentStatus: 'NOT_CONFIGURED',
    enrichmentProviders: [],
    enrichmentFields: [],
    enrichmentUpdatedAt: null,
    purpose: '',
    legalBasis: '',
    consentStatus: '',
    optOut: false,
    blocked: false,
    deleted: false,
    corrected: false,
    telefoneValid: contact.telefone ? true : null,
    whatsappValid: contact.whatsapp ? true : null,
    emailValid: contact.email ? true : null,
    personDiscoveryStatus: contact.contactStatus === 'NONE' ? 'FOUND_WITHOUT_CONTACT' : 'FOUND_WITH_CONTACT',
    contactStatus: contact.contactStatus,
    relationshipStatus: raw.vinculoVerificado ? 'VERIFIED' : 'UNVERIFIED',
    dataNascimento: '',
    originalData: undefined,
    enrichedData: undefined,
    enrichmentHistory: [],
    enrichmentCandidates: [],
    enrichmentSources: [],
    enrichmentMetadata: [],
  }
}

async function logDiscovery(empresaId: string, action: string, meta: Record<string, unknown>) {
  await writeLeadsMonitorLog({
    empresaId,
    level: 'info',
    message: action,
    connectorId: 'person_discovery',
    meta,
  })
  await writeLeadsMonitorAudit({
    empresaId,
    action,
    origem: 'system',
    entidade: 'person_discovery',
    entidadeId: String(meta.companyId || ''),
    meta,
  })
}

export async function runPersonDiscovery(input: PersonDiscoveryInput): Promise<PersonDiscoveryResult> {
  await logDiscovery(input.empresaId, 'PERSON_DISCOVERY_START', {
    companyId: input.companyId,
    product: input.product || '',
    operation: input.operation || '',
    hasCnpj: Boolean(input.companyCnpj),
  })

  const sourceResults: PersonSourceQueryResult[] = []
  const rawPeople: DiscoveredPersonRaw[] = []

  const isInss = input.product === 'INSS' || input.operation === 'INSS'
  if (isInss) {
    const intel = await searchInssIntelligence()
    sourceResults.push(intel)
    await logDiscovery(input.empresaId, 'PERSON_SOURCE_QUERY', { source: intel.id, status: intel.status })
    sourceResults.push(await searchPublicOfficialPersons())
    const out = emptyPersonDiscoveryResult('PERSON_SOURCE_NOT_CONFIGURED')
    out.sourceResults = sourceResults
    await updateCompanyDiscovery(input, 'NOT_CONFIGURED')
    await logDiscovery(input.empresaId, 'PERSON_SOURCE_NOT_CONFIGURED', { companyId: input.companyId })
    await logDiscovery(input.empresaId, 'PERSON_DISCOVERY_FINISHED', { status: out.status, pessoas: 0 })
    return out
  }

  if (input.targetType === 'COMPANY_TO_PERSON' || input.product === 'CREDITO_CLT' || input.operation === 'CREDITO_CLT') {
    const emp = await authorizedEmployeeSource.searchEmployees(input)
    sourceResults.push(...emp.sourceResults)
    const rais = await searchRaisCagedIntelligence()
    sourceResults.push(rais)
  }

  sourceResults.push(await searchPublicOfficialPersons())

  await logDiscovery(input.empresaId, 'PERSON_SOURCE_QUERY', { source: 'receita_cnpj_qsa' })
  const qsa = await searchReceitaCnpjQsa(input.companyCnpj)
  sourceResults.push(qsa)
  rawPeople.push(...qsa.people)

  await logDiscovery(input.empresaId, 'PERSON_ENRICHMENT_START', { companyId: input.companyId })
  const enrich = await enrichPerson(input)
  await logDiscovery(input.empresaId, enrich.found ? 'PERSON_ENRICHMENT_SUCCESS' : 'PERSON_ENRICHMENT_EMPTY', {
    status: enrich.enrichmentStatus,
  })

  const seen = new Set<string>()
  const peopleFound: PersonLead[] = []
  for (const raw of rawPeople) {
    const contact = resolvePersonContact({
      whatsapp: raw.whatsapp,
      phone: raw.phone,
      email: raw.email,
      companyPhone: input.companyPhone,
      contactTypeHint: raw.contactType,
    })
    const lead = rawToLead(raw, input, contact)
    lead.enrichmentStatus = enrich.enrichmentStatus
    const keys = personLeadDedupeKeys(lead)
    const nameCo = `nomeemp:${lead.nome.toLowerCase()}|${lead.empresa.toLowerCase()}`
    const allKeys = [...keys, nameCo]
    if (allKeys.some((k) => seen.has(k))) continue
    allKeys.forEach((k) => seen.add(k))
    peopleFound.push(lead)
    await logDiscovery(input.empresaId, contact.contactStatus === 'NONE' ? 'PERSON_FOUND_WITHOUT_CONTACT' : 'PERSON_FOUND_WITH_CONTACT', {
      companyId: input.companyId,
      hasName: Boolean(lead.nome),
    })
    await logDiscovery(input.empresaId, 'PERSON_FOUND', { companyId: input.companyId })
  }

  const peopleWithContact = peopleFound.filter((p) => contactStatusOf(p) !== 'NONE')
  const peopleWithoutContact = peopleFound.filter((p) => contactStatusOf(p) === 'NONE')

  let status: PersonDiscoveryStatus = 'NOT_FOUND'
  if (peopleWithContact.length) status = 'FOUND_WITH_CONTACT'
  else if (peopleWithoutContact.length) status = 'FOUND_WITHOUT_CONTACT'
  else if (sourceResults.some((s) => s.status === 'NOT_CONFIGURED' || s.status === 'PERSON_SOURCE_NOT_CONFIGURED') && !qsa.people.length) {
    status = peopleFound.length ? status : 'NOT_CONFIGURED'
  }

  const persisted = await persistPeople(input, peopleFound)
  if (status === 'FOUND_WITH_CONTACT') {
    await maybeSendToCrm(input, persisted.filter((p) => contactStatusOf(p) !== 'NONE'))
  }
  await updateCompanyDiscovery(input, status)

  await logDiscovery(input.empresaId, 'PERSON_DISCOVERY_FINISHED', {
    status,
    pessoas: peopleFound.length,
    comContato: peopleWithContact.length,
  })

  return {
    peopleFound: persisted,
    peopleWithContact,
    peopleWithoutContact,
    sourceResults,
    status,
    companiesFound: 1,
    pessoasEncontradas: peopleFound.length,
    pessoasComWhatsapp: peopleFound.filter((p) => p.whatsapp).length,
    pessoasComTelefone: peopleFound.filter((p) => p.telefone).length,
    pessoasSemContato: peopleWithoutContact.length,
  }
}

async function persistPeople(input: PersonDiscoveryInput, people: PersonLead[]): Promise<PersonLead[]> {
  const col = collection(db, 'empresas', input.empresaId, COL_PEOPLE_RESEARCH)
  const existing = await getDocs(query(col, where('opportunityId', '==', input.companyId)))
  const seen = new Set(
    existing.docs.flatMap((d) => {
      const x = d.data()
      return personLeadDedupeKeys({
        whatsapp: String(x.whatsapp || ''),
        telefone: String(x.phone || x.telefone || ''),
        email: String(x.email || ''),
        cpf: String(x.cpf || ''),
        nome: String(x.personName || x.nome || ''),
        empresa: String(x.companyName || ''),
      })
    })
  )
  const out: PersonLead[] = []
  for (const lead of people) {
    const keys = personLeadDedupeKeys(lead).concat([`nomeemp:${lead.nome.toLowerCase()}|${lead.empresa.toLowerCase()}`])
    if (keys.some((k) => seen.has(k))) continue
    keys.forEach((k) => seen.add(k))
    const contactStatus = contactStatusOf(lead)
    const ref = await addDoc(
      col,
      omitEmpty({
        empresaId: input.empresaId,
        companyId: input.companyId,
        opportunityId: input.companyId,
        companyName: lead.empresa,
        companyCnpj: lead.cnpj,
        personName: lead.nome,
        nome: lead.nome,
        jobTitle: lead.cargo,
        relationToCompany: toRelationStore(lead.vinculo),
        vinculo: lead.vinculo,
        vinculoVerificado: lead.vinculoVerificado,
        fonteVinculo: lead.fonteVinculo,
        phone: lead.telefone,
        telefone: lead.telefone,
        phoneType: lead.telefone ? 'autorizado' : 'nao_identificado',
        phoneSource: lead.fonte,
        phoneSourceUrl: lead.sourceUrl,
        whatsapp: lead.whatsapp,
        whatsappSource: lead.fonte,
        whatsappSourceUrl: lead.sourceUrl,
        whatsappVerified: false,
        email: lead.email || null,
        cpf: lead.cpf || null,
        source: lead.source,
        sourceUrl: lead.sourceUrl,
        sourceName: lead.fonte,
        sourceType: 'COMPANY_SOURCE',
        confidence: lead.score,
        foundAt: serverTimestamp(),
        collectedAt: serverTimestamp(),
        status: contactStatus === 'NONE' ? 'PENDENTE' : 'encontrado',
        crmPersonId: null,
        linkedinUrl: '',
        instagramUrl: '',
        facebookUrl: '',
        dedupeKey: keys[0] || `nomeemp:${lead.nome}|${lead.empresa}`,
        produto: lead.produto,
        operacao: lead.operacao,
        campanhaId: lead.campanhaId,
        score: lead.score,
        classification: lead.classification,
        personDiscoveryStatus: contactStatus === 'NONE' ? 'FOUND_WITHOUT_CONTACT' : 'FOUND_WITH_CONTACT',
        contactStatus: contactStatus === 'NONE' ? 'PENDENTE' : contactStatus,
        relationshipStatus: lead.vinculoVerificado ? 'VERIFIED' : 'UNVERIFIED',
        cidade: lead.cidade,
        estado: lead.estado,
        origem: 'leads_monitor',
        criadoEm: serverTimestamp(),
        createdAt: serverTimestamp(),
        atualizadoEm: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    )
    out.push({ ...lead, id: ref.id })
  }
  return out
}

async function maybeSendToCrm(input: PersonDiscoveryInput, people: PersonLead[]) {
  const opp = {
    id: input.companyId,
    empresaId: input.empresaId,
    nome: input.companyName,
    cnpj: input.companyCnpj,
    telefone: input.companyPhone,
    cidade: input.city || '',
    estado: input.state || '',
    segmento: '',
    connectorId: 'person_discovery',
    origemLabel: 'PERSON DISCOVERY',
    dedupeKey: input.companyId,
    tipo: 'empresa',
    consentimentoLgpd: true,
    baseLegal: 'interesse_legitimo',
    status: 'novo',
    score: 0,
    temperatura: 'Frio',
    classificacao: '',
    motivosScore: [],
    origemScore: 'nexus_ai_heuristica',
    metadados: { produto: input.product, operacao: input.operation, campanha: input.campaignId },
    pesquisaId: input.campaignId || null,
  } as unknown as OportunidadeMonitor

  for (const lead of people) {
    if (!lead.whatsapp && !lead.telefone) continue
    const person = {
      id: lead.id,
      empresaId: lead.empresaId,
      companyId: input.companyId,
      opportunityId: input.companyId,
      companyName: lead.empresa,
      companyCnpj: lead.cnpj,
      personName: lead.nome,
      jobTitle: lead.cargo,
      relationToCompany: toRelationStore(lead.vinculo),
      phone: lead.telefone,
      phoneType: 'autorizado',
      phoneSource: lead.fonte,
      phoneSourceUrl: lead.sourceUrl,
      whatsapp: lead.whatsapp,
      whatsappSource: lead.fonte,
      whatsappSourceUrl: lead.sourceUrl,
      whatsappVerified: false,
      source: lead.source,
      sourceUrl: lead.sourceUrl,
      sourceName: lead.fonte,
      confidence: lead.score,
      status: 'encontrado',
      crmPersonId: null,
      linkedinUrl: '',
      instagramUrl: '',
      facebookUrl: '',
      dedupeKey: lead.id,
      email: lead.email,
      cpf: lead.cpf,
    } as CompanyPeopleResearch
    try {
      await enviarPessoaParaCrm(input.empresaId, person, opp, input.actor)
    } catch {
      /* CRM/fila já existente — falha isolada não perde o PERSON_LEAD */
    }
  }
}

async function updateCompanyDiscovery(input: PersonDiscoveryInput, status: PersonDiscoveryStatus) {
  try {
    await updateDoc(doc(db, 'empresas', input.empresaId, COL_OPORTUNIDADES, input.companyId), {
      personDiscoveryStatus: status,
      atualizadoEm: serverTimestamp(),
    })
  } catch {
    /* empresa pode não existir ainda */
  }
}

export async function runPersonDiscoveryForNewCompanies(opts: {
  empresaId: string
  companies: Array<{ id: string; nome: string; cnpj?: string; telefone?: string; cidade?: string; estado?: string }>
  filtros: {
    operacao?: string
    produtos?: string[]
    campanha?: string
    tipoBusca?: string
    personFieldsRequested?: string[]
    contactFieldsRequested?: string[]
  }
  maxCompanies?: number
}): Promise<PersonDiscoveryResult> {
  const tipo = opts.filtros.tipoBusca || ''
  const product = (opts.filtros.produtos || [])[0] || opts.filtros.operacao || ''
  const cap = opts.maxCompanies ?? 8
  const slice = opts.companies.slice(0, cap)
  const acc = emptyPersonDiscoveryResult('NOT_FOUND')
  acc.companiesFound = opts.companies.length
  for (const c of slice) {
    const one = await runPersonDiscovery({
      empresaId: opts.empresaId,
      campaignId: opts.filtros.campanha,
      product,
      operation: opts.filtros.operacao,
      city: c.cidade,
      state: c.estado,
      companyId: c.id,
      companyName: c.nome,
      companyCnpj: c.cnpj,
      companyPhone: c.telefone,
      targetType: tipo === 'pessoa' ? 'PERSON' : 'COMPANY_TO_PERSON',
      personFieldsRequested: opts.filtros.personFieldsRequested,
      contactFieldsRequested: opts.filtros.contactFieldsRequested,
    })
    acc.peopleFound.push(...one.peopleFound)
    acc.peopleWithContact.push(...one.peopleWithContact)
    acc.peopleWithoutContact.push(...one.peopleWithoutContact)
    acc.sourceResults.push(...one.sourceResults)
    acc.pessoasEncontradas += one.pessoasEncontradas
    acc.pessoasComWhatsapp += one.pessoasComWhatsapp
    acc.pessoasComTelefone += one.pessoasComTelefone
    acc.pessoasSemContato += one.pessoasSemContato
    if (one.status === 'FOUND_WITH_CONTACT') acc.status = 'FOUND_WITH_CONTACT'
    else if (acc.status !== 'FOUND_WITH_CONTACT' && one.status === 'FOUND_WITHOUT_CONTACT') acc.status = 'FOUND_WITHOUT_CONTACT'
  }
  return acc
}

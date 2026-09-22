/**
 * Confirmação da importação em Campanhas.
 * Parser: parseImportedWorkbook + csvImportMap (já aplicados nas linhas).
 * Persistência: PERSON_LEAD em companyPeopleResearch (Pessoas do Monitor).
 */
import { addDoc, collection, doc, getDocs, serverTimestamp, writeBatch } from 'firebase/firestore'
import { db } from '../../../firebase'
import { COL_OPORTUNIDADES, COL_PEOPLE_RESEARCH } from '../constants'
import { omitUndefinedForFirestore } from '../services/jobQueue'
import type { CompanyPeopleResearch } from '../types/peopleResearch'
import type { OportunidadeMonitor } from '../types'
import { collectDedupeKeys } from './dedupe'
import { digitsOnly, normalizeCompanyName } from './normalizeFields'
import { personLeadDedupeKeys } from './personLead'
import { isLikelyPersonName } from './csvImportMap'
import { isValidCpf } from '../enrichment/cpf'
import { getCallableEnrichmentProviders } from '../enrichment/enrichmentRegistry'
import { runEnrichmentQueue } from '../enrichment/enrichmentQueue'
import { getNxErpCampaignAdapter } from '../../../integrations/nxErpCampaign'

export type CampaignImportKind = 'pessoa' | 'empresa' | 'invalido'

export type CampaignImportPreviewRow = {
  nome: string
  cpf: string
  whatsapp: string
  telefone: string
  empresa: string
  cidade: string
  uf: string
  kind: CampaignImportKind
}

export type CampaignImportSummary = {
  arquivo: string
  registros: number
  validos: number
  pessoas: number
  empresas: number
  whatsapps: number
  telefones: number
  cpfs: number
  duplicados: number
  invalidos: number
  pessoasCriadas: number
  pessoasAtualizadas: number
  salvos: number
  falharam: number
  enfileirados: number
  campaignId: string
  partial: boolean
  enrichMessage?: string
}

export function classifyImportedRow(m: Record<string, string>): CampaignImportKind {
  const nome = (m.nome || '').trim()
  const empresa = (m.empresa || m.razaoSocial || m.nomeFantasia || '').trim()
  const cnpj = digitsOnly(m.cnpj)
  const personOk = isLikelyPersonName(nome) || isValidCpf(m.cpf)
  if (personOk) return 'pessoa'
  if (isLikelyPersonName(empresa) || cnpj.length === 14) return 'empresa'
  return 'invalido'
}

export function campaignImportPreview(mappedRows: Record<string, string>[]): {
  pessoas: number
  empresas: number
  whatsapps: number
  telefones: number
  cpfs: number
  invalidos: number
  duplicados: number
  validos: number
  preview: CampaignImportPreviewRow[]
} {
  const seen = new Set<string>()
  let pessoas = 0
  let empresas = 0
  let whatsapps = 0
  let telefones = 0
  let invalidos = 0
  let duplicados = 0
  let cpfs = 0
  const preview: CampaignImportPreviewRow[] = []
  for (const m of mappedRows) {
    const kind = classifyImportedRow(m)
    const row: CampaignImportPreviewRow = {
      nome: isLikelyPersonName(m.nome) ? (m.nome || '').trim() : '',
      cpf: digitsOnly(m.cpf),
      whatsapp: digitsOnly(m.whatsapp),
      telefone: digitsOnly(m.telefone),
      empresa: (m.empresa || m.razaoSocial || m.nomeFantasia || '').trim(),
      cidade: (m.cidade || '').trim(),
      uf: (m.uf || '').trim().toUpperCase(),
      kind,
    }
    if (kind === 'invalido') invalidos += 1
    else if (kind === 'pessoa') {
      pessoas += 1
      if (row.whatsapp.length >= 10) whatsapps += 1
      if (row.telefone.length >= 10) telefones += 1
      if (isValidCpf(row.cpf)) cpfs += 1
    } else empresas += 1
    const keys = personLeadDedupeKeys({
      nome: row.nome,
      whatsapp: row.whatsapp,
      telefone: row.telefone,
      email: m.email || '',
      cpf: row.cpf,
      empresa: row.empresa,
    })
    if (keys.some((k) => seen.has(k))) duplicados += 1
    keys.forEach((k) => seen.add(k))
    if (preview.length < 12) preview.push(row)
  }
  return {
    pessoas,
    empresas,
    whatsapps,
    telefones,
    cpfs,
    invalidos,
    duplicados,
    validos: pessoas + empresas,
    preview,
  }
}

function fillEmpty(target: Record<string, unknown>, next: Record<string, unknown>) {
  for (const [k, v] of Object.entries(next)) {
    if (v === undefined || v === null || v === '') continue
    const cur = target[k]
    if (cur === undefined || cur === null || cur === '') target[k] = v
  }
}

const BATCH_LIMIT = 400

export async function persistCampaignWorkbook(opts: {
  empresaId: string
  arquivoNome: string
  campanhaNome?: string
  produto?: string
  origem?: string
  segmento?: string
  usuarioId?: string
  usuarioNome?: string
  rows: Record<string, string>[]
  rawRows?: Record<string, string>[]
  onProgress?: (info: { current: number; total: number; label: string }) => void
}): Promise<CampaignImportSummary> {
  const source = /\.(xlsx|xls|ods)$/i.test(opts.arquivoNome) ? 'planilha_xlsx' : 'planilha_csv'
  const peopleSnap = await getDocs(collection(db, 'empresas', opts.empresaId, COL_PEOPLE_RESEARCH))
  const oppSnap = await getDocs(collection(db, 'empresas', opts.empresaId, COL_OPORTUNIDADES))

  const peopleIndex = new Map<string, { id: string; data: Record<string, unknown> }>()
  for (const d of peopleSnap.docs) {
    const data = d.data() as CompanyPeopleResearch
    const keys = personLeadDedupeKeys({
      nome: data.personName,
      whatsapp: data.whatsapp,
      telefone: data.phone,
      email: String((data as { email?: string }).email || ''),
      cpf: String((data as { cpf?: string }).cpf || ''),
      empresa: data.companyName,
    })
    for (const k of keys) if (!peopleIndex.has(k)) peopleIndex.set(k, { id: d.id, data: { ...data } })
  }

  const oppIndex = new Map<string, { id: string; data: Partial<OportunidadeMonitor> }>()
  const companies: OportunidadeMonitor[] = []
  for (const d of oppSnap.docs) {
    const data = d.data() as OportunidadeMonitor
    companies.push({ ...data, id: d.id })
    const keys = collectDedupeKeys({
      dedupeKey: data.dedupeKey || '',
      telefone: data.telefone,
      email: data.email,
      cnpj: data.cnpj,
      nome: data.nome || '',
      placeId: data.placeId,
      dominio: data.dominio,
      website: data.website,
      endereco: data.endereco,
      cidade: data.cidade,
      externalId: data.externalId,
      metadados: data.metadados,
    })
    for (const k of keys) if (!oppIndex.has(k)) oppIndex.set(k, { id: d.id, data })
  }

  const stats = campaignImportPreview(opts.rows)
  const campanhaNome = opts.campanhaNome || opts.arquivoNome.replace(/\.[^.]+$/, '')
  const campRef = await addDoc(
    collection(db, 'empresas', opts.empresaId, 'campanhas'),
    omitUndefinedForFirestore({
      nome: campanhaNome,
      campaignName: campanhaNome,
      campaignId: '',
      product: opts.produto || '',
      operation: opts.rows[0]?.operacao || '',
      segment: opts.segmento || '',
      subsegment: '',
      source: source,
      origem: opts.origem || 'planilha_csv',
      status: 'rascunho',
      leadCount: stats.validos,
      qualifiedCount: 0,
      whatsappCount: stats.whatsapps,
      phoneCount: stats.telefones,
      arquivoNome: opts.arquivoNome,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  )
  const campaignId = campRef.id

  try {
    const adapter = getNxErpCampaignAdapter()
    await adapter.createCampaign({
      campaignId,
      campaignName: campanhaNome,
      product: opts.produto || '',
      operation: opts.rows[0]?.operacao || '',
      segment: opts.segmento || '',
      origin: opts.origem || 'planilha_csv',
      source,
      leads: [],
    })
  } catch {
    /* NOT_CONFIGURED não bloqueia */
  }

  let pessoas = 0
  let empresas = 0
  let whatsapps = 0
  let telefones = 0
  let cpfs = 0
  let duplicados = 0
  let invalidos = 0
  let pessoasCriadas = 0
  let pessoasAtualizadas = 0
  let salvos = 0
  let falharam = 0
  const touchedPeople: CompanyPeopleResearch[] = []
  const pending: Array<{ ref: ReturnType<typeof doc>; data: Record<string, unknown>; merge: boolean }> = []

  function queueWrite(ref: ReturnType<typeof doc>, data: Record<string, unknown>, merge: boolean) {
    pending.push({ ref, data, merge })
  }

  function upsertCompanyLocal(m: Record<string, string>, companyPhone: string): string {
    const companyName = normalizeCompanyName(m.empresa || m.razaoSocial || m.nomeFantasia)
    const cnpj = digitsOnly(m.cnpj)
    const keys = collectDedupeKeys({
      dedupeKey: '',
      cnpj,
      nome: companyName,
      telefone: companyPhone,
      email: m.email || '',
      endereco: m.endereco || '',
      cidade: m.cidade || '',
    })
    const hit = keys.map((k) => oppIndex.get(k)).find(Boolean)
    const payload = omitUndefinedForFirestore({
      nome: companyName,
      cnpj: cnpj || '',
      telefone: companyPhone,
      email: (m.email || '').trim(),
      endereco: (m.endereco || '').trim(),
      cidade: (m.cidade || '').trim(),
      estado: (m.uf || '').trim().toUpperCase(),
      cep: (m.cep || '').trim(),
      origemFonte: source,
      origemLabel: 'Planilha campanha',
      empresaId: opts.empresaId,
      tipo: 'empresa',
      status: 'novo',
      metadados: {
        campanha: campanhaNome,
        campaignId,
        produto: opts.produto || m.produto || '',
        operacao: m.operacao || '',
        origemArquivo: opts.arquivoNome,
      },
      atualizadoEm: serverTimestamp(),
    })
    if (hit) {
      const fill: Record<string, unknown> = {}
      fillEmpty(fill, payload as Record<string, unknown>)
      if (Object.keys(fill).length) queueWrite(doc(db, 'empresas', opts.empresaId, COL_OPORTUNIDADES, hit.id), fill, true)
      return hit.id
    }
    const ref = doc(collection(db, 'empresas', opts.empresaId, COL_OPORTUNIDADES))
    queueWrite(
      ref,
      omitUndefinedForFirestore({
        ...payload,
        criadoEm: serverTimestamp(),
        encontradoEm: serverTimestamp(),
        primeiraDescoberta: serverTimestamp(),
        ultimaDescoberta: serverTimestamp(),
        vezesEncontrada: 1,
        fontes: [source],
      }),
      false
    )
    for (const k of keys) oppIndex.set(k, { id: ref.id, data: payload as Partial<OportunidadeMonitor> })
    return ref.id
  }

  opts.rows.forEach((m, index) => {
    const kind = classifyImportedRow(m)
    if (kind === 'invalido') {
      invalidos += 1
      return
    }
    const personName = isLikelyPersonName(m.nome) ? normalizeCompanyName(m.nome) : ''
    const companyName = normalizeCompanyName(m.empresa || m.razaoSocial || m.nomeFantasia)
    const personTel = kind === 'pessoa' ? (m.telefone || '').trim() : ''
    const personWa = kind === 'pessoa' ? (m.whatsapp || '').trim() : ''
    const companyPhone = kind === 'empresa' ? (m.telefone || '').trim() : ''

    if (kind === 'empresa') {
      empresas += 1
      upsertCompanyLocal(m, companyPhone)
      return
    }

    pessoas += 1
    if (digitsOnly(personWa).length >= 10) whatsapps += 1
    if (digitsOnly(personTel).length >= 10) telefones += 1
    if (isValidCpf(m.cpf)) cpfs += 1

    let opportunityId = ''
    if (companyName || digitsOnly(m.cnpj).length === 14) opportunityId = upsertCompanyLocal(m, '')

    const keys = personLeadDedupeKeys({
      nome: personName,
      whatsapp: personWa,
      telefone: personTel,
      email: m.email || '',
      cpf: m.cpf || '',
      empresa: companyName,
    })
    const raw = opts.rawRows?.[index] || m
    const originalData = {
      ...raw,
      nome: personName,
      cpf: digitsOnly(m.cpf),
      telefone: personTel,
      whatsapp: personWa,
      email: (m.email || '').trim(),
      endereco: (m.endereco || '').trim(),
      numero: (m.numero || '').trim(),
      complemento: (m.complemento || '').trim(),
      bairro: (m.bairro || '').trim(),
      cep: (m.cep || '').trim(),
      cidade: (m.cidade || '').trim(),
      estado: (m.uf || '').trim().toUpperCase(),
      empresa: companyName,
      cnpj: digitsOnly(m.cnpj),
      cargo: (m.cargo || '').trim(),
      vinculo: (m.vinculo || '').trim(),
      produto: (m.produto || opts.produto || '').trim(),
      operacao: (m.operacao || '').trim(),
      campanha: campanhaNome,
      campaignId,
      arquivo: opts.arquivoNome,
    }
    const hit = keys.map((k) => peopleIndex.get(k)).find(Boolean)
    const personKey = `imp:${digitsOnly(m.cpf) || personName.toLowerCase()}|${digitsOnly(m.cnpj) || companyName.toLowerCase()}`
    const base = {
      empresaId: opts.empresaId,
      companyId: opportunityId,
      opportunityId,
      companyName,
      companyCnpj: digitsOnly(m.cnpj),
      personName,
      jobTitle: (m.cargo || '').trim(),
      relationToCompany: m.cargo ? 'profissional_relacionado' : 'nao_confirmado',
      phone: personTel,
      phoneType: 'autorizado',
      phoneSource: source,
      phoneSourceUrl: '',
      whatsapp: personWa,
      cpf: digitsOnly(m.cpf) || null,
      email: (m.email || '').trim() || null,
      whatsappSource: source,
      whatsappSourceUrl: '',
      whatsappVerified: false,
      source,
      sourceUrl: '',
      sourceName: 'Planilha campanha',
      confidence: 80,
      status: 'encontrado',
      crmPersonId: null,
      linkedinUrl: '',
      instagramUrl: '',
      facebookUrl: '',
      dedupeKey: personKey,
      endereco: (m.endereco || '').trim(),
      cidade: (m.cidade || '').trim(),
      estado: (m.uf || '').trim().toUpperCase(),
      cep: (m.cep || '').trim(),
      bairro: (m.bairro || '').trim(),
      numero: (m.numero || '').trim(),
      complemento: (m.complemento || '').trim(),
      cargo: (m.cargo || '').trim(),
      vinculo: (m.vinculo || m.cargo || '').trim(),
      origem: 'leads_monitor',
      campanhaId: campaignId,
      campanha: campanhaNome,
      produto: m.produto || opts.produto || '',
      operacao: m.operacao || '',
      purpose: 'Importação de base autorizada',
      legalBasis: 'base_autorizada',
      collectedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }

    if (hit) {
      pessoasAtualizadas += 1
      duplicados += 1
      const cur = hit.data
      const nextOriginal = { ...((cur.originalData as Record<string, unknown>) || {}) }
      fillEmpty(nextOriginal, originalData)
      const patch: Record<string, unknown> = {
        originalData: nextOriginal,
        enrichedData: cur.enrichedData || {},
        enrichmentHistory: cur.enrichmentHistory || [],
        enrichmentCandidates: cur.enrichmentCandidates || [],
        campanhaId: campaignId,
        campanha: campanhaNome,
        updatedAt: serverTimestamp(),
      }
      fillEmpty(patch, {
        personName,
        companyName,
        companyCnpj: digitsOnly(m.cnpj),
        phone: personTel,
        whatsapp: personWa,
        email: (m.email || '').trim(),
        cpf: digitsOnly(m.cpf),
        jobTitle: (m.cargo || '').trim(),
        opportunityId: opportunityId || cur.opportunityId,
        companyId: opportunityId || cur.companyId,
      })
      queueWrite(doc(db, 'empresas', opts.empresaId, COL_PEOPLE_RESEARCH, hit.id), omitUndefinedForFirestore(patch), true)
      const merged = { ...(cur as CompanyPeopleResearch), ...patch, id: hit.id } as CompanyPeopleResearch
      touchedPeople.push(merged)
    } else {
      pessoasCriadas += 1
      const ref = doc(collection(db, 'empresas', opts.empresaId, COL_PEOPLE_RESEARCH))
      queueWrite(
        ref,
        omitUndefinedForFirestore({
          ...base,
          foundAt: serverTimestamp(),
          createdAt: serverTimestamp(),
          enrichmentStatus: 'NOT_ENRICHED',
          originalData,
          enrichedData: {},
          enrichmentHistory: [],
          enrichmentCandidates: [],
          enrichmentSources: [],
          consentStatus: '',
          optOut: false,
          blocked: false,
          deleted: false,
          corrected: false,
        }),
        false
      )
      const saved = { ...base, id: ref.id, originalData, enrichedData: {}, enrichmentHistory: [], enrichmentCandidates: [] } as unknown as CompanyPeopleResearch
      touchedPeople.push(saved)
      for (const k of keys) peopleIndex.set(k, { id: ref.id, data: saved as unknown as Record<string, unknown> })
    }
  })

  const totalWrites = pending.length
  opts.onProgress?.({ current: 0, total: Math.max(totalWrites, 1), label: `Importando ${opts.rows.length} registros...` })
  let partial = false
  for (let i = 0; i < pending.length; i += BATCH_LIMIT) {
    const slice = pending.slice(i, i + BATCH_LIMIT)
    const batch = writeBatch(db)
    for (const item of slice) {
      if (item.merge) batch.set(item.ref, item.data, { merge: true })
      else batch.set(item.ref, item.data)
    }
    try {
      await batch.commit()
      salvos += slice.length
    } catch {
      falharam += slice.length
      partial = true
    }
    opts.onProgress?.({
      current: Math.min(i + slice.length, totalWrites),
      total: totalWrites,
      label: `Importando ${Math.min(i + slice.length, totalWrites)}/${totalWrites}`,
    })
  }

  let enfileirados = 0
  let enrichMessage: string | undefined
  const callable = getCallableEnrichmentProviders()
  if (!touchedPeople.length || falharam === pending.length) {
    enrichMessage = undefined
  } else if (!callable.length) {
    enrichMessage = 'Importação concluída. Nenhuma fonte de enriquecimento está configurada.'
  } else {
    const progress = await runEnrichmentQueue({
      empresaId: opts.empresaId,
      people: touchedPeople,
      companies,
      actor: { usuarioId: opts.usuarioId, usuarioNome: opts.usuarioNome },
    })
    enfileirados = touchedPeople.length
    enrichMessage = progress.message
  }

  return {
    arquivo: opts.arquivoNome,
    registros: opts.rows.length,
    validos: pessoas + empresas,
    pessoas,
    empresas,
    whatsapps,
    telefones,
    cpfs,
    duplicados,
    invalidos,
    pessoasCriadas,
    pessoasAtualizadas,
    salvos,
    falharam,
    enfileirados,
    campaignId,
    partial,
    enrichMessage,
  }
}

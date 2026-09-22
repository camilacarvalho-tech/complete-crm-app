/**
 * Enrichment Engine — complementa PersonLead existente.
 * Não inventa dado. Não sobrescreve valor válido. Não usa jobQueue.
 */
import { doc, getDocs, collection, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '../../../firebase'
import { COL_PEOPLE_RESEARCH } from '../constants'
import { getNxErpCampaignAdapter } from '../../../integrations/nxErpCampaign'
import { writeLeadsMonitorAudit } from '../services/auditTrail'
import { writeLeadsMonitorLog } from '../services/opsLogs'
import { digitsOnly } from '../pipeline/normalizeFields'
import { isLikelyEmail, isLikelyPhone, personLeadDedupeKeys, toPersonLead } from '../pipeline/personLead'
import { collectAuthorizedProposals, simulateCreditIfConfigured } from '../services/enrichment'
import { isValidForAtendimento, pipelineFromEnrichment } from '../types/personPipeline'
import type { CompanyPeopleResearch } from '../types/peopleResearch'
import type { OportunidadeMonitor } from '../types'
import type { PersonLead } from '../types/personLead'
import { isValidCpf } from './cpf'
import { emptyEnrichmentResult, type EnrichmentResult } from './enrichmentResult'
import { getCallableEnrichmentProviders, getEnrichmentProviders } from './enrichmentRegistry'
import type {
  EnrichableField,
  EnrichmentCandidate,
  EnrichmentFieldMeta,
  EnrichmentHistoryEntry,
  EnrichmentInput,
  EnrichmentProposedField,
  EnrichmentStatus,
} from './enrichmentTypes'
import { ENRICHABLE_FIELDS } from './enrichmentTypes'

function nowIso() {
  return new Date().toISOString()
}

function text(v: unknown): string {
  if (v == null) return ''
  return String(v).trim()
}

export function snapshotOriginalData(lead: PersonLead): Record<string, string> {
  const out: Record<string, string> = {}
  for (const f of ENRICHABLE_FIELDS) {
    out[f] = text((lead as unknown as Record<string, unknown>)[f])
  }
  return out
}

function leadValue(lead: PersonLead, field: EnrichableField): string {
  if (field === 'empresa') return lead.empresa
  if (field === 'cnpj') return lead.cnpj
  if (field === 'cargo') return lead.cargo
  if (field === 'vinculo') return lead.vinculo
  return text((lead as unknown as Record<string, unknown>)[field])
}

function setLeadValue(lead: PersonLead, field: EnrichableField, value: string) {
  const rec = lead as unknown as Record<string, unknown>
  rec[field] = value
  if (field === 'empresa') rec.empresa = value
  if (field === 'cnpj') rec.cnpj = value
  if (field === 'cargo') rec.cargo = value
  if (field === 'vinculo') rec.vinculo = value
}

function valueOk(field: EnrichableField, value: string): boolean {
  const v = value.trim()
  if (!v) return false
  if (field === 'cpf') return isValidCpf(v)
  if (field === 'telefone' || field === 'whatsapp') return Boolean(isLikelyPhone(v))
  if (field === 'email') return Boolean(isLikelyEmail(v))
  if (field === 'cnpj') return digitsOnly(v).length === 14
  return true
}

function hasLegal(p: EnrichmentProposedField): boolean {
  return Boolean((p.source || '').trim() && ((p.legalBasis || '').trim() || (p.purpose || '').trim() || p.sourceUrl))
}

function maskLogValue(field: string, value: string): string {
  if (!value) return ''
  const d = digitsOnly(value)
  if (/cpf|phone|telefone|whatsapp/i.test(field) && d.length >= 4) return `***${d.slice(-2)}`
  if (/email/i.test(field) && value.includes('@')) return `***@${value.split('@')[1]}`
  return '[omitido]'
}

function toInput(lead: PersonLead): EnrichmentInput {
  return {
    personLeadId: lead.id,
    empresaId: lead.empresaId,
    personName: lead.nome,
    cpf: lead.cpf,
    phone: lead.telefone,
    telefone: lead.telefone,
    whatsapp: lead.whatsapp,
    email: lead.email,
    companyName: lead.empresa,
    companyCnpj: lead.cnpj,
    jobTitle: lead.cargo,
    city: lead.cidade,
    state: lead.estado,
    source: lead.source,
    sourceUrl: lead.sourceUrl,
    purpose: lead.purpose,
    legalBasis: lead.legalBasis,
    consentStatus: lead.consentStatus,
    optOut: lead.optOut,
    blocked: lead.blocked,
    deleted: lead.deleted,
  }
}

function firestorePatch(lead: PersonLead): Record<string, unknown> {
  return {
    personName: lead.nome,
    nome: lead.nome,
    cpf: lead.cpf || null,
    phone: lead.telefone,
    telefone: lead.telefone,
    whatsapp: lead.whatsapp,
    email: lead.email || null,
    endereco: lead.endereco || null,
    numero: lead.numero || null,
    complemento: lead.complemento || null,
    bairro: lead.bairro || null,
    cep: lead.cep || null,
    cidade: lead.cidade || null,
    estado: lead.estado || null,
    companyName: lead.empresa,
    companyCnpj: lead.cnpj,
    jobTitle: lead.cargo,
    vinculo: lead.vinculo,
    dataNascimento: lead.dataNascimento || null,
    originalData: lead.originalData,
    enrichedData: lead.enrichedData,
    enrichmentHistory: lead.enrichmentHistory,
    enrichmentCandidates: lead.enrichmentCandidates,
    enrichmentSources: lead.enrichmentSources,
    enrichmentMetadata: lead.enrichmentMetadata,
    enrichmentStatus: lead.enrichmentStatus,
    enrichmentProviders: lead.enrichmentProviders,
    enrichmentFields: lead.enrichmentFields,
    enrichmentUpdatedAt: serverTimestamp(),
    pipelineStatus: lead.pipelineStatus || null,
    atendimentoStatus: lead.atendimentoStatus || 'nao_enviado',
    valorLiberado: lead.valorLiberado ?? null,
    valorParcela: lead.valorParcela ?? null,
    quantidadeParcelas: lead.quantidadeParcelas ?? null,
    taxa: lead.taxa ?? null,
    bancoOferta: lead.bancoOferta || '',
    dataConsultaCredito: lead.dataConsultaCredito || null,
    statusConsultaCredito: lead.statusConsultaCredito || null,
    purpose: lead.purpose || null,
    legalBasis: lead.legalBasis || null,
    consentStatus: lead.consentStatus || null,
    optOut: lead.optOut,
    blocked: lead.blocked,
    deleted: lead.deleted,
    corrected: lead.corrected,
    nxErpReady: true,
    atualizadoEm: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }
}

function collidingPerson(
  lead: PersonLead,
  allPeople: CompanyPeopleResearch[],
  field: EnrichableField,
  value: string
): string | null {
  const probe = {
    ...lead,
    whatsapp: field === 'whatsapp' ? value : lead.whatsapp,
    telefone: field === 'telefone' ? value : lead.telefone,
    email: field === 'email' ? value : lead.email,
    cpf: field === 'cpf' ? value : lead.cpf,
    empresa: field === 'empresa' ? value : lead.empresa,
  }
  const keys = new Set(personLeadDedupeKeys(probe))
  for (const other of allPeople) {
    if (other.id === lead.id) continue
    const oKeys = personLeadDedupeKeys({
      whatsapp: other.whatsapp,
      telefone: other.phone,
      email: String((other as { email?: string }).email || ''),
      cpf: String((other as { cpf?: string }).cpf || ''),
      nome: other.personName,
      empresa: other.companyName,
    })
    if (oKeys.some((k) => keys.has(k))) return other.id
  }
  return null
}

export async function enrichExistingPersonLead(opts: {
  empresaId: string
  person: CompanyPeopleResearch
  company: OportunidadeMonitor | null
  allPeople: CompanyPeopleResearch[]
  actor?: { usuarioId?: string; usuarioNome?: string }
}): Promise<EnrichmentResult> {
  const lead = toPersonLead(opts.person, opts.company)
  if (!lead.originalData || !Object.keys(lead.originalData).length) {
    lead.originalData = snapshotOriginalData(lead)
  }

  if (lead.optOut || lead.blocked || lead.deleted) {
    lead.enrichmentStatus = 'NOT_ENRICHED'
    return emptyEnrichmentResult('NOT_ENRICHED', 'Registro bloqueado/excluído/opt-out — enriquecimento ignorado.')
  }

  await writeLeadsMonitorLog({
    empresaId: opts.empresaId,
    level: 'info',
    message: 'PERSON_ENRICHMENT_START',
    connectorId: 'person_enrichment',
    meta: { personLeadId: lead.id, hasName: Boolean(lead.nome) },
  })

  await updateDoc(doc(db, 'empresas', opts.empresaId, COL_PEOPLE_RESEARCH, opts.person.id), {
    enrichmentStatus: 'PROCESSING' satisfies EnrichmentStatus,
    pipelineStatus: 'enriquecendo',
    atualizadoEm: serverTimestamp(),
  })

  const providers = getEnrichmentProviders()
  const usable = providers.filter((p) => p.status === 'ACTIVE' || p.status === 'INACTIVE')
  const configuredForCall = getCallableEnrichmentProviders()

  if (!configuredForCall.length) {
    lead.enrichmentStatus = 'NO_PROVIDER'
    await updateDoc(doc(db, 'empresas', opts.empresaId, COL_PEOPLE_RESEARCH, opts.person.id), {
      enrichmentStatus: 'NO_PROVIDER',
      pipelineStatus: 'aguardando_enriquecimento',
      originalData: lead.originalData,
      atualizadoEm: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    await writeLeadsMonitorLog({
      empresaId: opts.empresaId,
      level: 'info',
      message: 'PERSON_ENRICHMENT_EMPTY',
      connectorId: 'person_enrichment',
      meta: { status: 'NO_PROVIDER' },
    })
    const r = emptyEnrichmentResult('NO_PROVIDER', 'Nenhuma fonte de enriquecimento está configurada.')
    r.providersUsed = usable.map((p) => p.id)
    return r
  }

  const { proposed, errors, providersUsed } = await collectAuthorizedProposals(toInput(lead))

  const history: EnrichmentHistoryEntry[] = [...(lead.enrichmentHistory || [])]
  const candidates: EnrichmentCandidate[] = [...(lead.enrichmentCandidates || [])]
  const metadata: EnrichmentFieldMeta[] = [...(lead.enrichmentMetadata || [])]
  const sources = new Set(lead.enrichmentSources || [])
  const updated: string[] = []
  const enrichedData: Record<string, string> = { ...(lead.enrichedData || {}) }

  for (const item of proposed) {
    if (!ENRICHABLE_FIELDS.includes(item.field)) continue
    if (!hasLegal(item)) continue
    if (!valueOk(item.field, item.value)) continue
    if (item.field === 'whatsapp' && item.contactType && item.contactType !== 'WHATSAPP') continue
    if (item.field === 'cpf' && !isValidCpf(item.value)) continue

    const current = leadValue(lead, item.field)
    if (current && valueOk(item.field, current)) {
      if (digitsOnly(current) !== digitsOnly(item.value) && current.toLowerCase() !== item.value.trim().toLowerCase()) {
        candidates.push({
          field: item.field,
          value: item.value,
          source: item.source,
          sourceUrl: item.sourceUrl,
          collectedAt: item.collectedAt || nowIso(),
          confidence: item.confidence,
          reason: 'campo já preenchido — candidato, sem substituição automática',
        })
      }
      continue
    }

    const clash = collidingPerson(lead, opts.allPeople, item.field, item.value)
    if (clash) {
      candidates.push({
        field: item.field,
        value: item.value,
        source: item.source,
        sourceUrl: item.sourceUrl,
        collectedAt: item.collectedAt || nowIso(),
        confidence: item.confidence,
        reason: `dedupe: já existe pessoa ${clash}`,
      })
      continue
    }

    const oldValue = current
    setLeadValue(lead, item.field, item.value.trim())
    enrichedData[item.field] = item.value.trim()
    updated.push(item.field)
    sources.add(item.source)
    const collectedAt = item.collectedAt || nowIso()
    history.push({
      field: item.field,
      oldValue,
      newValue: item.value.trim(),
      source: item.source,
      sourceUrl: item.sourceUrl,
      collectedAt,
      confidence: item.confidence,
    })
    metadata.push({
      field: item.field,
      value: item.value.trim(),
      source: item.source,
      sourceUrl: item.sourceUrl,
      collectedAt,
      confidence: item.confidence,
    })
    if (item.purpose && !lead.purpose) lead.purpose = item.purpose
    if (item.legalBasis && !lead.legalBasis) lead.legalBasis = item.legalBasis
    if (item.consentStatus && !lead.consentStatus) lead.consentStatus = item.consentStatus
  }

  const stillEmpty = ENRICHABLE_FIELDS.filter((f) => !leadValue(lead, f))
  let status: EnrichmentStatus = 'NO_MATCH'
  if (errors.length && !updated.length && !proposed.length) status = 'ERROR'
  else if (updated.length && stillEmpty.length) status = 'PARTIAL'
  else if (updated.length) status = 'ENRICHED'
  else status = 'NO_MATCH'

  lead.enrichmentStatus = status
  lead.enrichmentHistory = history.slice(-80)
  lead.enrichmentCandidates = candidates.slice(-80)
  lead.enrichmentMetadata = metadata.slice(-80)
  lead.enrichmentSources = Array.from(sources)
  lead.enrichmentFields = updated
  lead.enrichmentProviders = providersUsed
  lead.enrichmentUpdatedAt = nowIso()
  lead.enrichedData = enrichedData
  if (lead.whatsapp) lead.contactStatus = 'WHATSAPP'
  else if (lead.telefone) lead.contactStatus = 'PHONE'
  else if (lead.email) lead.contactStatus = 'EMAIL'

  const credit = await simulateCreditIfConfigured({ cpf: lead.cpf, produto: lead.produto })
  lead.valorLiberado = credit.valorLiberado
  lead.valorParcela = credit.valorParcela
  lead.quantidadeParcelas = credit.quantidadeParcelas
  lead.taxa = credit.taxa
  lead.bancoOferta = credit.bancoOferta
  lead.dataConsultaCredito = credit.dataConsultaCredito
  lead.statusConsultaCredito = credit.statusConsultaCredito

  const valid = isValidForAtendimento(lead)
  let pipe = pipelineFromEnrichment(status, valid)
  if (pipe === 'aguardando_validacao' && valid) pipe = 'pronto_atendimento'
  lead.pipelineStatus = pipe
  if (!lead.atendimentoStatus) lead.atendimentoStatus = 'nao_enviado'

  await updateDoc(
    doc(db, 'empresas', opts.empresaId, COL_PEOPLE_RESEARCH, opts.person.id),
    firestorePatch(lead)
  )

  await writeLeadsMonitorAudit({
    empresaId: opts.empresaId,
    action: 'people.enrich',
    origem: 'system',
    entidade: 'pessoa',
    entidadeId: lead.id,
    meta: {
      status,
      fieldsUpdated: updated,
      providersUsed,
    },
    after: {
      fields: updated.map((f) => `${f}:${maskLogValue(f, leadValue(lead, f as EnrichableField))}`),
    },
  })

  await writeLeadsMonitorLog({
    empresaId: opts.empresaId,
    level: 'info',
    message: status === 'ENRICHED' || status === 'PARTIAL' ? 'PERSON_ENRICHMENT_SUCCESS' : 'PERSON_ENRICHMENT_EMPTY',
    connectorId: 'person_enrichment',
    meta: { status, fieldsUpdated: updated.length, personLeadId: lead.id },
  })

  void getNxErpCampaignAdapter()

  const stillWanted = ['cpf', 'telefone', 'whatsapp', 'email'].filter((f) => !leadValue(lead, f as EnrichableField))
  return {
    status,
    matched: updated.length > 0,
    fieldsUpdated: updated,
    fieldsNotFound: stillWanted,
    candidates,
    providersUsed,
    errors,
  }
}

/** Carrega pessoas do tenant para dedupe em lote. */
export async function listPeopleForEnrichment(empresaId: string): Promise<CompanyPeopleResearch[]> {
  const snap = await getDocs(collection(db, 'empresas', empresaId, COL_PEOPLE_RESEARCH))
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<CompanyPeopleResearch, 'id'>) }))
}

/**
 * Orquestrador da pesquisa de pessoas (job people_search).
 * Fontes isoladas: erro em uma não interrompe as demais.
 */
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db } from '../../../../firebase'
import { brasilApiQsaSource } from '../../connectors/people/brasilApiQsa'
import { companyWebsiteSource } from '../../connectors/people/companyWebsite.public'
import { openWebSearchLinksSource } from '../../connectors/people/openWebSearch.links'
import { COL_OPORTUNIDADES, COL_PEOPLE_RESEARCH, COL_PEOPLE_RUNS } from '../../constants'
import { digitsOnly, extractCnpj, formatCnpj, normalizeCompanyName } from '../../pipeline/normalizeFields'
import { writeLeadsMonitorAudit } from '../auditTrail'
import { omitUndefinedForFirestore } from '../jobQueue'
import { writeLeadsMonitorLog } from '../opsLogs'
import type { OportunidadeMonitor } from '../../types'
import type { PeopleManualLink, PeopleRun, PeopleSourceProgress } from '../../types/peopleResearch'
import type { PeopleSource, PeopleSourceHit } from './types'

const SOURCES: PeopleSource[] = [brasilApiQsaSource, companyWebsiteSource, openWebSearchLinksSource]

function asText(v: unknown): string {
  return v == null ? '' : String(v).trim()
}

function personDedupeKey(companyId: string, name: string, sourceUrl: string): string {
  const n = normalizeCompanyName(name).toLowerCase()
  const u = sourceUrl.trim().toLowerCase()
  return `${companyId}|${n}|${u}`
}

function relationConfirmed(rel: PeopleSourceHit['relationToCompany']): boolean {
  return rel === 'socio' || rel === 'administrador' || rel === 'gestor' || rel === 'funcionario'
}

export async function runPeopleSearch(opts: {
  empresaId: string
  opportunityId: string
  jobId?: string
  actor?: { usuarioId?: string; usuarioNome?: string }
}): Promise<{ pessoas: number; fontesOk: number; fontesErro: number; tempoMs: number }> {
  const started = Date.now()
  const oppRef = doc(db, 'empresas', opts.empresaId, COL_OPORTUNIDADES, opts.opportunityId)
  const oppSnap = await getDoc(oppRef)
  if (!oppSnap.exists()) throw new Error('Oportunidade não encontrada para pesquisa de pessoas.')
  const opportunity = { id: oppSnap.id, ...oppSnap.data() } as OportunidadeMonitor

  const cnpjDigits =
    digitsOnly(opportunity.cnpj) ||
    extractCnpj(opportunity.nome) ||
    extractCnpj(String(opportunity.metadados?.cnpj || '')) ||
    ''
  const companyCnpj = cnpjDigits.length === 14 ? formatCnpj(cnpjDigits) : asText(opportunity.cnpj)
  const companyName = asText(opportunity.nome || opportunity.empresaNome)

  const runRef = doc(db, 'empresas', opts.empresaId, COL_PEOPLE_RUNS, opts.opportunityId)
  const fontesInit: PeopleSourceProgress[] = SOURCES.map((s) => ({
    id: s.id,
    label: s.label,
    status: 'pending',
    tempoMs: 0,
    count: 0,
    error: '',
  }))

  const baseRun: Omit<PeopleRun, 'id'> = {
    empresaId: opts.empresaId,
    opportunityId: opts.opportunityId,
    companyName,
    companyCnpj,
    status: 'running',
    etapa: 'Empresa identificada',
    fontes: fontesInit,
    manuais: [],
    companyPhone: asText(opportunity.telefone),
    companyWhatsapp: '',
    companyWhatsappUrl: '',
    totais: {
      pessoas: 0,
      confirmadas: 0,
      naoConfirmadas: 0,
      fontes: SOURCES.length,
      telefones: 0,
      whatsapps: 0,
      perfis: 0,
    },
    tempoMs: 0,
    lastError: null,
    startedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  await setDoc(runRef, omitUndefinedForFirestore({ ...baseRun, createdAt: serverTimestamp() }), { merge: true })
  await writeLeadsMonitorAudit({
    empresaId: opts.empresaId,
    action: 'people.search_started',
    origem: 'ui',
    usuarioId: opts.actor?.usuarioId,
    usuarioNome: opts.actor?.usuarioNome,
    entidade: 'oportunidade',
    entidadeId: opts.opportunityId,
    meta: { companyName, companyCnpj, jobId: opts.jobId || '' },
  })

  const etapas = [
    'Empresa identificada',
    'Dados empresariais consultados',
    'Site público consultado',
    'Pesquisando profissionais...',
    'Verificando fontes disponíveis...',
  ]

  const results = await Promise.allSettled(
    SOURCES.map(async (source, index) => {
      const t0 = Date.now()
      const nextFontes = [...fontesInit]
      nextFontes[index] = { ...nextFontes[index], status: 'running' }
      await setDoc(
        runRef,
        { etapa: etapas[Math.min(index + 1, etapas.length - 1)], fontes: nextFontes, updatedAt: serverTimestamp() },
        { merge: true }
      )
      const result = await source.search({ empresaId: opts.empresaId, opportunity })
      const tempoMs = Date.now() - t0
      await writeLeadsMonitorAudit({
        empresaId: opts.empresaId,
        action: result.error && !result.skipped ? 'people.search_error' : 'people.search_source',
        origem: 'worker',
        connectorId: source.id,
        entidade: 'oportunidade',
        entidadeId: opts.opportunityId,
        meta: {
          fonte: source.id,
          tempoMs,
          quantidade: result.hits.length,
          skipped: Boolean(result.skipped),
          erro: result.error || '',
        },
      })
      return { source, result, tempoMs, index }
    })
  )

  const fontes: PeopleSourceProgress[] = SOURCES.map((s) => ({
    id: s.id,
    label: s.label,
    status: 'pending',
    tempoMs: 0,
    count: 0,
    error: '',
  }))
  const hits: PeopleSourceHit[] = []
  const manuais: PeopleManualLink[] = []
  let companyPhone = asText(opportunity.telefone)
  let companyWhatsapp = ''
  let companyWhatsappUrl = ''
  let fontesOk = 0
  let fontesErro = 0

  for (const row of results) {
    if (row.status === 'rejected') {
      fontesErro += 1
      continue
    }
    const { source, result, tempoMs, index } = row.value
    fontes[index] = {
      id: source.id,
      label: source.label,
      status: result.skipped ? 'skipped' : result.error && result.hits.length === 0 && !(result.manuais || []).length ? 'error' : 'ok',
      tempoMs,
      count: result.hits.length,
      error: result.error || '',
    }
    if (fontes[index].status === 'error') fontesErro += 1
    else fontesOk += 1
    hits.push(...result.hits)
    manuais.push(...(result.manuais || []))
    if (result.companyPhone && !companyPhone) companyPhone = result.companyPhone
    if (result.companyWhatsapp) companyWhatsapp = result.companyWhatsapp
    if (result.companyWhatsappUrl) companyWhatsappUrl = result.companyWhatsappUrl
  }

  const existingSnap = await getDocs(
    query(
      collection(db, 'empresas', opts.empresaId, COL_PEOPLE_RESEARCH),
      where('opportunityId', '==', opts.opportunityId)
    )
  )
  const existingKeys = new Set(
    existingSnap.docs.map((d) => String((d.data() as { dedupeKey?: string }).dedupeKey || ''))
  )

  let novos = 0
  const seen = new Set<string>(existingKeys)
  for (const hit of hits) {
    const dedupeKey = personDedupeKey(opts.opportunityId, hit.personName, hit.sourceUrl || hit.linkedinUrl)
    if (seen.has(dedupeKey)) continue
    seen.add(dedupeKey)
    await addDoc(
      collection(db, 'empresas', opts.empresaId, COL_PEOPLE_RESEARCH),
      omitUndefinedForFirestore({
        empresaId: opts.empresaId,
        companyId: opts.opportunityId,
        opportunityId: opts.opportunityId,
        companyName,
        companyCnpj,
        personName: hit.personName,
        jobTitle: asText(hit.jobTitle),
        relationToCompany: hit.relationToCompany,
        phone: asText(hit.phone),
        phoneType: hit.phoneType,
        phoneSource: asText(hit.phoneSource),
        phoneSourceUrl: asText(hit.phoneSourceUrl),
        whatsapp: asText(hit.whatsapp),
        whatsappSource: asText(hit.whatsappSource),
        whatsappSourceUrl: asText(hit.whatsappSourceUrl),
        whatsappVerified: Boolean(hit.whatsappVerified),
        source: hit.source,
        sourceUrl: asText(hit.sourceUrl),
        sourceName: asText(hit.sourceName),
        confidence: Number.isFinite(hit.confidence) ? hit.confidence : 0,
        foundAt: serverTimestamp(),
        status: 'encontrado',
        crmPersonId: null,
        linkedinUrl: asText(hit.linkedinUrl),
        instagramUrl: asText(hit.instagramUrl),
        facebookUrl: asText(hit.facebookUrl),
        dedupeKey,
        criadoEm: serverTimestamp(),
        atualizadoEm: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    )
    novos += 1
  }

  const afterSnap = await getDocs(
    query(
      collection(db, 'empresas', opts.empresaId, COL_PEOPLE_RESEARCH),
      where('opportunityId', '==', opts.opportunityId)
    )
  )
  const people = afterSnap.docs
    .map((d) => d.data())
    .filter((p: any) => p.status !== 'ignorado')
  const confirmadas = people.filter((p: any) => relationConfirmed(p.relationToCompany)).length
  const telefones = people.filter((p: any) => asText(p.phone)).length + (companyPhone ? 1 : 0)
  const whatsapps = people.filter((p: any) => asText(p.whatsapp)).length + (companyWhatsapp ? 1 : 0)
  const perfis =
    people.filter((p: any) => asText(p.linkedinUrl) || asText(p.instagramUrl) || asText(p.facebookUrl)).length +
    manuais.length

  const tempoMs = Date.now() - started
  await setDoc(
    runRef,
    omitUndefinedForFirestore({
      status: 'succeeded',
      etapa: 'Pesquisa concluída',
      fontes,
      manuais,
      companyPhone,
      companyWhatsapp,
      companyWhatsappUrl,
      totais: {
        pessoas: people.length,
        confirmadas,
        naoConfirmadas: people.length - confirmadas,
        fontes: SOURCES.length,
        telefones,
        whatsapps,
        perfis,
      },
      tempoMs,
      lastError: fontesErro === SOURCES.length ? 'Todas as fontes falharam.' : null,
      finishedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
    { merge: true }
  )

  await writeLeadsMonitorAudit({
    empresaId: opts.empresaId,
    action: 'people.search_result',
    origem: 'worker',
    entidade: 'oportunidade',
    entidadeId: opts.opportunityId,
    meta: {
      companyName,
      companyCnpj,
      quantidade: people.length,
      novos,
      fontesOk,
      fontesErro,
      telefones,
      whatsapps,
      perfis,
      tempoMs,
    },
  })
  await writeLeadsMonitorLog({
    empresaId: opts.empresaId,
    level: 'info',
    message: `Pessoas: ${people.length} · ${companyName}`,
    jobId: opts.jobId,
    meta: { opportunityId: opts.opportunityId, pessoas: people.length, tempoMs },
  })

  return { pessoas: people.length, fontesOk, fontesErro, tempoMs }
}

export async function markPeopleRunFailed(opts: {
  empresaId: string
  opportunityId: string
  error: string
}): Promise<void> {
  await setDoc(
    doc(db, 'empresas', opts.empresaId, COL_PEOPLE_RUNS, opts.opportunityId),
    {
      status: 'failed',
      lastError: opts.error.slice(0, 500),
      etapa: 'Falha na pesquisa',
      finishedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  )
}

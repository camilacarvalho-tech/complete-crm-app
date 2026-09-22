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
import { db } from '../../../firebase'
import {
  COL_OPORTUNIDADES,
  COL_PEOPLE_RESEARCH,
  COL_PROCESS_RECORDS,
  COL_PROCESS_RUNS,
  PROCESS_BATCH_SIZE,
} from '../constants'
import type { NormalizedLead } from '../connectors/types'
import { classifyLead } from '../pipeline/classify'
import { collectDedupeKeys, matchExistingId } from '../pipeline/dedupe'
import { enrichLead } from '../pipeline/enrich'
import { digitsOnly, formatCnpj, formatPhoneBr, hostnameFromUrl, normalizeCompanyName } from '../pipeline/normalizeFields'
import { scoreLead, temperaturaFromScore } from '../pipeline/score'
import { omitUndefinedForFirestore } from './jobQueue'
import { writeLeadsMonitorAudit } from './auditTrail'
import { writeLeadsMonitorLog } from './opsLogs'
import { processRecordId } from './processRunStore'
import type { ProcessRun } from '../types/processRun'
import type { OportunidadeMonitor } from '../types'
import { qualifyInssRecord, idadeFromDate } from '../pipeline/inssQualify'

function emailOk(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
}

function mappedToLead(mapped: Record<string, string>): NormalizedLead {
  const empresa = normalizeCompanyName(mapped.empresa || mapped.razaoSocial || mapped.nomeFantasia)
  const pessoa = normalizeCompanyName(mapped.nome)
  const isPessoa = Boolean(pessoa) && (!empresa || pessoa.toLowerCase() !== empresa.toLowerCase())
  const nome = isPessoa ? pessoa : empresa || pessoa
  const tel = formatPhoneBr(mapped.telefone || mapped.whatsapp) || mapped.telefone || ''
  const cnpj = formatCnpj(mapped.cnpj) || mapped.cnpj || ''
  const website = (mapped.site || '').trim()
  return {
    connectorId: 'csv_import',
    origemLabel: 'Importação de planilha',
    dedupeKey: '',
    tipo: isPessoa ? 'pessoa' : 'empresa',
    nome,
    telefone: tel || undefined,
    email: (mapped.email || '').trim() || undefined,
    cidade: (mapped.cidade || '').trim(),
    estado: (mapped.uf || '').trim().toUpperCase(),
    segmento: (mapped.segmento || '').trim(),
    empresaNome: empresa || undefined,
    cnpj: cnpj || undefined,
    consentimentoLgpd: true,
    baseLegal: '',
    observacoes: (mapped.observacoes || '').trim() || undefined,
    website: website || undefined,
    endereco: (mapped.endereco || '').trim() || undefined,
    dominio: hostnameFromUrl(website) || undefined,
    metadados: {
      cargo: mapped.cargo || null,
      cpf: digitsOnly(mapped.cpf) || null,
      whatsapp: formatPhoneBr(mapped.whatsapp) || mapped.whatsapp || null,
      razaoSocial: mapped.razaoSocial || null,
      nomeFantasia: mapped.nomeFantasia || null,
      dataNascimento: mapped.dataNascimento || null,
      idade: mapped.idade || idadeFromDate(mapped.dataNascimento),
      tipoBeneficiario: mapped.tipoBeneficiario || null,
      tipoBeneficio: mapped.tipoBeneficio || null,
      especieBeneficio: mapped.especieBeneficio || null,
      situacaoBeneficio: mapped.situacaoBeneficio || null,
      dataInicioBeneficio: mapped.dataInicioBeneficio || null,
      banco: mapped.banco || null,
      produto: mapped.produto || null,
      importado: true,
      origemDado: 'CSV importado',
      fonteDado: 'CSV importado',
      finalidadeTratamento: 'Importação de base autorizada',
    },
  }
}

function validateLead(lead: NormalizedLead, mapped: Record<string, string>): 'VALIDO' | 'INCOMPLETO' | 'INVALIDO' {
  if (!lead.nome) return 'INVALIDO'
  const tel = digitsOnly(lead.telefone || mapped.whatsapp)
  const cnpj = digitsOnly(lead.cnpj)
  const cpf = digitsOnly(mapped.cpf)
  const mail = (lead.email || '').trim()
  const hasContact = tel.length >= 10 || emailOk(mail) || cnpj.length === 14
  if (cpf && cpf.length !== 11) return 'INVALIDO'
  if (cnpj && cnpj.length !== 14 && cnpj.length > 0) return 'INCOMPLETO'
  if (mail && !emailOk(mail)) return 'INCOMPLETO'
  if (!hasContact) return 'INCOMPLETO'
  return 'VALIDO'
}

async function loadExisting(empresaId: string) {
  const snap = await getDocs(collection(db, 'empresas', empresaId, COL_OPORTUNIDADES))
  return snap.docs.map((d) => {
    const data = d.data() as Partial<OportunidadeMonitor>
    return {
      id: d.id,
      keys: collectDedupeKeys({
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
      }),
      data,
    }
  })
}

export async function processBaseBatch(opts: {
  empresaId: string
  processRunId: string
  jobId?: string
}): Promise<{ done: boolean; processed: number; remaining: number }> {
  const runRef = doc(db, 'empresas', opts.empresaId, COL_PROCESS_RUNS, opts.processRunId)
  const runSnap = await getDoc(runRef)
  if (!runSnap.exists()) throw new Error('Processamento não encontrado')
  const run = { id: runSnap.id, ...runSnap.data() } as ProcessRun

  if (run.status === 'pausado' || run.status === 'cancelado') {
    return { done: true, processed: 0, remaining: Math.max(0, (run.total || 0) - (run.cursor || 0)) }
  }

  const filtros: FiltrosPesquisa = {
    cidade: '',
    estado: '',
    segmento: '',
    palavraChave: '',
  }

  const existing = await loadExisting(opts.empresaId)
  const existingKeys = new Set(existing.flatMap((e) => e.keys))

  let cursor = run.cursor || 0
  const total = run.total || 0
  const end = Math.min(total, cursor + PROCESS_BATCH_SIZE)
  let processados = run.processados || 0
  let validos = run.validos || 0
  let invalidos = run.invalidos || 0
  let duplicados = run.duplicados || 0
  let enriquecidos = run.enriquecidos || 0
  let pessoasEncontradas = run.pessoasEncontradas || 0
  let qualificados = run.qualificados || 0
  let erros = run.erros || 0
  let peopleQueued = 0

  await writeLeadsMonitorLog({
    empresaId: opts.empresaId,
    level: 'info',
    message: `Lote ${cursor + 1}–${end} de ${total}`,
    jobId: opts.jobId,
    meta: { processRunId: opts.processRunId, etapa: 'checkpoint' },
  })

  for (let i = cursor; i < end; i += 1) {
    const live = await getDoc(runRef)
    const liveStatus = live.data()?.status
    if (liveStatus === 'pausado' || liveStatus === 'cancelado') {
      break
    }
    const recRef = doc(db, 'empresas', opts.empresaId, COL_PROCESS_RECORDS, processRecordId(opts.processRunId, i))
    const recSnap = await getDoc(recRef)
    if (!recSnap.exists()) {
      erros += 1
      cursor = i + 1
      continue
    }
    const rec = recSnap.data() as { mapped?: Record<string, string>; status?: string }
    if (rec.status && rec.status !== 'pendente') {
      cursor = i + 1
      continue
    }
    try {
      const mapped = rec.mapped || {}
      const inss = qualifyInssRecord(mapped, filtros)
      if ((mapped.tipoBeneficiario || mapped.tipoBeneficio || mapped.especieBeneficio) && !inss.ok) {
        invalidos += 1
        processados += 1
        await updateDoc(recRef, {
          status: 'invalido',
          validation: 'INCOMPLETO',
          lastError: inss.motivos.join('; ') || 'fora dos filtros INSS',
          atualizadoEm: serverTimestamp(),
        })
        cursor = i + 1
        continue
      }
      const lead0 = mappedToLead(mapped)
      const validation = validateLead(lead0, mapped)
      const keys = collectDedupeKeys(lead0)
      const dupId = matchExistingId(lead0, existing)
      const isDup = Boolean(dupId) || keys.some((k) => existingKeys.has(k))

      if (isDup) {
        duplicados += 1
        processados += 1
        if (dupId) {
          const existRef = doc(db, 'empresas', opts.empresaId, COL_OPORTUNIDADES, dupId)
          const existSnap = await getDoc(existRef)
          if (existSnap.exists()) {
            const cur = existSnap.data() as Record<string, unknown>
            const fill: Record<string, unknown> = {}
            const maybe = [
              ['telefone', lead0.telefone],
              ['email', lead0.email],
              ['website', lead0.website],
              ['cnpj', lead0.cnpj],
              ['endereco', lead0.endereco],
            ] as const
            for (const [k, v] of maybe) {
              if (!cur[k] && v) fill[k] = v
            }
            if (Object.keys(fill).length) {
              await updateDoc(existRef, omitUndefinedForFirestore({ ...fill, atualizadoEm: serverTimestamp() }))
            }
          }
        }
        await updateDoc(
          recRef,
          omitUndefinedForFirestore({
            status: 'duplicado',
            validation,
            duplicateOf: dupId || keys[0] || null,
            duplicateReason: 'chave existente (CNPJ/telefone/email/nome)',
            atualizadoEm: serverTimestamp(),
          })
        )
        await writeLeadsMonitorAudit({
          empresaId: opts.empresaId,
          action: 'monitor.record.duplicated',
          origem: 'worker',
          entidade: 'process_record',
          entidadeId: recRef.id,
          after: { duplicateOf: dupId || null },
        })
        cursor = i + 1
        continue
      }

      if (validation === 'INVALIDO') {
        invalidos += 1
        processados += 1
        await updateDoc(recRef, {
          status: 'invalido',
          validation,
          atualizadoEm: serverTimestamp(),
        })
        cursor = i + 1
        continue
      }

      const enriched = await enrichLead(lead0, opts.empresaId)
      if (enriched.dadosEnriquecidos?.cnpjValidado) enriquecidos += 1
      const classification = await classifyLead(enriched, filtros, opts.empresaId, { useLlm: false })
      const scored = scoreLead(enriched, classification, filtros)
      if (scored.score >= 50) qualificados += 1

      const oppRef = await addDoc(
        collection(db, 'empresas', opts.empresaId, COL_OPORTUNIDADES),
        omitUndefinedForFirestore({
          ...enriched,
          origemFonte: 'csv_import',
          empresaId: opts.empresaId,
          status: 'novo',
          score: scored.score,
          temperatura: scored.temperatura || temperaturaFromScore(scored.score),
          classificacao: classification.label,
          categoriaClassificacao: classification.categoria,
          motivosScore: scored.motivos,
          origemScore: scored.origemScore,
          pesquisaId: null,
          processRunId: opts.processRunId,
          employeeCount: null,
          employeeCountRange: null,
          employeeCountFonte: null,
          employeeCountStatus: 'nao_informada',
          metadados: {
            ...(enriched.metadados || {}),
            processRunId: opts.processRunId,
            scoreReasons: [...scored.motivos, ...inss.motivos],
            operacao: mapped.tipoBeneficio || mapped.tipoBeneficiario ? 'INSS' : null,
            oportunidades: mapped.tipoBeneficiario || mapped.tipoBeneficio || mapped.especieBeneficio ? inss.oportunidades : [],
            idade: inss.idade,
            dataNascimento: mapped.dataNascimento || null,
            tipoBeneficiario: mapped.tipoBeneficiario || null,
            produto: inss.oportunidades[0]?.produto || mapped.produto || null,
          },
          vezesEncontrada: 1,
          fontes: [enriched.origemLabel],
          primeiraDescoberta: serverTimestamp(),
          ultimaDescoberta: serverTimestamp(),
          encontradoEm: serverTimestamp(),
          criadoEm: serverTimestamp(),
          atualizadoEm: serverTimestamp(),
          dadosEnriquecidos: enriched.dadosEnriquecidos ?? null,
        })
      )
      keys.forEach((k) => existingKeys.add(k))
      existing.push({ id: oppRef.id, keys, data: { nome: enriched.nome, cnpj: enriched.cnpj } })

      const personName = normalizeCompanyName(mapped.nome)
      const companyName = normalizeCompanyName(mapped.empresa || mapped.razaoSocial || enriched.nome)
      const source = /\.xlsx?$/i.test(String(run.arquivoNome || '')) ? 'planilha_xlsx' : 'planilha_csv'
      const sourceLabel = source
      if (personName && enriched.tipo === 'pessoa') {
        pessoasEncontradas += 1
        const personKey = `imp:${digitsOnly(mapped.cpf) || personName.toLowerCase()}|${digitsOnly(enriched.cnpj) || companyName.toLowerCase()}`
        await setDoc(
          doc(collection(db, 'empresas', opts.empresaId, COL_PEOPLE_RESEARCH)),
          omitUndefinedForFirestore({
            empresaId: opts.empresaId,
            companyId: oppRef.id,
            opportunityId: oppRef.id,
            companyName,
            companyCnpj: enriched.cnpj || '',
            personName,
            jobTitle: mapped.cargo || '',
            relationToCompany: mapped.cargo ? 'profissional_relacionado' : 'nao_confirmado',
            phone: mapped.telefone || '',
            phoneType: 'autorizado',
            phoneSource: source,
            phoneSourceUrl: '',
            whatsapp: mapped.whatsapp || '',
            cpf: digitsOnly(mapped.cpf) || null,
            email: mapped.email || null,
            whatsappSource: sourceLabel,
            whatsappSourceUrl: '',
            whatsappVerified: false,
            source,
            sourceUrl: '',
            sourceName: 'Planilha importada',
            confidence: 80,
            foundAt: serverTimestamp(),
            collectedAt: serverTimestamp(),
            status: 'encontrado',
            crmPersonId: null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            linkedinUrl: '',
            instagramUrl: '',
            facebookUrl: '',
            dedupeKey: personKey,
            processRunId: opts.processRunId,
            endereco: mapped.endereco || '',
            cidade: mapped.cidade || '',
            estado: (mapped.uf || '').toUpperCase(),
            cep: mapped.cep || '',
            bairro: mapped.bairro || '',
            numero: mapped.numero || '',
            complemento: mapped.complemento || '',
            dataNascimento: mapped.dataNascimento || '',
            cargo: mapped.cargo || '',
            vinculo: mapped.vinculo || mapped.cargo || '',
            origem: 'leads_monitor',
            enrichmentStatus: 'NOT_ENRICHED',
            originalData: {
              nome: personName,
              cpf: digitsOnly(mapped.cpf),
              telefone: mapped.telefone || '',
              whatsapp: mapped.whatsapp || '',
              email: mapped.email || '',
              endereco: mapped.endereco || '',
              numero: mapped.numero || '',
              complemento: mapped.complemento || '',
              bairro: mapped.bairro || '',
              cep: mapped.cep || '',
              cidade: mapped.cidade || '',
              estado: (mapped.uf || '').toUpperCase(),
              empresa: companyName,
              cnpj: digitsOnly(enriched.cnpj),
              cargo: mapped.cargo || '',
              vinculo: mapped.vinculo || '',
              dataNascimento: mapped.dataNascimento || '',
              produto: mapped.produto || '',
              operacao: mapped.operacao || '',
            },
            enrichedData: {},
            enrichmentHistory: [],
            enrichmentCandidates: [],
            enrichmentSources: [],
            purpose: 'Importação de base autorizada',
            legalBasis: 'base_autorizada',
            consentStatus: '',
            optOut: false,
            blocked: false,
            deleted: false,
            corrected: false,
          })
        )
      } else if (digitsOnly(enriched.cnpj).length === 14 && peopleQueued < 3) {
        peopleQueued += 1
        const { enqueueJob } = await import('./jobQueue')
        await enqueueJob({
          empresaId: opts.empresaId,
          type: 'people_search',
          payload: { opportunityId: oppRef.id },
          idempotencyKey: `people:${opts.empresaId}:${oppRef.id}:import`,
        })
      }

      validos += 1
      processados += 1
      await updateDoc(
        recRef,
        omitUndefinedForFirestore({
          status: 'processado',
          validation,
          opportunityId: oppRef.id,
          atualizadoEm: serverTimestamp(),
        })
      )
      await writeLeadsMonitorAudit({
        empresaId: opts.empresaId,
        action: 'monitor.record.enriched',
        origem: 'worker',
        entidade: 'process_record',
        entidadeId: recRef.id,
        after: { opportunityId: oppRef.id, score: scored.score, validation },
      })
    } catch (e: any) {
      erros += 1
      processados += 1
      await updateDoc(recRef, {
        status: 'erro',
        lastError: String(e?.message || e).slice(0, 400),
        atualizadoEm: serverTimestamp(),
      }).catch(() => {})
    }
    cursor = i + 1
    const progresso = total ? Math.round((cursor / total) * 100) : 0
    const liveNow = (await getDoc(runRef)).data()?.status
    if (liveNow === 'pausado' || liveNow === 'cancelado') {
      break
    }
    await updateDoc(
      runRef,
      omitUndefinedForFirestore({
        status: 'processando',
        cursor,
        processados,
        validos,
        invalidos,
        duplicados,
        enriquecidos,
        pessoasEncontradas,
        qualificados,
        erros,
        progresso,
        etapaAtual:
          cursor < total * 0.2
            ? 'Normalização'
            : cursor < total * 0.35
              ? 'Validação'
              : cursor < total * 0.5
                ? 'Deduplicação'
                : cursor < total * 0.75
                  ? 'Enriquecimento'
                  : cursor < total * 0.9
                    ? 'Pessoas'
                    : 'Qualificação',
        updatedAt: serverTimestamp(),
      })
    )
  }

  const remaining = Math.max(0, total - cursor)
  const liveEnd = (await getDoc(runRef)).data()?.status
  const stopped = liveEnd === 'pausado' || liveEnd === 'cancelado'
  const done = remaining === 0 || stopped
  const finalStatus = done ? (erros > 0 ? 'concluido_com_erros' : 'concluido') : 'processando'
  await updateDoc(
    runRef,
    omitUndefinedForFirestore({
      cursor,
      processados,
      validos,
      invalidos,
      duplicados,
      enriquecidos,
      pessoasEncontradas,
      qualificados,
      erros,
      progresso: total ? Math.round((cursor / total) * 100) : 100,
      status: remaining === 0 ? finalStatus : stopped ? (liveEnd as ProcessRun['status']) : 'processando',
      etapaAtual: remaining === 0 ? 'Finalização' : stopped ? run.etapaAtual : 'Enriquecimento',
      completedAt: remaining === 0 ? serverTimestamp() : null,
      updatedAt: serverTimestamp(),
    })
  )
  if (remaining === 0) {
    if (run.autoEnrich) {
      try {
        const { getCallableEnrichmentProviders } = await import('../enrichment/enrichmentRegistry')
        const { runEnrichmentQueue } = await import('../enrichment/enrichmentQueue')
        if (getCallableEnrichmentProviders().length) {
          const peopleSnap = await getDocs(
            query(collection(db, 'empresas', opts.empresaId, COL_PEOPLE_RESEARCH), where('processRunId', '==', opts.processRunId))
          )
          const people = peopleSnap.docs.map((d) => ({ id: d.id, ...(d.data() as object) })) as import('../types/peopleResearch').CompanyPeopleResearch[]
          await runEnrichmentQueue({
            empresaId: opts.empresaId,
            people,
            companies: [],
          })
        }
      } catch {
        /* sem provider ou fila vazia — importação já concluiu */
      }
    }
    await writeLeadsMonitorAudit({
      empresaId: opts.empresaId,
      action: erros > 0 ? 'monitor.job.failed' : 'monitor.job.completed',
      origem: 'worker',
      entidade: 'process_run',
      entidadeId: opts.processRunId,
      after: { processados, erros, duplicados, enriquecidos },
    })
    await writeLeadsMonitorLog({
      empresaId: opts.empresaId,
      level: erros > 0 ? 'warn' : 'info',
      message: `Processamento concluído: ${processados} · erros ${erros}`,
      jobId: opts.jobId,
      meta: { processRunId: opts.processRunId, etapa: 'finalizacao' },
    })
  }
  return { done, processed: processados, remaining }
}

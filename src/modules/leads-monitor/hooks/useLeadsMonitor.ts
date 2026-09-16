import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTenantCollection } from '../../../hooks/useTenantCollection'
import { useAuth } from '../../../contexts/AuthContext'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../../firebase'
import {
  AUTO_REFRESH_MS,
  COL_AUDIT,
  COL_FONTES,
  COL_HEALTH,
  COL_INBOX,
  COL_JOBS,
  COL_LOGS,
  COL_OPORTUNIDADES,
  COL_PESQUISAS,
  COL_SEARCH_RUNS,
  COL_PEOPLE_RESEARCH,
  COL_PEOPLE_RUNS,
  COL_PROCESS_RUNS,
  COL_DLQ,
  FILTROS_VAZIOS,
  AUTO_SEARCH_ENABLED,
  DEFAULT_SCORE_MINIMO,
} from '../constants'
import { bootstrapConnectors } from '../connectors'
import { aprovarOportunidade, rejeitarOportunidade } from '../pipeline/approve'
import { enviarOportunidadeParaCrm } from '../pipeline/sendToCrm'
import { enviarPessoaParaCrm } from '../pipeline/sendPersonToCrm'
import { enqueueJob } from '../services/jobQueue'
import { processOneJob, startJobWorkerLoop } from '../services/jobWorker'
import { writeLeadsMonitorAudit } from '../services/auditTrail'
import { startIntelligentSearch, requestSearchCancel } from '../search/startSearch'
import { normalizeFiltros } from '../search/filters'
import type {
  FiltrosPesquisa,
  MonitorRunResult,
  OportunidadeMonitor,
  PesquisaSalva,
  SearchRun,
} from '../types'
import type { CompanyPeopleResearch, PeopleRun } from '../types/peopleResearch'
import type { ProcessRun } from '../types/processRun'
import { seedGeoQueue } from '../search/geoAdvance'
import { needsGeoQueue, resolveAbrangencia } from '../search/geoCoverage'
import {
  createProcessRun,
  deleteProcessRun,
  ingestMappedRows,
  patchProcessRun,
  retryErrorRecords,
  setProcessControl,
} from '../services/processRunStore'

bootstrapConnectors()

function runTs(r: SearchRun): number {
  return (r.criadoEm as any)?.toMillis?.() || (r.criadoEm as any)?.seconds * 1000 || 0
}

export function useLeadsMonitor() {
  const { usuario } = useAuth()
  const [filtros, setFiltros] = useState<FiltrosPesquisa>({ ...FILTROS_VAZIOS })
  const [buscando, setBuscando] = useState(false)
  const [ultimoResultado, setUltimoResultado] = useState<MonitorRunResult | null>(null)
  const [ultimoJobId, setUltimoJobId] = useState<string | null>(null)
  const [activeSearchRunId, setActiveSearchRunId] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [ultimaAutoExecucao, setUltimaAutoExecucao] = useState<number | null>(null)
  const autoBusy = useRef(false)

  const {
    items: oportunidadesRaw,
    loading,
    error: loadError,
    empresaId,
    update,
    remove,
  } = useTenantCollection<OportunidadeMonitor>(COL_OPORTUNIDADES, [], {
    tela: 'leads-monitor',
  })

  const {
    items: pesquisasRaw,
    create: createPesquisa,
    update: updatePesquisa,
    remove: removePesquisa,
  } = useTenantCollection<PesquisaSalva>(COL_PESQUISAS, [], {
    tela: 'leads-monitor-pesquisas',
  })

  const { items: jobs } = useTenantCollection(COL_JOBS, [], { tela: 'leads-monitor-jobs' })
  const { items: healthItems } = useTenantCollection(COL_HEALTH, [], {
    tela: 'leads-monitor-health',
  })
  const { items: dlqItems } = useTenantCollection(COL_DLQ, [], {
    tela: 'leads-monitor-dlq',
  })
  const { items: inboxItems } = useTenantCollection(COL_INBOX, [], {
    tela: 'leads-monitor-inbox',
  })
  const { items: logItems } = useTenantCollection(COL_LOGS, [], {
    tela: 'leads-monitor-logs',
  })
  const { items: auditItems } = useTenantCollection(COL_AUDIT, [], {
    tela: 'leads-monitor-audit',
  })
  const { items: searchRunsRaw } = useTenantCollection<SearchRun>(COL_SEARCH_RUNS, [], {
    tela: 'leads-monitor-search-runs',
  })
  const { items: fontesItems } = useTenantCollection(COL_FONTES, [], {
    tela: 'leads-monitor-fontes-hook',
  })
  const { items: peopleItems } = useTenantCollection<CompanyPeopleResearch>(COL_PEOPLE_RESEARCH, [], {
    tela: 'leads-monitor-people',
  })
  const { items: peopleRuns } = useTenantCollection<PeopleRun>(COL_PEOPLE_RUNS, [], {
    tela: 'leads-monitor-people-runs',
  })
  const { items: processRunsRaw } = useTenantCollection<ProcessRun>(COL_PROCESS_RUNS, [], {
    tela: 'leads-monitor-process-runs',
  })

  const oportunidades = useMemo(() => {
    return [...oportunidadesRaw].sort((a, b) => {
      const ta = (a.criadoEm as any)?.toMillis?.() || (a.criadoEm as any)?.seconds * 1000 || 0
      const tb = (b.criadoEm as any)?.toMillis?.() || (b.criadoEm as any)?.seconds * 1000 || 0
      return tb - ta
    })
  }, [oportunidadesRaw])

  const pesquisas = useMemo(() => {
    return [...pesquisasRaw].sort((a, b) => {
      const ta = (a.criadoEm as any)?.toMillis?.() || (a.criadoEm as any)?.seconds * 1000 || 0
      const tb = (b.criadoEm as any)?.toMillis?.() || (b.criadoEm as any)?.seconds * 1000 || 0
      return tb - ta
    })
  }, [pesquisasRaw])

  const searchRuns = useMemo(() => {
    return [...searchRunsRaw].sort((a, b) => runTs(b) - runTs(a))
  }, [searchRunsRaw])

  const activeSearchRun = useMemo(() => {
    if (activeSearchRunId) {
      const found = searchRuns.find((r) => r.id === activeSearchRunId)
      if (found) return found
    }
    return (
      searchRuns.find(
        (r) => r.status === 'running' || r.status === 'queued'
      ) || null
    )
  }, [searchRuns, activeSearchRunId])

  const processRuns = useMemo(() => {
    return [...processRunsRaw].sort((a, b) => {
      const ta = (a.criadoEm as any)?.toMillis?.() || (a.startedAt as any)?.toMillis?.() || 0
      const tb = (b.criadoEm as any)?.toMillis?.() || (b.startedAt as any)?.toMillis?.() || 0
      return tb - ta
    })
  }, [processRunsRaw])

  const activeProcessRun = useMemo(() => {
    return (
      processRuns.find((r) => r.status === 'processando' || r.status === 'aguardando' || r.status === 'pausado') ||
      processRuns[0] ||
      null
    )
  }, [processRuns])

  const stats = useMemo(() => {
    const encontrados = oportunidades.length
    const aprovados = oportunidades.filter(
      (o) => o.status === 'aprovado' || o.status === 'enviado_crm'
    ).length
    const rejeitados = oportunidades.filter((o) => o.status === 'rejeitado').length
    const enviados = oportunidades.filter((o) => o.status === 'enviado_crm').length
    const novos = oportunidades.filter((o) => o.status === 'novo').length
    const muitoQuentes = oportunidades.filter(
      (o) => o.temperatura === 'Muito quente' && o.status !== 'rejeitado'
    ).length
    const quentes = oportunidades.filter(
      (o) => o.temperatura === 'Quente' && o.status !== 'rejeitado'
    ).length
    const mornos = oportunidades.filter(
      (o) => o.temperatura === 'Morno' && o.status !== 'rejeitado'
    ).length
    const frios = oportunidades.filter(
      (o) => o.temperatura === 'Frio' && o.status !== 'rejeitado'
    ).length
    const leadsQuentes = muitoQuentes + quentes
    const pontuaveis = oportunidades.filter((o) => o.status !== 'rejeitado')
    const scoreMedio =
      pontuaveis.length === 0
        ? 0
        : Math.round(pontuaveis.reduce((a, o) => a + (o.score || 0), 0) / pontuaveis.length)

    const hojeStart = new Date()
    hojeStart.setHours(0, 0, 0, 0)
    const hojeMs = hojeStart.getTime()
    const empresasHoje = oportunidades.filter((o) => {
      const t = (o.criadoEm as any)?.toMillis?.() || (o.criadoEm as any)?.seconds * 1000 || 0
      return t >= hojeMs
    }).length

    return {
      encontrados,
      aprovados,
      rejeitados,
      enviados,
      novos,
      quentes,
      muitoQuentes,
      mornos,
      frios,
      leadsQuentes,
      scoreMedio,
      total: encontrados,
      empresasHoje,
      fontesAtivas: fontesItems.filter((f: any) => f.status === 'ativa').length,
      empresas: oportunidades.filter((o) => o.tipo !== 'pessoa').length,
      pessoas: peopleItems.length,
      enriquecidos: oportunidades.filter((o) => o.dadosEnriquecidos?.cnpjValidado || o.cnpj).length,
      comTelefone: oportunidades.filter((o) => (o.telefone || '').replace(/\D/g, '').length >= 10).length,
      comWhatsapp: oportunidades.filter((o) => (o.telefone || '').replace(/\D/g, '').length >= 10).length,
      comEmail: oportunidades.filter((o) => Boolean(o.email)).length,
      comSite: oportunidades.filter((o) => Boolean(o.website)).length,
      duplicados: oportunidades.filter((o) => o.status === 'duplicado').length,
      pendentes: oportunidades.filter((o) => o.status === 'novo').length,
      erros: processRuns.reduce((a, r) => a + (r.erros || 0), 0),
    }
  }, [oportunidades, fontesItems, peopleItems, processRuns])

  /** Busca inteligente V1.2 — enfileira e retorna imediatamente (UI livre). */
  const executarBusca = useCallback(
    async (overrides?: Partial<FiltrosPesquisa>, pesquisaId?: string) => {
      if (!empresaId) {
        setErro('Empresa não identificada')
        return null
      }
      setBuscando(true)
      setErro(null)
      try {
        const f0 = normalizeFiltros({ ...filtros, ...overrides })
        const abrangencia = resolveAbrangencia(f0)
        f0.abrangenciaGeografica = abrangencia
        const pesquisaIdNormalizado =
          typeof pesquisaId === 'string' && pesquisaId.trim() ? pesquisaId.trim() : null
        const processRunId = await createProcessRun({
          empresaId,
          nome: `Busca ${abrangencia} ${f0.estado || ''} ${f0.segmento || f0.operacao || ''}`.trim(),
          tipo: 'busca',
          origem: 'buscar_empresas',
          actor: { usuarioId: usuario?.id, usuarioNome: usuario?.nome },
        })
        await patchProcessRun(empresaId, processRunId, { status: 'processando', startedAt: serverTimestamp() })
        let f = f0
        const cnpj = (f0.cnpjConsulta || '').replace(/\D/g, '')
        if (needsGeoQueue(f0) && cnpj.length !== 14) {
          const seed = await seedGeoQueue({ empresaId, processRunId, filtros: f0 })
          f = {
            ...f0,
            cidade: seed.cidade,
            estado: seed.estado,
            abrangenciaGeografica: abrangencia,
            cidadesSelecionadas: f0.cidadesSelecionadas,
          }
        }
        const { searchRunId, jobId, fontesIds } = await startIntelligentSearch({
          empresaId,
          filtros: f,
          pesquisaId: pesquisaIdNormalizado,
          processRunId,
          actor: { usuarioId: usuario?.id, usuarioNome: usuario?.nome },
        })
        await patchProcessRun(empresaId, processRunId, { searchRunId, filtrosSnapshot: f0 })
        setActiveSearchRunId(searchRunId)
        setUltimoJobId(jobId)
        void processOneJob(empresaId).catch((e) => setErro(e?.message || 'Falha no worker'))
        const pending: MonitorRunResult = {
          encontrados: 0,
          novos: 0,
          duplicados: 0,
          fontes: fontesIds.map((id) => `fonte:${id.slice(0, 6)}`),
        }
        setUltimoResultado(pending)
        return pending
      } catch (e: any) {
        setErro(e?.message || 'Falha ao iniciar busca inteligente')
        return null
      } finally {
        // Libera UI imediatamente — progresso via SearchRun
        setBuscando(false)
      }
    },
    [empresaId, filtros, usuario?.id, usuario?.nome]
  )

  const cancelarBusca = useCallback(async () => {
    if (!empresaId || !activeSearchRun?.id) return
    await requestSearchCancel({
      empresaId,
      searchRunId: activeSearchRun.id,
      actor: { usuarioId: usuario?.id, usuarioNome: usuario?.nome },
    })
    await enqueueJob({
      empresaId,
      type: 'search_cancel',
      payload: { searchRunId: activeSearchRun.id },
      actor: { usuarioId: usuario?.id, usuarioNome: usuario?.nome },
    })
    if (activeProcessRun?.id) {
      await setProcessControl({
        empresaId,
        runId: activeProcessRun.id,
        status: 'cancelado',
        actor: { usuarioId: usuario?.id, usuarioNome: usuario?.nome },
      })
    }
    void processOneJob(empresaId)
  }, [empresaId, activeSearchRun?.id, activeProcessRun?.id, usuario?.id, usuario?.nome])

  const salvarPesquisa = useCallback(
    async (nome: string) => {
      if (!empresaId) throw new Error('Empresa não identificada')
      const f = normalizeFiltros(filtros)
      return createPesquisa({
        nome: nome.trim() || `Pesquisa ${f.segmento || f.cidade || 'geral'}`,
        ...f,
        ativa: false,
        intervaloMinutos: Math.round(AUTO_REFRESH_MS / 60000),
        limitePorCiclo: f.maxResultsPerCycle || 100,
        scoreMinimo: f.scoreMinimo || DEFAULT_SCORE_MINIMO,
        temperaturaMinima: f.temperaturaMinima || '',
        encontrados: 0,
        novos: 0,
        duplicados: 0,
        aprovados: 0,
      })
    },
    [createPesquisa, empresaId, filtros]
  )

  const carregarPesquisa = useCallback((p: PesquisaSalva) => {
    setFiltros(
      normalizeFiltros({
        cidade: p.cidade || '',
        estado: p.estado || '',
        segmento: p.segmento || '',
        palavraChave: p.palavraChave || '',
        bairro: p.bairro,
        cep: p.cep,
        cnae: p.cnae,
        nomeEmpresa: p.nomeEmpresa,
        site: p.site,
        instagram: p.instagram,
        facebook: p.facebook,
        googleMapsQuery: p.googleMapsQuery,
        scoreMinimo: p.scoreMinimo,
        temperaturaMinima: p.temperaturaMinima,
        maxResultsPerCycle: p.limitePorCiclo || p.maxResultsPerCycle,
      })
    )
  }, [])

  const aprovarEEnviar = useCallback(
    async (op: OportunidadeMonitor) => {
      if (!empresaId) throw new Error('Empresa não identificada')
      const actor = { usuarioId: usuario?.id, usuarioNome: usuario?.nome }
      await aprovarOportunidade(empresaId, op, actor)
      return enviarOportunidadeParaCrm(
        empresaId,
        { ...op, status: 'aprovado' },
        usuario?.nome,
        actor
      )
    },
    [empresaId, usuario?.id, usuario?.nome]
  )

  const iniciarPesquisaPessoas = useCallback(
    async (op: OportunidadeMonitor) => {
      if (!empresaId) throw new Error('Empresa não identificada')
      const jobId = await enqueueJob({
        empresaId,
        type: 'people_search',
        payload: { opportunityId: op.id },
        idempotencyKey: `people:${empresaId}:${op.id}:${Date.now()}`,
        actor: { usuarioId: usuario?.id, usuarioNome: usuario?.nome },
      })
      void processOneJob(empresaId)
      return jobId
    },
    [empresaId, usuario?.id, usuario?.nome]
  )

  const ignorarPessoa = useCallback(
    async (person: CompanyPeopleResearch) => {
      if (!empresaId) throw new Error('Empresa não identificada')
      await updateDoc(doc(db, 'empresas', empresaId, COL_PEOPLE_RESEARCH, person.id), {
        status: 'ignorado',
        atualizadoEm: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      await writeLeadsMonitorAudit({
        empresaId,
        action: 'people.ignored',
        origem: 'ui',
        usuarioId: usuario?.id,
        usuarioNome: usuario?.nome,
        entidade: 'pessoa',
        entidadeId: person.id,
        after: { status: 'ignorado' },
      })
    },
    [empresaId, usuario?.id, usuario?.nome]
  )

  const adicionarPessoaAoCrm = useCallback(
    async (person: CompanyPeopleResearch, company: OportunidadeMonitor) => {
      if (!empresaId) throw new Error('Empresa não identificada')
      await writeLeadsMonitorAudit({
        empresaId,
        action: 'people.approved',
        origem: 'ui',
        usuarioId: usuario?.id,
        usuarioNome: usuario?.nome,
        entidade: 'pessoa',
        entidadeId: person.id,
        after: { status: 'aprovado' },
      })
      return enviarPessoaParaCrm(empresaId, person, company, {
        usuarioId: usuario?.id,
        usuarioNome: usuario?.nome,
      })
    },
    [empresaId, usuario?.id, usuario?.nome]
  )

  const iniciarImportacao = useCallback(
    async (payload: {
      nome: string
      arquivoNome: string
      mapping: Record<string, string>
      rows: Record<string, string>[]
    }) => {
      if (!empresaId) throw new Error('Empresa não identificada')
      const actor = { usuarioId: usuario?.id, usuarioNome: usuario?.nome }
      const processRunId = await createProcessRun({
        empresaId,
        nome: payload.nome,
        tipo: 'importacao',
        origem: 'importar_planilha',
        total: payload.rows.length,
        arquivoNome: payload.arquivoNome,
        mapping: payload.mapping,
        actor,
      })
      await ingestMappedRows({ empresaId, processRunId, rows: payload.rows })
      await setProcessControl({ empresaId, runId: processRunId, status: 'processando', actor })
      const jobId = await enqueueJob({
        empresaId,
        type: 'base_process',
        payload: { processRunId },
        idempotencyKey: `base:${empresaId}:${processRunId}`,
        actor,
      })
      setUltimoJobId(jobId)
      void processOneJob(empresaId)
      return processRunId
    },
    [empresaId, usuario?.id, usuario?.nome]
  )

  const controlarProcesso = useCallback(
    async (run: ProcessRun, status: 'pausado' | 'processando' | 'cancelado') => {
      if (!empresaId) return
      const actor = { usuarioId: usuario?.id, usuarioNome: usuario?.nome }
      await setProcessControl({ empresaId, runId: run.id, status, actor })
      if (status === 'processando' && run.tipo === 'importacao') {
        await enqueueJob({
          empresaId,
          type: 'base_process',
          payload: { processRunId: run.id },
          idempotencyKey: `base:${empresaId}:${run.id}:${Date.now()}`,
          actor,
        })
        void processOneJob(empresaId)
      }
      if (status === 'processando' && run.tipo === 'busca') {
        const snap = (run as ProcessRun & { filtrosSnapshot?: FiltrosPesquisa }).filtrosSnapshot
        const cidade = run.cidadeAtual || (run.geoCities || [])[run.geoCityIndex || 0] || snap?.cidade || ''
        const estado = (run.geoUfs || [])[run.geoUfIndex || 0] || snap?.estado || ''
        await enqueueJob({
          empresaId,
          type: 'search_inteligente',
          payload: {
            filtros: {
              ...(snap || FILTROS_VAZIOS),
              cidade,
              estado,
              abrangenciaGeografica: (run.abrangenciaGeografica as FiltrosPesquisa['abrangenciaGeografica']) || snap?.abrangenciaGeografica,
              cidadesSelecionadas: run.geoCities && run.abrangenciaGeografica === 'CIDADE' ? run.geoCities : snap?.cidadesSelecionadas,
            },
            searchRunId: run.searchRunId || undefined,
            processRunId: run.id,
          },
          idempotencyKey: `geo-resume:${empresaId}:${run.id}:${estado}:${cidade}:${Date.now()}`,
          actor,
        })
        void processOneJob(empresaId)
      }
    },
    [empresaId, usuario?.id, usuario?.nome]
  )

  const retentarErros = useCallback(
    async (run: ProcessRun) => {
      if (!empresaId) return
      await retryErrorRecords(empresaId, run.id)
      await enqueueJob({
        empresaId,
        type: 'base_process',
        payload: { processRunId: run.id },
        idempotencyKey: `base:${empresaId}:${run.id}:retry:${Date.now()}`,
      })
      void processOneJob(empresaId)
    },
    [empresaId]
  )

  const excluirProcessamento = useCallback(
    async (run: ProcessRun) => {
      if (!empresaId) return
      await deleteProcessRun(empresaId, run.id)
    },
    [empresaId]
  )

  const rejeitar = useCallback(
    async (op: OportunidadeMonitor, motivo?: string) => {
      if (!empresaId) throw new Error('Empresa não identificada')
      await rejeitarOportunidade(empresaId, op, motivo, {
        usuarioId: usuario?.id,
        usuarioNome: usuario?.nome,
      })
    },
    [empresaId, usuario?.id, usuario?.nome]
  )

  useEffect(() => {
    if (!empresaId) return
    return startJobWorkerLoop(empresaId, 4000)
  }, [empresaId])

  // Sincroniza último resultado quando SearchRun termina
  useEffect(() => {
    if (!activeSearchRun) return
    if (activeSearchRun.status === 'succeeded' || activeSearchRun.status === 'failed') {
      const r = activeSearchRun.resultadoResumo
      if (r) {
        setUltimoResultado({
          encontrados: r.encontrados,
          novos: r.novos,
          duplicados: r.duplicados,
          fontes: r.fontes,
        })
      }
    }
  }, [activeSearchRun])

  useEffect(() => {
    if (!empresaId || !activeSearchRun) return
    const linked = processRuns.find((p) => p.searchRunId === activeSearchRun.id && p.tipo === 'busca')
    if (!linked) return
    const prog = activeSearchRun.progresso
    const statusMap: Record<string, ProcessRun['status']> = {
      queued: 'aguardando',
      running: 'processando',
      paused: 'pausado',
      cancelled: 'cancelado',
      succeeded: 'concluido',
      failed: 'erro',
    }
    const geoOpen = (linked.cidadesTotal || 0) > 1 && (linked.cidadesProcessadas || 0) < (linked.cidadesTotal || 0)
    if (geoOpen && (activeSearchRun.status === 'succeeded' || activeSearchRun.status === 'failed')) {
      return
    }
    const nextStatus = statusMap[activeSearchRun.status] || linked.status
    const nextProg = prog?.percent ?? linked.progresso
    if (linked.status === nextStatus && linked.progresso === nextProg) return
    void patchProcessRun(empresaId, linked.id, {
      status: nextStatus,
      progresso: prog?.percent || linked.progresso,
      processados: prog?.encontrados || linked.processados,
      total: Math.max(linked.total || 0, prog?.encontrados || 0),
      duplicados: prog?.duplicados || linked.duplicados,
      etapaAtual: prog?.etapa || linked.etapaAtual,
    }).catch(() => {})
  }, [empresaId, activeSearchRun, processRuns])

  useEffect(() => {
    if (!empresaId) return
    if (!AUTO_SEARCH_ENABLED) return
    const tick = async () => {
      if (autoBusy.current) return
      const ativas = pesquisas.filter((p) => p.ativa)
      if (!ativas.length) return

      const agora = Date.now()
      const pesquisasParaRodar = ativas.filter((p) => {
        if (!p.ultimaExecucao) return true
        const ultima = (p.ultimaExecucao as any)?.toMillis?.() || (p.ultimaExecucao as any)?.seconds * 1000 || 0
        const intervaloMs = (p.intervaloMinutos || 90) * 60 * 1000
        return agora - ultima >= intervaloMs
      })

      if (!pesquisasParaRodar.length) return

      autoBusy.current = true
      try {
        for (const p of pesquisasParaRodar) {
          const pendingSame = jobs.some(
            (j: any) =>
              j?.payload?.pesquisaId === p.id &&
              (j.status === 'queued' || j.status === 'leased' || j.status === 'running')
          )
          if (pendingSame) continue
          const runningSearch = searchRuns.some((r) => r.status === 'running' || r.status === 'queued')
          if (runningSearch) continue

          await startIntelligentSearch({
            empresaId,
            filtros: normalizeFiltros({
              cidade: p.cidade || '',
              estado: p.estado || '',
              segmento: p.segmento || '',
              palavraChave: p.palavraChave || '',
              scoreMinimo: p.scoreMinimo,
              maxResultsPerCycle: p.limitePorCiclo,
            }),
            pesquisaId: p.id,
            actor: { usuarioId: usuario?.id, usuarioNome: usuario?.nome },
          })

          try {
            await updateDoc(doc(db, 'empresas', empresaId, COL_PESQUISAS, p.id), {
              ultimaExecucao: serverTimestamp(),
            })
          } catch {
            /* ignore */
          }
        }
        setUltimaAutoExecucao(Date.now())
      } catch (e) {
        console.warn('[leads-monitor] auto-refresh', e)
      } finally {
        autoBusy.current = false
      }
    }

    const id = window.setInterval(tick, AUTO_REFRESH_MS)
    return () => window.clearInterval(id)
  }, [empresaId, pesquisas, jobs, searchRuns, usuario?.id, usuario?.nome])

  return {
    empresaId,
    filtros,
    setFiltros,
    oportunidades,
    pesquisas,
    jobs,
    healthItems,
    dlqItems,
    inboxItems,
    logItems,
    auditItems,
    searchRuns,
    activeSearchRun,
    processRuns,
    activeProcessRun,
    fontesItems,
    loading,
    buscando,
    erro: erro || loadError,
    ultimoResultado,
    ultimoJobId,
    stats,
    monitorAuto: {
      ativo: AUTO_SEARCH_ENABLED && pesquisas.some((p) => p.ativa),
      pesquisasAtivas: pesquisas.filter((p) => p.ativa).length,
      intervaloMs: AUTO_REFRESH_MS,
      ultimaExecucao: ultimaAutoExecucao,
    },
    executarBusca,
    cancelarBusca,
    salvarPesquisa,
    carregarPesquisa,
    updatePesquisa,
    removePesquisa,
    aprovarEEnviar,
    iniciarPesquisaPessoas,
    ignorarPessoa,
    adicionarPessoaAoCrm,
    peopleItems,
    peopleRuns,
    iniciarImportacao,
    controlarProcesso,
    retentarErros,
    excluirProcessamento,
    rejeitar,
    removeOportunidade: remove,
    update,
  }
}

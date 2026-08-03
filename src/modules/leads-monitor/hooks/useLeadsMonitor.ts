import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTenantCollection } from '../../../hooks/useTenantCollection'
import { useAuth } from '../../../contexts/AuthContext'
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
  COL_DLQ,
  FILTROS_VAZIOS,
} from '../constants'
import { bootstrapConnectors } from '../connectors'
import { aprovarOportunidade, rejeitarOportunidade } from '../pipeline/approve'
import { enviarOportunidadeParaCrm } from '../pipeline/sendToCrm'
import { enqueueJob } from '../services/jobQueue'
import { processOneJob, startJobWorkerLoop } from '../services/jobWorker'
import { startIntelligentSearch, requestSearchCancel } from '../search/startSearch'
import { normalizeFiltros } from '../search/filters'
import type {
  FiltrosPesquisa,
  MonitorRunResult,
  OportunidadeMonitor,
  PesquisaSalva,
  SearchRun,
} from '../types'

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

  const stats = useMemo(() => {
    const encontrados = oportunidades.length
    const aprovados = oportunidades.filter(
      (o) => o.status === 'aprovado' || o.status === 'enviado_crm'
    ).length
    const rejeitados = oportunidades.filter((o) => o.status === 'rejeitado').length
    const enviados = oportunidades.filter((o) => o.status === 'enviado_crm').length
    const novos = oportunidades.filter((o) => o.status === 'novo').length
    const quentes = oportunidades.filter(
      (o) => o.temperatura === 'Quente' && o.status !== 'rejeitado'
    ).length
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
      scoreMedio,
      total: encontrados,
      empresasHoje,
      fontesAtivas: fontesItems.filter((f: any) => f.status === 'ativa').length,
    }
  }, [oportunidades, fontesItems])

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
        const f = normalizeFiltros({ ...filtros, ...overrides })
        const { searchRunId, jobId, fontesIds } = await startIntelligentSearch({
          empresaId,
          filtros: f,
          pesquisaId,
          actor: { usuarioId: usuario?.id, usuarioNome: usuario?.nome },
        })
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
    void processOneJob(empresaId)
  }, [empresaId, activeSearchRun?.id, usuario?.id, usuario?.nome])

  const salvarPesquisa = useCallback(
    async (nome: string) => {
      if (!empresaId) throw new Error('Empresa não identificada')
      const f = normalizeFiltros(filtros)
      return createPesquisa({
        nome: nome.trim() || `Pesquisa ${f.segmento || f.cidade || 'geral'}`,
        ...f,
        ativa: true,
        intervaloMinutos: Math.round(AUTO_REFRESH_MS / 60000),
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
    if (!empresaId) return
    const tick = async () => {
      if (autoBusy.current) return
      const ativas = pesquisas.filter((p) => p.ativa)
      if (!ativas.length) return
      autoBusy.current = true
      try {
        for (const p of ativas) {
          const pendingSame = jobs.some(
            (j: any) =>
              j?.payload?.pesquisaId === p.id &&
              (j.status === 'queued' || j.status === 'leased' || j.status === 'running')
          )
          if (pendingSame) continue
          const runningSearch = searchRuns.some(
            (r) => r.status === 'running' || r.status === 'queued'
          )
          if (runningSearch) continue
          await startIntelligentSearch({
            empresaId,
            filtros: normalizeFiltros({
              cidade: p.cidade || '',
              estado: p.estado || '',
              segmento: p.segmento || '',
              palavraChave: p.palavraChave || '',
            }),
            pesquisaId: p.id,
            actor: { usuarioId: usuario?.id, usuarioNome: usuario?.nome },
          })
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
    fontesItems,
    loading,
    buscando,
    erro: erro || loadError,
    ultimoResultado,
    ultimoJobId,
    stats,
    monitorAuto: {
      ativo: pesquisas.some((p) => p.ativa),
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
    rejeitar,
    removeOportunidade: remove,
    update,
  }
}

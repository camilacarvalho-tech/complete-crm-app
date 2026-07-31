import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTenantCollection } from '../../../hooks/useTenantCollection'
import { useAuth } from '../../../contexts/AuthContext'
import {
  AUTO_REFRESH_MS,
  COL_HEALTH,
  COL_JOBS,
  COL_OPORTUNIDADES,
  COL_PESQUISAS,
  COL_DLQ,
  FILTROS_VAZIOS,
} from '../constants'
import { bootstrapConnectors } from '../connectors'
import { aprovarOportunidade, rejeitarOportunidade } from '../pipeline/approve'
import { enviarOportunidadeParaCrm } from '../pipeline/sendToCrm'
import { enqueueJob } from '../services/jobQueue'
import { processOneJob, startJobWorkerLoop } from '../services/jobWorker'
import type {
  FiltrosPesquisa,
  MonitorRunResult,
  OportunidadeMonitor,
  PesquisaSalva,
} from '../types'

bootstrapConnectors()

export function useLeadsMonitor() {
  const { usuario } = useAuth()
  const [filtros, setFiltros] = useState<FiltrosPesquisa>({ ...FILTROS_VAZIOS })
  const [buscando, setBuscando] = useState(false)
  const [ultimoResultado, setUltimoResultado] = useState<MonitorRunResult | null>(null)
  const [ultimoJobId, setUltimoJobId] = useState<string | null>(null)
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
    return {
      encontrados,
      aprovados,
      rejeitados,
      enviados,
      novos,
      quentes,
      scoreMedio,
      total: encontrados,
    }
  }, [oportunidades])

  /** Enfileira job (UI não bloqueia o pipeline) e dispara um processamento em background. */
  const executarBusca = useCallback(
    async (overrides?: Partial<FiltrosPesquisa>, pesquisaId?: string) => {
      if (!empresaId) {
        setErro('Empresa não identificada')
        return null
      }
      setBuscando(true)
      setErro(null)
      try {
        const f = { ...filtros, ...overrides }
        const jobId = await enqueueJob({
          empresaId,
          type: 'search',
          payload: { filtros: f, pesquisaId },
          actor: { usuarioId: usuario?.id, usuarioNome: usuario?.nome },
        })
        setUltimoJobId(jobId)
        // Processa em background — lista atualiza via onSnapshot
        void processOneJob(empresaId)
          .then((did) => {
            if (did) {
              setUltimoResultado({
                encontrados: 0,
                novos: 0,
                duplicados: 0,
                fontes: [`job:${jobId}`],
              })
            }
          })
          .catch((e) => setErro(e?.message || 'Falha no worker'))
        const pending: MonitorRunResult = {
          encontrados: 0,
          novos: 0,
          duplicados: 0,
          fontes: [`enfileirado:${jobId}`],
        }
        setUltimoResultado(pending)
        return pending
      } catch (e: any) {
        setErro(e?.message || 'Falha ao enfileirar busca')
        return null
      } finally {
        setBuscando(false)
      }
    },
    [empresaId, filtros, usuario?.id, usuario?.nome]
  )

  const salvarPesquisa = useCallback(
    async (nome: string) => {
      if (!empresaId) throw new Error('Empresa não identificada')
      return createPesquisa({
        nome: nome.trim() || `Pesquisa ${filtros.segmento || filtros.cidade || 'geral'}`,
        ...filtros,
        ativa: true,
        intervaloMinutos: Math.round(AUTO_REFRESH_MS / 60000),
      })
    },
    [createPesquisa, empresaId, filtros]
  )

  const carregarPesquisa = useCallback((p: PesquisaSalva) => {
    setFiltros({
      cidade: p.cidade || '',
      estado: p.estado || '',
      segmento: p.segmento || '',
      palavraChave: p.palavraChave || '',
    })
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

  // Worker loop (escala horizontal-ready via lease)
  useEffect(() => {
    if (!empresaId) return
    return startJobWorkerLoop(empresaId, 8000)
  }, [empresaId])

  // Auto-monitor: enfileira jobs das pesquisas ativas
  useEffect(() => {
    if (!empresaId) return
    const tick = async () => {
      if (autoBusy.current) return
      const ativas = pesquisas.filter((p) => p.ativa)
      if (!ativas.length) return
      autoBusy.current = true
      try {
        for (const p of ativas) {
          // Evita empilhar jobs se já há busca pendente para a mesma pesquisa
          const pendingSame = jobs.some(
            (j: any) =>
              j?.payload?.pesquisaId === p.id &&
              (j.status === 'queued' || j.status === 'leased' || j.status === 'running')
          )
          if (pendingSame) continue
          await enqueueJob({
            empresaId,
            type: 'search',
            payload: {
              filtros: {
                cidade: p.cidade || '',
                estado: p.estado || '',
                segmento: p.segmento || '',
                palavraChave: p.palavraChave || '',
              },
              pesquisaId: p.id,
            },
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
  }, [empresaId, pesquisas, jobs, usuario?.id, usuario?.nome])

  return {
    empresaId,
    filtros,
    setFiltros,
    oportunidades,
    pesquisas,
    jobs,
    healthItems,
    dlqItems,
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

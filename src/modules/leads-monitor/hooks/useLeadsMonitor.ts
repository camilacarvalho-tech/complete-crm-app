import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTenantCollection } from '../../../hooks/useTenantCollection'
import { useAuth } from '../../../contexts/AuthContext'
import { AUTO_REFRESH_MS, COL_OPORTUNIDADES, COL_PESQUISAS, FILTROS_VAZIOS } from '../constants'
import { bootstrapConnectors } from '../connectors'
import { runLeadPipeline } from '../pipeline'
import { aprovarOportunidade, rejeitarOportunidade } from '../pipeline/approve'
import { enviarOportunidadeParaCrm } from '../pipeline/sendToCrm'
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
      /** @deprecated use encontrados */
      total: encontrados,
    }
  }, [oportunidades])

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
        const result = await runLeadPipeline({
          empresaId,
          filtros: f,
          pesquisaId,
          llmBudget: 3,
        })
        setUltimoResultado(result)
        return result
      } catch (e: any) {
        setErro(e?.message || 'Falha na busca')
        return null
      } finally {
        setBuscando(false)
      }
    },
    [empresaId, filtros]
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

  /** Etapas 6+7: Aprovação → Envio ao CRM */
  const aprovarEEnviar = useCallback(
    async (op: OportunidadeMonitor) => {
      if (!empresaId) throw new Error('Empresa não identificada')
      await aprovarOportunidade(empresaId, op)
      return enviarOportunidadeParaCrm(
        empresaId,
        { ...op, status: 'aprovado' },
        usuario?.nome
      )
    },
    [empresaId, usuario?.nome]
  )

  const rejeitar = useCallback(
    async (op: OportunidadeMonitor, motivo?: string) => {
      if (!empresaId) throw new Error('Empresa não identificada')
      await rejeitarOportunidade(empresaId, op, motivo)
    },
    [empresaId]
  )

  useEffect(() => {
    if (!empresaId) return
    const tick = async () => {
      if (autoBusy.current) return
      const ativas = pesquisas.filter((p) => p.ativa)
      if (!ativas.length) return
      autoBusy.current = true
      try {
        for (const p of ativas) {
          const result = await runLeadPipeline({
            empresaId,
            filtros: {
              cidade: p.cidade || '',
              estado: p.estado || '',
              segmento: p.segmento || '',
              palavraChave: p.palavraChave || '',
            },
            pesquisaId: p.id,
            llmBudget: 0,
          })
          setUltimoResultado(result)
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
  }, [empresaId, pesquisas])

  return {
    empresaId,
    filtros,
    setFiltros,
    oportunidades,
    pesquisas,
    loading,
    buscando,
    erro: erro || loadError,
    ultimoResultado,
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

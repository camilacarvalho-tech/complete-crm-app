/**
 * Nexus Leads Monitor V1.1 — painel completo.
 * Capta, organiza e qualifica oportunidades; o CRM só recebe as aprovadas.
 */
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Radar,
  Search,
  Save,
  Play,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Flame,
  Thermometer,
  Snowflake,
  Building2,
  User,
  ShieldCheck,
  Trash2,
  Send,
  Bookmark,
  Pause,
  Info,
  Activity,
  Ban,
  Inbox,
  ScrollText,
  ClipboardList,
  Briefcase,
  Database,
} from 'lucide-react'
import {
  useLeadsMonitor,
  ESTADOS_BR,
  SEGMENTOS,
  bootstrapConnectors,
  LEADS_MONITOR_VERSION,
  AUTO_REFRESH_MS,
  type OportunidadeMonitor,
} from '../modules/leads-monitor'
import { IntegrationsAdminPanel } from '../modules/leads-monitor/components/IntegrationsAdminPanel'
import { useToast } from '../components/ui/Toast'
import { useAuth } from '../contexts/AuthContext'

bootstrapConnectors()

function TempIcon({ t }: { t?: string }) {
  if (t === 'Quente') return <Flame className="w-4 h-4 text-orange-500" />
  if (t === 'Frio') return <Snowflake className="w-4 h-4 text-sky-400" />
  return <Thermometer className="w-4 h-4 text-amber-500" />
}

function scoreColor(score: number) {
  if (score >= 75) return 'text-orange-500'
  if (score >= 45) return 'text-amber-500'
  return 'text-slate-400'
}

function StatusBadge({ status }: { status: OportunidadeMonitor['status'] }) {
  const map: Record<string, string> = {
    novo: 'bg-blue-500/15 text-blue-600 dark:text-blue-300',
    qualificado: 'bg-violet-500/15 text-violet-600 dark:text-violet-300',
    aprovado: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300',
    enviado_crm: 'bg-green-500/20 text-green-700 dark:text-green-300',
    rejeitado: 'bg-red-500/15 text-red-600 dark:text-red-300',
    duplicado: 'bg-slate-500/15 text-slate-500',
  }
  const label: Record<string, string> = {
    novo: 'Novo',
    qualificado: 'Qualificado',
    aprovado: 'Aprovado',
    enviado_crm: 'Enviado',
    rejeitado: 'Rejeitado',
    duplicado: 'Duplicado',
  }
  return (
    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${map[status] || map.novo}`}>
      {label[status] || status}
    </span>
  )
}

type FiltroLista = 'todos' | 'novo' | 'aprovado' | 'enviado_crm' | 'rejeitado'

export default function LeadsMonitor() {
  const toast = useToast()
  const {
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
    activeSearchRun,
    loading,
    buscando,
    erro,
    ultimoResultado,
    ultimoJobId,
    stats,
    monitorAuto,
    executarBusca,
    cancelarBusca,
    salvarPesquisa,
    carregarPesquisa,
    updatePesquisa,
    removePesquisa,
    aprovarEEnviar,
    rejeitar,
    removeOportunidade,
    empresaId,
  } = useLeadsMonitor()

  const { usuario } = useAuth()

  const [nomePesquisa, setNomePesquisa] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<FiltroLista>('todos')
  const [enviandoId, setEnviandoId] = useState<string | null>(null)
  const [segundosAuto, setSegundosAuto] = useState(Math.round(AUTO_REFRESH_MS / 1000))

  const pesquisasAtivas = pesquisas.filter((p) => p.ativa).length

  useEffect(() => {
    if (pesquisasAtivas === 0) {
      setSegundosAuto(Math.round(AUTO_REFRESH_MS / 1000))
      return
    }
    const id = window.setInterval(() => {
      setSegundosAuto((s) => (s <= 1 ? Math.round(AUTO_REFRESH_MS / 1000) : s - 1))
    }, 1000)
    return () => window.clearInterval(id)
  }, [pesquisasAtivas, monitorAuto.ultimaExecucao])

  const lista = useMemo(() => {
    return oportunidades.filter((o) => {
      if (filtroStatus === 'todos') return true
      return o.status === filtroStatus
    })
  }, [oportunidades, filtroStatus])

  const onBuscar = async () => {
    const r = await executarBusca()
    if (r) {
      toast.success(
        'Busca inteligente iniciada',
        'Rodando em background · progresso em tempo real · UI liberada'
      )
    }
  }

  const onCancelar = async () => {
    try {
      await cancelarBusca()
      toast.info('Cancelamento solicitado', 'A busca será interrompida com segurança.')
    } catch (e: any) {
      toast.error('Não foi possível cancelar', e?.message)
    }
  }

  const onSalvar = async () => {
    try {
      await salvarPesquisa(nomePesquisa)
      setNomePesquisa('')
      toast.success('Pesquisa salva', 'Monitor automático ativado para esta pesquisa.')
    } catch (e: any) {
      toast.error('Não foi possível salvar', e?.message)
    }
  }

  const onAprovar = async (op: OportunidadeMonitor) => {
    setEnviandoId(op.id)
    try {
      const r = await aprovarEEnviar(op)
      toast.success(
        r.jaExistia ? 'Já existia no CRM' : 'Enviado ao Nexus CRM',
        r.jaExistia
          ? 'Oportunidade vinculada ao cliente existente.'
          : 'Lead criado em Clientes · Pipeline Novo Lead.'
      )
    } catch (e: any) {
      toast.error('Falha ao enviar', e?.message)
    } finally {
      setEnviandoId(null)
    }
  }

  const searchRunning =
    activeSearchRun?.status === 'running' || activeSearchRun?.status === 'queued'
  const progresso = activeSearchRun?.progresso

  const kpiCards = [
    { label: 'Encontrados', value: stats.encontrados, color: 'text-blue-500', icon: Inbox },
    { label: 'Hoje', value: stats.empresasHoje, color: 'text-sky-500', icon: Building2 },
    { label: 'Aprovados', value: stats.aprovados, color: 'text-emerald-500', icon: CheckCircle2 },
    { label: 'Enviados', value: stats.enviados, color: 'text-green-600', icon: Send },
    { label: 'Score médio', value: stats.scoreMedio, color: 'text-amber-500', icon: Activity },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Radar className="w-8 h-8 text-nexus-orange" />
            Nexus Leads Monitor
            <span className="text-xs font-semibold px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-500">
              v{LEADS_MONITOR_VERSION}
            </span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Módulo independente · conectores autorizados (LGPD) · score Nexus AI · CRM só recebe aprovados
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Link
            to="/fontes-pesquisa"
            className="text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 hover:border-nexus-orange/50"
          >
            <Database className="w-3.5 h-3.5 text-nexus-orange" />
            Fontes de Pesquisa
          </Link>
          <div
            className={`flex items-center gap-2 text-xs rounded-xl px-3 py-2 border ${
              pesquisasAtivas > 0
                ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-500'
            }`}
          >
            <Activity className={`w-4 h-4 ${pesquisasAtivas > 0 ? 'animate-pulse' : ''}`} />
            {pesquisasAtivas > 0 ? (
              <span>
                Monitor automático ON · {pesquisasAtivas} pesquisa{pesquisasAtivas > 1 ? 's' : ''} · próxima em{' '}
                {segundosAuto}s
              </span>
            ) : (
              <span>Monitor automático OFF · salve uma pesquisa com Auto ON</span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 max-w-md">
            <Info className="w-4 h-4 shrink-0 text-code-info" />
            <span>Pessoas: consentimento LGPD. Empresas: bases públicas / APIs autorizadas.</span>
          </div>
        </div>
      </div>

      {/* Estatísticas da pesquisa */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {kpiCards.map(({ label, value, color, icon: Icon }) => (
          <div
            key={label}
            className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700"
          >
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>{label}</span>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <div className={`text-2xl font-bold tabular-nums ${color}`}>{value}</div>
          </div>
        ))}
      </div>

      {ultimoResultado && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-3 text-sm text-slate-600 dark:text-slate-300 flex flex-wrap gap-x-4 gap-y-1">
          <span className="font-semibold text-slate-800 dark:text-white">Última busca</span>
          <span>{ultimoResultado.encontrados} encontrados</span>
          <span>{ultimoResultado.novos} novos</span>
          <span>{ultimoResultado.duplicados} duplicados removidos</span>
          <span>Fontes: {ultimoResultado.fontes.join(', ') || '—'}</span>
        </div>
      )}

      {/* Operações: Inbox · Jobs · Logs · Audit */}
      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3" data-testid="ops-panels">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
            <Inbox className="w-4 h-4 text-nexus-orange" /> Inbox
            <span className="ml-auto text-xs font-normal text-slate-400">{inboxItems?.length || 0}</span>
          </div>
          <ul className="space-y-1.5 max-h-36 overflow-y-auto text-xs text-slate-600 dark:text-slate-300">
            {(inboxItems || []).slice(0, 8).map((item: any) => (
              <li key={item.id} className="flex justify-between gap-2 border-b border-slate-100 dark:border-slate-700/60 pb-1">
                <span className="truncate">{item.payload?.nome || item.payload?.name || item.id}</span>
                <span className="shrink-0 text-slate-400">{item.status || 'pending'}</span>
              </li>
            ))}
            {!(inboxItems || []).length && <li className="text-slate-400">Vazia</li>}
          </ul>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
            <Briefcase className="w-4 h-4 text-blue-500" /> Jobs
            <span className="ml-auto text-xs font-normal text-slate-400">{jobs?.length || 0}</span>
          </div>
          <ul className="space-y-1.5 max-h-36 overflow-y-auto text-xs text-slate-600 dark:text-slate-300">
            {(jobs || []).slice(0, 8).map((j: any) => (
              <li key={j.id} className="flex justify-between gap-2 border-b border-slate-100 dark:border-slate-700/60 pb-1">
                <span className="truncate">{j.type || 'job'} · {j.id.slice(0, 8)}</span>
                <span className="shrink-0 text-slate-400">{j.status}</span>
              </li>
            ))}
            {!(jobs || []).length && <li className="text-slate-400">Nenhum</li>}
          </ul>
          {ultimoJobId && (
            <p className="mt-2 text-[11px] text-slate-400">Último job: {ultimoJobId}</p>
          )}
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
            <ScrollText className="w-4 h-4 text-violet-500" /> Logs
            <span className="ml-auto text-xs font-normal text-slate-400">{logItems?.length || 0}</span>
          </div>
          <ul className="space-y-1.5 max-h-36 overflow-y-auto text-xs text-slate-600 dark:text-slate-300">
            {(logItems || []).slice(0, 8).map((l: any) => (
              <li key={l.id} className="border-b border-slate-100 dark:border-slate-700/60 pb-1 truncate">
                <span className="text-slate-400">{l.level || 'info'}</span> · {l.message || l.evento || l.id}
              </li>
            ))}
            {!(logItems || []).length && <li className="text-slate-400">Sem logs</li>}
          </ul>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
            <ClipboardList className="w-4 h-4 text-emerald-500" /> Audit Trail
            <span className="ml-auto text-xs font-normal text-slate-400">{auditItems?.length || 0}</span>
          </div>
          <ul className="space-y-1.5 max-h-36 overflow-y-auto text-xs text-slate-600 dark:text-slate-300">
            {(auditItems || []).slice(0, 8).map((a: any) => (
              <li key={a.id} className="border-b border-slate-100 dark:border-slate-700/60 pb-1 truncate">
                {a.acao || a.action || a.evento || a.id}
              </li>
            ))}
            {!(auditItems || []).length && <li className="text-slate-400">Sem eventos</li>}
          </ul>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* Filtros */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              <Search className="w-4 h-4" /> Filtros de pesquisa
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="text-xs text-slate-500">Cidade</label>
                <input
                  value={filtros.cidade}
                  onChange={(e) => setFiltros({ ...filtros, cidade: e.target.value })}
                  placeholder="Ex: São Paulo"
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 dark:text-white text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500">Estado</label>
                <select
                  value={filtros.estado}
                  onChange={(e) => setFiltros({ ...filtros, estado: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 dark:text-white text-sm"
                >
                  <option value="">Todos</option>
                  {ESTADOS_BR.map((uf) => (
                    <option key={uf} value={uf}>
                      {uf}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500">Bairro</label>
                <input
                  value={filtros.bairro || ''}
                  onChange={(e) => setFiltros({ ...filtros, bairro: e.target.value })}
                  placeholder="Opcional"
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 dark:text-white text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500">CEP</label>
                <input
                  value={filtros.cep || ''}
                  onChange={(e) => setFiltros({ ...filtros, cep: e.target.value })}
                  placeholder="00000-000"
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 dark:text-white text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500">Segmento</label>
                <select
                  value={filtros.segmento}
                  onChange={(e) => setFiltros({ ...filtros, segmento: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 dark:text-white text-sm"
                >
                  <option value="">Todos</option>
                  {SEGMENTOS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500">CNAE</label>
                <input
                  value={filtros.cnae || ''}
                  onChange={(e) => setFiltros({ ...filtros, cnae: e.target.value })}
                  placeholder="Ex: 6499"
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 dark:text-white text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500">Nome da empresa</label>
                <input
                  value={filtros.nomeEmpresa || ''}
                  onChange={(e) => setFiltros({ ...filtros, nomeEmpresa: e.target.value })}
                  placeholder="Razão social / fantasia"
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 dark:text-white text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500">Palavra-chave</label>
                <input
                  value={filtros.palavraChave}
                  onChange={(e) => setFiltros({ ...filtros, palavraChave: e.target.value })}
                  placeholder="INSS, CLT, consignado..."
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 dark:text-white text-sm"
                />
              </div>
            </div>

            {searchRunning && progresso && (
              <div className="rounded-xl border border-nexus-orange/30 bg-orange-50/50 dark:bg-orange-500/5 px-4 py-3 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    Busca em andamento · {progresso.etapa}
                  </span>
                  <span className="tabular-nums text-slate-500">
                    {progresso.percent}% · {progresso.encontrados} encontrados ·{' '}
                    {progresso.fontesConcluidas}/{progresso.fontesTotal} fontes
                    {progresso.etaMs != null ? ` · ETA ~${Math.ceil(progresso.etaMs / 1000)}s` : ''}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  <div
                    className="h-full bg-nexus-orange transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, progresso.percent))}%` }}
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={onCancelar}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-white"
                  >
                    Cancelar busca
                  </button>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2 items-center">
              <button
                type="button"
                disabled={buscando}
                onClick={onBuscar}
                className="px-4 py-2.5 bg-nexus-orange text-white rounded-lg flex items-center gap-2 text-sm font-semibold disabled:opacity-60 shadow-sm"
              >
                {buscando ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                {buscando ? 'Enfileirando…' : searchRunning ? 'Buscar novamente' : 'Buscar Agora'}
              </button>
              <input
                value={nomePesquisa}
                onChange={(e) => setNomePesquisa(e.target.value)}
                placeholder="Nome da pesquisa salva"
                className="px-3 py-2.5 rounded-lg bg-slate-100 dark:bg-slate-700 dark:text-white text-sm min-w-[180px]"
              />
              <button
                type="button"
                onClick={onSalvar}
                className="px-4 py-2.5 bg-slate-800 dark:bg-slate-600 text-white rounded-lg flex items-center gap-2 text-sm font-semibold"
              >
                <Save className="w-4 h-4" /> Salvar pesquisa
              </button>
            </div>

            {erro && <p className="text-sm text-red-500">{erro}</p>}
            {ultimoJobId && (
              <p className="text-xs text-slate-500">Último job: {ultimoJobId}</p>
            )}
            {jobs?.length > 0 && (
              <p className="text-xs text-slate-500">
                Fila: {jobs.filter((j: any) => j.status === 'queued' || j.status === 'running' || j.status === 'leased').length}{' '}
                ativos · {jobs.filter((j: any) => j.status === 'dead').length} dead
              </p>
            )}
          </div>

          {/* Lista de oportunidades */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Oportunidades ({lista.length})
              </div>
              <div className="flex flex-wrap gap-1">
                {(
                  [
                    ['todos', 'Todas'],
                    ['novo', 'Novas'],
                    ['aprovado', 'Aprovadas'],
                    ['enviado_crm', 'Enviadas'],
                    ['rejeitado', 'Rejeitadas'],
                  ] as const
                ).map(([s, label]) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setFiltroStatus(s)}
                    className={`text-xs px-2.5 py-1 rounded-lg ${
                      filtroStatus === s
                        ? 'bg-slate-800 text-white dark:bg-slate-600'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="p-8 text-center text-slate-500 text-sm">Carregando...</div>
            ) : lista.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm space-y-1">
                <p>Nenhuma oportunidade neste filtro.</p>
                <p className="text-xs">Defina Cidade/Estado/Segmento/Palavra-chave e clique em Buscar Agora.</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-700/80 max-h-[560px] overflow-y-auto">
                {lista.map((op) => (
                  <li
                    key={op.id}
                    className="p-4 hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors"
                  >
                    <div className="flex flex-wrap gap-3 justify-between">
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {op.tipo === 'empresa' ? (
                            <Building2 className="w-4 h-4 text-slate-400" />
                          ) : (
                            <User className="w-4 h-4 text-slate-400" />
                          )}
                          <span className="font-semibold text-slate-800 dark:text-white truncate">
                            {op.nome}
                          </span>
                          <StatusBadge status={op.status} />
                          <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                            <TempIcon t={op.temperatura} />
                            {op.temperatura}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 flex flex-wrap gap-x-3 gap-y-1">
                          <span>
                            {op.cidade}/{op.estado}
                          </span>
                          <span>
                            {SEGMENTOS.find((s) => s.id === op.segmento)?.label || op.segmento}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-emerald-500" />
                            {op.origemLabel || op.connectorId}
                          </span>
                          {op.telefone && <span>{op.telefone}</span>}
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300">{op.classificacao}</p>
                        {op.motivosScore?.length > 0 && (
                          <p className="text-[11px] text-slate-400">
                            {op.motivosScore.slice(0, 3).join(' · ')}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <div className={`text-2xl font-bold tabular-nums ${scoreColor(op.score || 0)}`}>
                          {op.score ?? '—'}
                        </div>
                        <div className="text-[10px] uppercase tracking-wide text-slate-400">
                          {op.origemScore === 'nexus_ai_llm' ? 'Nexus AI' : 'Score Nexus AI'}
                        </div>
                        <div className="flex gap-1.5">
                          {op.status !== 'enviado_crm' && op.status !== 'rejeitado' && (
                            <>
                              <button
                                type="button"
                                disabled={enviandoId === op.id}
                                onClick={() => onAprovar(op)}
                                className="px-2.5 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1 disabled:opacity-60"
                                title="Aprovar e enviar ao Nexus CRM"
                              >
                                {enviandoId === op.id ? (
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Send className="w-3.5 h-3.5" />
                                )}
                                Aprovar → CRM
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  rejeitar(op).then(() => toast.info('Oportunidade rejeitada'))
                                }
                                className="px-2.5 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-white text-xs"
                                title="Rejeitar"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                          {op.status === 'enviado_crm' && (
                            <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> No CRM
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              removeOportunidade(op.id, op).then(() =>
                                toast.info('Removido do monitor')
                              )
                            }
                            className="px-2 py-1.5 rounded-lg text-slate-400 hover:text-red-500"
                            title="Excluir"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Lateral */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                <Bookmark className="w-4 h-4" /> Pesquisas salvas
              </div>
              <span className="text-[11px] text-slate-400">{pesquisas.length}</span>
            </div>
            {pesquisas.length === 0 ? (
              <p className="text-xs text-slate-500 leading-relaxed">
                Salve filtros atuais para o monitor buscar automaticamente e remover duplicidades a cada ciclo.
              </p>
            ) : (
              <ul className="space-y-2 max-h-[320px] overflow-y-auto">
                {pesquisas.map((p) => (
                  <li
                    key={p.id}
                    className="rounded-lg border border-slate-200 dark:border-slate-600 p-3 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          carregarPesquisa(p)
                          toast.info('Filtros carregados', p.nome)
                        }}
                        className="text-left text-sm font-medium text-slate-800 dark:text-white hover:underline"
                      >
                        {p.nome}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          removePesquisa(p.id, p).then(() => toast.info('Pesquisa removida'))
                        }
                        className="text-slate-400 hover:text-red-500"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      {[
                        p.cidade,
                        p.estado,
                        SEGMENTOS.find((s) => s.id === p.segmento)?.label,
                        p.palavraChave,
                      ]
                        .filter(Boolean)
                        .join(' · ') || 'Sem filtros'}
                    </p>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          updatePesquisa(p.id, { ativa: !p.ativa }, p).then(() =>
                            toast.info(p.ativa ? 'Auto OFF' : 'Auto ON', p.nome)
                          )
                        }
                        className={`text-xs px-2 py-1 rounded-md flex items-center gap-1 ${
                          p.ativa
                            ? 'bg-emerald-500/15 text-emerald-600'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                        }`}
                      >
                        {p.ativa ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                        {p.ativa ? 'Auto ON' : 'Auto OFF'}
                      </button>
                      <button
                        type="button"
                        disabled={buscando}
                        onClick={() =>
                          executarBusca(
                            {
                              cidade: p.cidade,
                              estado: p.estado,
                              segmento: p.segmento,
                              palavraChave: p.palavraChave,
                            },
                            p.id
                          ).then((r) => {
                            if (r) {
                              carregarPesquisa(p)
                              toast.success(
                                'Pesquisa enfileirada',
                                `Job assíncrono · ${r.fontes.join(', ')}`
                              )
                            }
                          })
                        }
                        className="text-xs px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center gap-1"
                      >
                        <RefreshCw className="w-3 h-3" /> Rodar
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <div className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">
              Integrações (admin)
            </div>
            <p className="text-[11px] text-slate-500 mb-3">
              Configuração sem código · secrets criptografados · health · fila assíncrona
            </p>
            <IntegrationsAdminPanel
              empresaId={empresaId}
              healthItems={healthItems || []}
              dlqItems={dlqItems || []}
              actor={{ usuarioId: usuario?.id, usuarioNome: usuario?.nome }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

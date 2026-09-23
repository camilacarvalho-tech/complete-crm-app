/**
 * Nexus Leads Monitor — casca operacional (navegação interna em /leads-monitor).
 */
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Radar, Info, Ban } from 'lucide-react'
import {
  useLeadsMonitor,
  bootstrapConnectors,
  LEADS_MONITOR_VERSION,
  AUTO_REFRESH_MS,
  type OportunidadeMonitor,
  type PesquisaSalva,
} from '../modules/leads-monitor'
import { IntegrationsAdminPanel } from '../modules/leads-monitor/components/IntegrationsAdminPanel'
import { PesquisarPessoasModal } from '../modules/leads-monitor/components/PesquisarPessoasModal'
import { RobotPanel } from '../modules/leads-monitor/components/RobotPanel'
import { ImportBasePanel } from '../modules/leads-monitor/components/ImportBasePanel'
import { SavedProcessingsPanel } from '../modules/leads-monitor/components/SavedProcessingsPanel'
import { MonitorOverview } from '../modules/leads-monitor/components/MonitorOverview'
import { CampaignsPanel } from '../modules/leads-monitor/components/CampaignsPanel'
import { RobotCenter } from '../modules/leads-monitor/components/RobotCenter'
import { ManualSearch } from '../modules/leads-monitor/components/ManualSearch'
import { LeadResults, type FiltroLista } from '../modules/leads-monitor/components/LeadResults'
import { QueuePanel } from '../modules/leads-monitor/components/QueuePanel'
import { LogsPanel } from '../modules/leads-monitor/components/LogsPanel'
import { downloadBaseCompleta } from '../modules/leads-monitor/pipeline/exportWorkbook'
import {
  exportarCampanhaCsv,
  exportarCampanhaExcel,
  salvarCampanhaNoCrm,
  sincronizarCampanhaNxErp,
} from '../modules/leads-monitor/services/campaignWorkspace'
import { useToast } from '../components/ui/Toast'
import { useAuth } from '../contexts/AuthContext'
import { useNexusStore } from '../contexts/NexusStore'
import { FontesPesquisaGovernanca } from '../modules/leads-monitor/components/FontesPesquisaGovernanca'
import { FontesEnrichmentPanel } from '../modules/leads-monitor/components/FontesEnrichmentPanel'
import { FontesHub } from '../modules/leads-monitor/components/FontesHub'
import { PeoplePanel } from '../modules/leads-monitor/components/PeoplePanel'
import { LgpdOperacaoPanel } from '../modules/leads-monitor/components/LgpdOperacaoPanel'
import { LgpdGovernancaBlock } from '../modules/leads-monitor/components/LgpdGovernancaBlock'
import { NexusModal } from '../components/nexus/Modal'
import type { FontePesquisa } from '../modules/leads-monitor'

bootstrapConnectors()

function LoteParaDigitacao() {
  const { digitacoes } = useNexusStore()
  const toast = useToast()
  const [enviados, setEnviados] = useState<number | null>(null)

  async function subir(file: File) {
    const text = await file.text()
    const rows = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
    const start = /nome|cpf/i.test(rows[0] || '') ? 1 : 0
    let criados = 0
    for (const line of rows.slice(start)) {
      const [nome, cpf, produto, operacao, telefone] = line.split(/[;,]/).map((s) => s.trim())
      if (!nome && !cpf) continue
      await digitacoes.create({
        clienteNome: nome || '',
        cpf: cpf || '',
        produto: produto || '',
        operacao: operacao || '',
        telefone: telefone || '',
        status: 'em_andamento',
        origem: 'lote_monitor',
      } as any)
      criados += 1
    }
    setEnviados(criados)
    toast.success(criados ? `${criados} no lote da Digitação` : 'Nenhuma linha válida')
  }

  return (
    <div className="rounded-xl border p-3 mb-3" style={{ borderColor: 'var(--code-border)', background: 'var(--code-surface)' }}>
      <p className="text-sm font-semibold">Subir em lote para o robô digitar</p>
      <p className="text-[12px] mt-1" style={{ color: 'var(--code-muted)' }}>
        Depois do enriquecimento e da consulta na API, envie o CSV (nome, CPF, produto, operação, telefone). O lote entra na Digitação e a equipe só analisa.
      </p>
      <label className="inline-block mt-2 text-[12px] font-semibold cursor-pointer" style={{ color: 'var(--code-orange)' }}>
        Escolher CSV
        <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => e.target.files?.[0] && void subir(e.target.files[0])} />
      </label>
      {enviados != null ? <p className="text-[12px] mt-1">{enviados} registro(s) na fila.</p> : null}
    </div>
  )
}

type MonitorView =
  | 'visao'
  | 'campanhas'
  | 'robos'
  | 'busca'
  | 'leads'
  | 'fila'
  | 'fontes'
  | 'logs'
  | 'importar'
  | 'processamentos'
  | 'pessoas'
  | 'lgpd'

const ABAS_PRINCIPAIS: Array<[MonitorView, string]> = [
  ['visao', 'Visão geral'],
  ['campanhas', 'Campanhas'],
  ['robos', 'Robôs'],
  ['busca', 'Busca manual'],
  ['fontes', 'Fontes'],
  ['logs', 'Logs'],
]

const ABAS_SECUNDARIAS: Array<[MonitorView, string]> = [
  ['importar', 'Importar'],
  ['processamentos', 'Processamentos'],
  ['pessoas', 'Pessoas'],
  ['lgpd', 'LGPD'],
]

const VIEWS = new Set<string>([...ABAS_PRINCIPAIS, ...ABAS_SECUNDARIAS].map(([id]) => id))

function abaFromParam(raw: string | null): MonitorView {
  if (raw === 'dashboard') return 'visao'
  if (raw === 'buscar' || raw === 'resultados') return raw === 'buscar' ? 'busca' : 'leads'
  if (raw && VIEWS.has(raw)) return raw as MonitorView
  return 'visao'
}

export default function LeadsMonitor() {
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const view = abaFromParam(params.get('aba'))
  const setView = (next: MonitorView) => {
    const p = new URLSearchParams(params)
    p.set('aba', next)
    setParams(p, { replace: true })
  }

  const {
    filtros,
    setFiltros,
    oportunidades,
    pesquisas,
    jobs,
    healthItems,
    dlqItems,
    logItems,
    auditItems,
    activeSearchRun,
    loading,
    buscando,
    erro,
    ultimoResultado,
    stats,
    monitorAuto,
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
    processRuns,
    activeProcessRun,
    iniciarImportacao,
    controlarProcesso,
    retentarErros,
    excluirProcessamento,
    rejeitar,
    removeOportunidade,
    empresaId,
    fontesItems,
    robotControl,
    setRobotControl,
  } = useLeadsMonitor()

  const { usuario } = useAuth()
  const [nomePesquisa, setNomePesquisa] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<FiltroLista>('todos')
  const [enviandoId, setEnviandoId] = useState<string | null>(null)
  const [peopleOp, setPeopleOp] = useState<OportunidadeMonitor | null>(null)
  const [segundosAuto, setSegundosAuto] = useState(Math.round(AUTO_REFRESH_MS / 1000))
  const [cepMsg, setCepMsg] = useState('')
  const [lgpdOp, setLgpdOp] = useState<OportunidadeMonitor | null>(null)
  const [parando, setParando] = useState(false)
  const [robotBusy, setRobotBusy] = useState<string | null>(null)

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
      if (filtroStatus === 'leads_quentes') return o.temperatura === 'Muito quente' || o.temperatura === 'Quente'
      if (filtroStatus === 'aprovado') return o.status === 'aprovado'
      return o.status === filtroStatus
    })
  }, [oportunidades, filtroStatus])

  const onBuscarManual = async () => {
    const r = await executarBusca()
    if (r) {
      toast.success('Busca manual iniciada', 'Pesquisa pontual · campanha automática não foi ativada')
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
      toast.success('Campanha salva', 'Auto permanece OFF. A busca manual não liga a campanha.')
      setView('campanhas')
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
        r.jaExistia ? 'Oportunidade vinculada ao cliente existente.' : 'Lead criado em Clientes · Pipeline Novo Lead.'
      )
    } catch (e: any) {
      toast.error('Falha ao enviar', e?.message)
    } finally {
      setEnviandoId(null)
    }
  }

  const onPesquisarPessoas = async (op: OportunidadeMonitor) => {
    try {
      await iniciarPesquisaPessoas(op)
      setPeopleOp(op)
    } catch (e: any) {
      toast.error('Não foi possível pesquisar pessoas', e?.message)
    }
  }

  const onRodarCampanha = async (p: PesquisaSalva) => {
    carregarPesquisa(p)
    const r = await executarBusca(
      {
        cidade: p.cidade,
        estado: p.estado,
        segmento: p.segmento,
        palavraChave: p.palavraChave,
        bairro: p.bairro,
        cep: p.cep,
        cidadesSelecionadas: p.cidadesSelecionadas,
        abrangenciaGeografica: p.abrangenciaGeografica,
        operacao: p.operacao,
        produtos: p.produtos,
        contextosSegmento: p.contextosSegmento,
        cargos: p.cargos,
        fontesHabilitadas: p.fontesHabilitadas || [],
        scoreMinimo: p.scoreMinimo,
        maxResultsPerCycle: p.limitePorCiclo || p.maxResultsPerCycle,
      },
      p.id
    )
    if (r) {
      toast.success('Campanha enfileirada', `Fontes: ${(p.fontesHabilitadas || []).join(', ') || 'todas as executáveis'}`)
      setView('robos')
    }
  }

  const searchLive =
    activeSearchRun?.status === 'running' ||
    (Boolean(activeSearchRun?.id) && activeSearchRun?.status === 'queued')
  const searchRunning = Boolean(searchLive)
  const robotLogs = [...(auditItems || []), ...(logItems || [])] as Array<Record<string, unknown> & { id: string }>
  const robotsAtivos = activeProcessRun?.status === 'processando' ? 1 : 0

  return (
    <div className="leads-monitor-shell space-y-6">
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
            Central de prospecção · campanha → fontes → fila → robô · CRM só recebe aprovados
          </p>
        </div>
        <div
          className={`flex items-center gap-2 text-xs rounded-xl px-3 py-2 border ${
            pesquisasAtivas > 0 && monitorAuto.ativo
              ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
              : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-500'
          }`}
        >
          {pesquisasAtivas > 0 && monitorAuto.ativo ? <Info className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
          {pesquisasAtivas > 0 && monitorAuto.ativo
            ? `${pesquisasAtivas} campanha(s) auto · próximo ciclo ~${segundosAuto}s`
            : 'Auto-busca desligada'}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {ABAS_PRINCIPAIS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setView(id)}
            className={`text-xs font-semibold px-3 py-2 rounded-xl border ${
              view === id
                ? 'bg-nexus-orange text-white border-nexus-orange'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] uppercase tracking-wide text-slate-500">Mais ferramentas</span>
        {ABAS_SECUNDARIAS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setView(id)}
            className={`text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border ${
              view === id
                ? 'bg-slate-700 text-white border-slate-600'
                : 'bg-transparent border-slate-700 text-slate-400'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <RobotPanel
        run={activeProcessRun}
        logs={robotLogs}
        starting={buscando}
        stopping={parando}
        onStart={() => void onBuscarManual()}
        onPause={() => activeProcessRun && void controlarProcesso(activeProcessRun, 'pausado')}
        onResume={() => activeProcessRun && void controlarProcesso(activeProcessRun, 'processando')}
        onCancel={async () => {
          if (!activeProcessRun) return
          setParando(true)
          try {
            await controlarProcesso(activeProcessRun, 'cancelado')
          } finally {
            setParando(false)
          }
        }}
        onRetryErrors={() => activeProcessRun && void retentarErros(activeProcessRun)}
      />

      {view === 'visao' && (
        <MonitorOverview
          online={Boolean(empresaId)}
          robotsAtivos={robotsAtivos}
          robotsTotal={5}
          campanhasAtivas={pesquisasAtivas}
          campanhasPausadas={pesquisas.filter((p) => !p.ativa).length}
          stats={stats}
          ultimoResultado={ultimoResultado}
          run={activeProcessRun}
          pesquisas={pesquisas}
        />
      )}

      {view === 'campanhas' && (
        <CampaignsPanel
          pesquisas={pesquisas}
          oportunidades={oportunidades}
          buscando={buscando}
          onNova={() => {
            setNomePesquisa('')
            setView('busca')
          }}
          onEdit={(p) => {
            carregarPesquisa(p)
            setNomePesquisa(p.nome)
            toast.info('Campanha carregada na busca', p.nome)
            setView('busca')
          }}
          onToggleAuto={(p) =>
            updatePesquisa(p.id, { ativa: !p.ativa }, p).then(() => toast.info(p.ativa ? 'Auto OFF' : 'Auto ON', p.nome))
          }
          onRun={(p) => void onRodarCampanha(p)}
          onRemove={(p) => removePesquisa(p.id, p).then(() => toast.info('Campanha removida'))}
          onUpdateFontes={(p, fontesHabilitadas) => void updatePesquisa(p.id, { fontesHabilitadas }, p)}
          onSalvarCrm={async (p) => {
            if (!empresaId) return
            try {
              const r = await salvarCampanhaNoCrm({ empresaId, pesquisa: p, oportunidades })
              toast.success(
                'Campanha no CRM',
                `Encontrados ${r.counts.encontrados} · WhatsApp ${r.counts.comWhatsApp} · ERP: ${r.erpSyncStatus}`
              )
            } catch (e: any) {
              toast.error('Não foi possível salvar a campanha', e?.message)
            }
          }}
          onExportExcel={(p) =>
            exportarCampanhaExcel(
              oportunidades.filter((o) => !p.id || o.pesquisaId === p.id || !o.pesquisaId),
              p,
              peopleItems
            )
          }
          onExportCsv={(p) =>
            exportarCampanhaCsv(
              oportunidades.filter((o) => !p.id || o.pesquisaId === p.id || !o.pesquisaId),
              p,
              peopleItems
            )
          }
          onSyncErp={async (p) => {
            if (!empresaId) return
            try {
              const saved = await salvarCampanhaNoCrm({ empresaId, pesquisa: p, oportunidades })
              const sync = await sincronizarCampanhaNxErp({
                empresaId,
                campaignDocId: saved.campaignId,
                pesquisa: p,
                oportunidades,
                people: peopleItems,
              })
              toast.info('NX ERP', sync.message)
            } catch (e: any) {
              toast.error('Falha na sincronização ERP', e?.message)
            }
          }}
        />
      )}

      {view === 'robos' && (
        <>
          <LoteParaDigitacao />
          <RobotCenter
          run={activeProcessRun}
          processRuns={processRuns || []}
          jobs={(jobs || []) as Array<Record<string, unknown> & { id: string }>}
          people={peopleItems}
          oportunidades={oportunidades}
          pesquisas={pesquisas}
          logs={robotLogs}
          audit={(auditItems || []) as Array<Record<string, unknown> & { id: string }>}
          control={robotControl}
          busyKey={robotBusy as 'search' | 'enrichment' | 'classification' | 'crm' | 'followup' | null}
          onControl={(key, intent) => {
            setRobotBusy(key)
            void setRobotControl(key, intent)
              .then(() => toast.info(intent === 'paused' ? 'Robô pausado' : 'Robô retomado'))
              .catch((e: { message?: string }) => toast.error('Controle do robô', e?.message))
              .finally(() => setRobotBusy(null))
          }}
          onRerunSearch={() => void onBuscarManual()}
          onRetry={() => activeProcessRun && void retentarErros(activeProcessRun)}
          onOpenFila={() => { window.location.assign('/whatsapp?fila=novos') }}
          onOpenLogs={() => setView('logs')}
          onOpenLeads={() => { window.location.assign('/whatsapp') }}
          onOpenPessoas={() => setView('pessoas')}
          onConfigureFollowup={() => setView('fontes')}
        />
        </>
      )}

      {view === 'busca' && (
        <ManualSearch
          filtros={filtros}
          onChange={setFiltros}
          cepMsg={cepMsg}
          onCepMsg={setCepMsg}
          buscando={buscando}
          searchRunning={searchRunning}
          searchStatus={activeSearchRun?.status}
          progresso={activeSearchRun?.progresso}
          erro={erro}
          nomeCampanha={nomePesquisa}
          onNomeCampanha={setNomePesquisa}
          onBuscar={() => void onBuscarManual()}
          onCancelar={() => void onCancelar()}
          onSalvarCampanha={() => void onSalvar()}
          ultimoResultado={ultimoResultado}
          onVerLeads={() => { window.location.assign('/whatsapp') }}
          onVerPessoas={() => setView('pessoas')}
        />
      )}

      {view === 'leads' && (
        <LeadResults
          lista={lista}
          loading={loading}
          filtroStatus={filtroStatus}
          onFiltro={setFiltroStatus}
          pesquisas={pesquisas}
          enviandoId={enviandoId}
          onAprovar={(op) => void onAprovar(op)}
          onRejeitar={(op) => rejeitar(op).then(() => toast.info('Oportunidade rejeitada'))}
          onRemove={(op) => removeOportunidade(op.id, op).then(() => toast.info('Removido do monitor'))}
          onPessoas={(op) => void onPesquisarPessoas(op)}
          onLgpd={setLgpdOp}
        />
      )}

      {view === 'fila' && <QueuePanel run={activeProcessRun} pesquisas={pesquisas} />}

      {view === 'fontes' && (
        <div className="space-y-4">
          <div
            className="rounded-xl p-4 border text-sm text-slate-300"
            style={{ background: 'var(--code-surface)', borderColor: 'var(--code-border)' }}
          >
            <div className="font-semibold text-white mb-1">Fontes de captura</div>
            <p className="text-xs text-slate-400">
              OpenStreetMap, Google Places, CSV, Webhook e API externa. A campanha filtra via fontesHabilitadas. IBGE e
              ViaCEP são referência geográfica, não captura de leads.
            </p>
          </div>
          <FontesHub />
          <FontesPesquisaGovernanca fontes={(fontesItems || []) as FontePesquisa[]} />
          <FontesEnrichmentPanel />
          <IntegrationsAdminPanel
            empresaId={empresaId}
            healthItems={healthItems || []}
            dlqItems={dlqItems || []}
            actor={{ usuarioId: usuario?.id, usuarioNome: usuario?.nome }}
          />
        </div>
      )}

      {view === 'logs' && <LogsPanel items={robotLogs} />}

      {view === 'lgpd' && <LgpdOperacaoPanel />}

      {view === 'importar' && (
        <ImportBasePanel
          busy={buscando}
          onStart={async (payload) => {
            try {
              await iniciarImportacao(payload)
              setView('processamentos')
              toast.success('Processamento iniciado', 'O robô está tratando a base em background.')
            } catch (e: any) {
              toast.error('Falha na importação', e?.message)
            }
          }}
        />
      )}

      {view === 'processamentos' && (
        <SavedProcessingsPanel
          runs={processRuns || []}
          onOpen={() => setView('leads')}
          onResume={(run) => void controlarProcesso(run, 'processando')}
          onExport={() =>
            downloadBaseCompleta({
              empresas: oportunidades,
              pessoas: peopleItems,
              processRuns: processRuns || [],
            })
          }
          onDelete={(run) => void excluirProcessamento(run)}
        />
      )}

      {view === 'pessoas' && (
        <PeoplePanel
          people={peopleItems}
          companies={oportunidades}
          empresaId={empresaId || ''}
          actor={{ usuarioId: usuario?.id, usuarioNome: usuario?.nome }}
          onAprovarEmpresa={(company) => void onAprovar(company)}
          onAddCrm={async (p, company) => {
            try {
              const r = await adicionarPessoaAoCrm(p, company)
              toast.success(r.jaExistia ? 'Já existia no CRM' : 'Pessoa enviada ao CRM')
            } catch (e: any) {
              toast.error('Falha CRM', e?.message)
            }
          }}
          onToast={(kind, title, msg) => {
            if (kind === 'success') toast.success(title, msg)
            else if (kind === 'error') toast.error(title, msg)
            else toast.info(title, msg)
          }}
        />
      )}

      {jobs?.length > 0 && view === 'visao' ? (
        <p className="text-xs text-slate-500">
          Fila de jobs: {jobs.filter((j: { status?: string }) => j.status === 'queued' || j.status === 'running' || j.status === 'leased').length} ativos
        </p>
      ) : null}

      {peopleOp ? (
        <PesquisarPessoasModal
          company={peopleOp}
          run={peopleRuns.find((r) => r.id === peopleOp.id || r.opportunityId === peopleOp.id) || null}
          people={peopleItems.filter((p) => p.opportunityId === peopleOp.id)}
          onClose={() => setPeopleOp(null)}
          onIgnore={async (p) => {
            await ignorarPessoa(p)
            toast.info('Pessoa ignorada')
          }}
          onAddCrm={async (p) => {
            try {
              const r = await adicionarPessoaAoCrm(p, peopleOp)
              toast.success(
                r.jaExistia ? 'Já existia no CRM' : 'Pessoa adicionada ao CRM',
                r.jaExistia ? 'Registro vinculado.' : 'Criada em Clientes · Pipeline Novo Lead.'
              )
            } catch (e: any) {
              toast.error('Falha ao enviar pessoa', e?.message)
            }
          }}
        />
      ) : null}
      {lgpdOp ? (
        <NexusModal title="LGPD — Governança de Dados" onClose={() => setLgpdOp(null)} cancelLabel="Fechar">
          <LgpdGovernancaBlock record={lgpdOp as unknown as Record<string, unknown>} />
        </NexusModal>
      ) : null}
    </div>
  )
}

import { formatMonitorTime } from '../utils/datetime'
import { produtoLabel } from '../catalog/produtosMonitor'
import type { OportunidadeMonitor, PesquisaSalva } from '../types'
import type { ProcessRun } from '../types/processRun'
import type { CompanyPeopleResearch } from '../types/peopleResearch'
import {
  DEFAULT_ROBOT_CONTROL,
  ROBOT_CONTROL_KEYS,
  ROBOT_LABEL,
  type RobotControlKey,
  type RobotControlState,
  type RobotIntent,
} from './robotControl'

export type RobotUiMode = 'running' | 'paused' | 'idle' | 'error' | 'completed' | 'prepared'

export interface RobotCardModel {
  key: RobotControlKey
  label: string
  emoji: string
  intent: RobotIntent
  mode: RobotUiMode
  modeLabel: string
  tarefa: string
  fila: number
  progress: number
  encontrados: number
  novos: number
  duplicados: number
  erros: number
  processadosHoje: number
  concluidos: number
  parciais: number
  ultimaExecucao: string
  fontes: string[]
  primaryAction: 'pause' | 'resume' | 'rerun' | 'retry' | 'configure' | null
}

export interface RobotActivityItem {
  id: string
  at: number
  hora: string
  key: RobotControlKey
  text: string
}

export interface RobotOpsView {
  cards: RobotCardModel[]
  working: number
  paused: number
  waiting: number
  errors: number
  jobsAtivos: number
  filaTotal: number
  errosTotal: number
  activity: RobotActivityItem[]
}

const EMOJI: Record<RobotControlKey, string> = {
  search: '🔎',
  enrichment: '🧠',
  classification: '🎯',
  crm: '🔗',
  followup: '🔁',
}

function ts(v: unknown): number {
  if (!v) return 0
  if (typeof v === 'number') return v < 1e12 ? v * 1000 : v
  if (typeof v === 'object' && v && 'toMillis' in v && typeof (v as { toMillis: () => number }).toMillis === 'function') {
    return (v as { toMillis: () => number }).toMillis()
  }
  if (typeof v === 'object' && v && 'seconds' in v) return Number((v as { seconds: number }).seconds) * 1000
  const d = new Date(String(v))
  return Number.isNaN(d.getTime()) ? 0 : d.getTime()
}

function todayStart() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function rec(p: object): Record<string, unknown> {
  return p as Record<string, unknown>
}

function jobTypeKey(type: string): RobotControlKey | null {
  if (['search', 'search_inteligente', 'search_cancel', 'import_csv', 'people_search', 'drain_inbox'].includes(type)) {
    return 'search'
  }
  if (type === 'base_process') return 'search'
  return null
}

function mapActivityToKey(action: string, message: string): RobotControlKey {
  const t = `${action} ${message}`.toLowerCase()
  if (/enriq|personlead|pessoa/.test(t)) return 'enrichment'
  if (/classif|score|qualif/.test(t)) return 'classification'
  if (/crm|aprov/.test(t)) return 'crm'
  if (/follow/.test(t)) return 'followup'
  if (/robot\.pause|robot\.resume/.test(t)) {
    if (/enriquec/.test(t)) return 'enrichment'
    if (/classif/.test(t)) return 'classification'
    if (/\bcrm\b/.test(t)) return 'crm'
    if (/follow/.test(t)) return 'followup'
  }
  return 'search'
}

export function buildRobotOpsView(input: {
  control: RobotControlState | null
  processRun: ProcessRun | null
  processRuns: ProcessRun[]
  jobs: Array<Record<string, unknown> & { id: string }>
  people: Array<CompanyPeopleResearch & Record<string, unknown>>
  oportunidades: OportunidadeMonitor[]
  pesquisas: PesquisaSalva[]
  logs: Array<Record<string, unknown> & { id: string }>
  audit: Array<Record<string, unknown> & { id: string }>
}): RobotOpsView {
  const control = input.control || DEFAULT_ROBOT_CONTROL
  const run = input.processRun
  const jobs = input.jobs || []
  const people = input.people || []
  const opps = input.oportunidades || []
  const start = todayStart()

  const jobsAtivos = jobs.filter((j) => ['queued', 'leased', 'running'].includes(String(j.status || ''))).length
  const searchQueued = jobs.filter((j) => {
    const st = String(j.status || '')
    const key = jobTypeKey(String(j.type || ''))
    return key === 'search' && (st === 'queued' || st === 'leased')
  }).length
  const searchRunning = jobs.some((j) => jobTypeKey(String(j.type || '')) === 'search' && String(j.status) === 'running')
    || run?.tipo === 'busca' && (run.status === 'processando' || run.status === 'aguardando')
  const searchErrors = Number(run?.erros || 0) + jobs.filter((j) => jobTypeKey(String(j.type || '')) === 'search' && (j.status === 'failed' || j.status === 'dead')).length

  const enrichPending = people.filter((p) => {
    const pipe = String(rec(p).pipelineStatus || '')
    const enr = String(rec(p).enrichmentStatus || '')
    return ['aguardando_enriquecimento', 'enriquecendo'].includes(pipe) || enr === 'QUEUED' || enr === 'RUNNING'
  })
  const enrichDone = people.filter((p) => {
    const pipe = String(rec(p).pipelineStatus || '')
    return pipe === 'enriquecido' || pipe === 'pronto_atendimento' || pipe === 'aguardando_validacao'
  })
  const enrichPartial = people.filter((p) => String(rec(p).pipelineStatus || '') === 'enriquecimento_parcial')
  const enrichErr = people.filter((p) => String(rec(p).pipelineStatus || '') === 'erro_enriquecimento')
  const enrichToday = people.filter((p) => ts(p.updatedAt || rec(p).enrichedAt) >= start).length

  const classPending = opps.filter((o) => !o.classificacao || o.classificacao === 'aguardando_classificacao' || (o.status === 'novo' && (o.score == null || Number(o.score) === 0 && String(o.classificacao || '') === 'aguardando_classificacao'))).length
    + people.filter((p) => String(rec(p).pipelineStatus || '') === 'aguardando_validacao').length
  const classToday = opps.filter((o) => ts(o.atualizadoEm || o.criadoEm) >= start && o.classificacao && o.classificacao !== 'aguardando_classificacao').length

  const crmQueue = opps.filter((o) => o.status === 'aprovado').length
    + people.filter((p) => {
      const pipe = String(rec(p).pipelineStatus || '')
      const at = String(rec(p).atendimentoStatus || '')
      return pipe === 'pronto_atendimento' && at !== 'na_fila' && at !== 'em_atendimento'
    }).length
  const crmSentToday = opps.filter((o) => o.status === 'enviado_crm' && ts(o.atualizadoEm) >= start).length

  const cidade = [run?.geoBairro, run?.cidadeAtual, run?.filtrosSnapshot?.cidade].filter(Boolean)[0]
  const uf = String(run?.filtrosSnapshot?.estado || '')
  const segmento = produtoLabel(String(run?.filtrosSnapshot?.operacao || run?.filtrosSnapshot?.segmento || '')) || 'leads'
  const searchTask = control.search === 'paused'
    ? 'Nenhuma'
    : searchRunning
    ? `Buscando ${String(run?.filtrosSnapshot?.palavraChave || segmento || 'leads')}${cidade ? ` em ${cidade}${uf ? ` - ${uf}` : ''}` : ''}`
    : 'Nenhuma'

  const enrichWorking = control.enrichment === 'running' && enrichPending.length > 0
  const enrichTask = control.enrichment === 'paused'
    ? 'Nenhuma'
    : enrichPending.length
      ? `Enriquecendo ${enrichPending.length} PersonLead`
      : 'Nenhuma'

  const classTask = control.classification === 'paused'
    ? 'Nenhuma'
    : classPending
      ? `Classificando leads da campanha ${segmento}`
      : 'Nenhuma'

  const crmTask = control.crm === 'paused'
    ? 'Nenhuma'
    : crmQueue
      ? 'Aguardando aprovação humana'
      : 'Nenhuma'

  function modeFor(key: RobotControlKey, working: boolean, hasError: boolean, completed: boolean): RobotUiMode {
    if (key === 'followup') return 'prepared'
    if (control[key] === 'paused') return 'paused'
    if (hasError && !working) return 'error'
    if (working) return 'running'
    if (completed) return 'completed'
    return 'idle'
  }

  const MODE_LABEL: Record<RobotUiMode, string> = {
    running: 'Executando',
    paused: 'Pausado',
    idle: 'Aguardando',
    error: 'Erro',
    completed: 'Finalizado',
    prepared: 'Parado',
  }

  const searchCompleted = Boolean(run && (run.status === 'concluido' || run.status === 'concluido_com_erros') && !searchRunning)
  const searchMode = modeFor('search', Boolean(searchRunning), searchErrors > 0 && !searchRunning, searchCompleted)
  const enrichMode = modeFor('enrichment', enrichWorking, enrichErr.length > 0 && enrichPending.length === 0, enrichPending.length === 0 && enrichDone.length > 0)
  const classWorking = control.classification === 'running' && classPending > 0
  const classMode = modeFor('classification', classWorking, false, !classPending && opps.length > 0)
  const crmMode = modeFor('crm', crmQueue > 0 && control.crm === 'running', false, false)

  function primary(mode: RobotUiMode, key: RobotControlKey): RobotCardModel['primaryAction'] {
    if (key === 'followup') return 'configure'
    if (mode === 'paused') return 'resume'
    if (mode === 'completed') return 'rerun'
    if (mode === 'error') return 'retry'
    if (mode === 'running' || mode === 'idle') return 'pause'
    return 'pause'
  }

  const lastSearch = run?.updatedAt || run?.completedAt || run?.startedAt
  const lastPerson = people.reduce((acc, p) => Math.max(acc, ts(p.updatedAt)), 0)
  const lastOpp = opps.reduce((acc, o) => Math.max(acc, ts(o.atualizadoEm || o.criadoEm)), 0)

  const cards: RobotCardModel[] = [
    {
      key: 'search',
      label: ROBOT_LABEL.search,
      emoji: EMOJI.search,
      intent: control.search,
      mode: searchMode,
      modeLabel: MODE_LABEL[searchMode],
      tarefa: searchTask,
      fila: searchQueued + (input.pesquisas || []).filter((p) => p.ativa).length,
      progress: Number(run?.progresso || 0),
      encontrados: Number(run?.validos || 0),
      novos: Number(run?.processados || 0),
      duplicados: Number(run?.duplicados || 0),
      erros: searchErrors,
      processadosHoje: Number(run?.processados || 0),
      concluidos: Number(run?.validos || 0),
      parciais: 0,
      ultimaExecucao: formatMonitorTime(lastSearch) || '—',
      fontes: [],
      primaryAction: primary(searchMode, 'search'),
    },
    {
      key: 'enrichment',
      label: ROBOT_LABEL.enrichment,
      emoji: EMOJI.enrichment,
      intent: control.enrichment,
      mode: enrichMode,
      modeLabel: MODE_LABEL[enrichMode],
      tarefa: enrichTask,
      fila: enrichPending.length,
      progress: people.length ? Math.round(((enrichDone.length + enrichPartial.length) / people.length) * 100) : 0,
      encontrados: people.length,
      novos: enrichPending.length,
      duplicados: 0,
      erros: enrichErr.length,
      processadosHoje: enrichToday,
      concluidos: enrichDone.length,
      parciais: enrichPartial.length,
      ultimaExecucao: lastPerson ? formatMonitorTime(lastPerson) : '—',
      fontes: ['BrasilAPI', 'OSM', 'Outras APIs configuradas'],
      primaryAction: primary(enrichMode, 'enrichment'),
    },
    {
      key: 'classification',
      label: ROBOT_LABEL.classification,
      emoji: EMOJI.classification,
      intent: control.classification,
      mode: classMode,
      modeLabel: MODE_LABEL[classMode],
      tarefa: classTask,
      fila: classPending,
      progress: opps.length ? Math.round(((opps.length - classPending) / Math.max(opps.length, 1)) * 100) : 0,
      encontrados: opps.length,
      novos: classPending,
      duplicados: 0,
      erros: 0,
      processadosHoje: classToday,
      concluidos: Math.max(0, opps.length - classPending),
      parciais: 0,
      ultimaExecucao: lastOpp ? formatMonitorTime(lastOpp) : '—',
      fontes: [],
      primaryAction: primary(classMode, 'classification'),
    },
    {
      key: 'crm',
      label: ROBOT_LABEL.crm,
      emoji: EMOJI.crm,
      intent: control.crm,
      mode: crmMode,
      modeLabel: MODE_LABEL[crmMode],
      tarefa: crmTask,
      fila: crmQueue,
      progress: 0,
      encontrados: crmQueue,
      novos: crmQueue,
      duplicados: 0,
      erros: 0,
      processadosHoje: crmSentToday,
      concluidos: crmSentToday,
      parciais: 0,
      ultimaExecucao: lastOpp ? formatMonitorTime(lastOpp) : '—',
      fontes: [],
      primaryAction: primary(crmMode, 'crm'),
    },
    {
      key: 'followup',
      label: ROBOT_LABEL.followup,
      emoji: EMOJI.followup,
      intent: control.followup,
      mode: 'prepared',
      modeLabel: 'Preparado',
      tarefa: 'Nenhuma automação configurada',
      fila: 0,
      progress: 0,
      encontrados: 0,
      novos: 0,
      duplicados: 0,
      erros: 0,
      processadosHoje: 0,
      concluidos: 0,
      parciais: 0,
      ultimaExecucao: '—',
      fontes: [],
      primaryAction: 'configure',
    },
  ]

  const activitySrc = [...(input.audit || []), ...(input.logs || [])]
    .map((item) => {
      const at = ts(item.criadoEm || item.createdAt || item.at || item.em)
      const action = String(item.action || '')
      const message = String(item.message || item.acao || '')
      const text = (message || action).slice(0, 140)
      if (!text) return null
      return {
        id: item.id,
        at,
        hora: formatMonitorTime(at) || '',
        key: mapActivityToKey(action, message),
        text,
      } satisfies RobotActivityItem
    })
    .filter((x): x is RobotActivityItem => Boolean(x && x.at))
    .sort((a, b) => b.at - a.at)
    .slice(0, 8)

  const working = cards.filter((c) => c.mode === 'running').length
  const paused = cards.filter((c) => c.mode === 'paused').length
  const waiting = cards.filter((c) => c.mode === 'idle' || c.mode === 'prepared').length
  const errors = cards.filter((c) => c.mode === 'error').length
  const filaTotal = cards.reduce((s, c) => s + c.fila, 0)
  const errosTotal = cards.reduce((s, c) => s + c.erros, 0)

  return {
    cards,
    working,
    paused,
    waiting,
    errors,
    jobsAtivos,
    filaTotal,
    errosTotal,
    activity: activitySrc,
  }
}

export function formatRobotAiLines(view: RobotOpsView): string[] {
  return ROBOT_CONTROL_KEYS.map((key) => {
    const c = view.cards.find((x) => x.key === key)
    if (!c) return `${ROBOT_LABEL[key]}`
    const tarefa = c.tarefa && c.tarefa !== 'Nenhuma' ? ` — ${c.tarefa}` : ''
    const mark = c.mode === 'running' ? '●' : c.mode === 'paused' ? '⏸' : c.mode === 'prepared' ? '○' : c.mode === 'error' ? '🔴' : '○'
    return `${c.emoji} ${c.label.replace('Robô de ', '').replace('Robô ', '')}\n${mark} ${c.modeLabel}${tarefa}`
  })
}

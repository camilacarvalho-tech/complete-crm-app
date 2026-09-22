import { useMemo, useState } from 'react'
import type { OportunidadeMonitor, PesquisaSalva } from '../types'
import type { ProcessRun } from '../types/processRun'
import type { CompanyPeopleResearch } from '../types/peopleResearch'
import { DEFAULT_ROBOT_CONTROL, type RobotControlKey, type RobotControlState } from '../services/robotControl'
import { buildRobotOpsView, type RobotCardModel, type RobotUiMode } from '../services/robotSnapshot'

const DOT: Record<RobotUiMode, string> = {
  running: '#22c55e',
  paused: '#f59e0b',
  idle: '#64748b',
  error: '#f87171',
  completed: '#86efac',
  prepared: '#94a3b8',
}

type FiltroRobos = 'todos' | 'running' | 'paused' | 'idle' | 'error'

export function RobotCenter(props: {
  run: ProcessRun | null
  processRuns: ProcessRun[]
  jobs: Array<Record<string, unknown> & { id: string }>
  people: CompanyPeopleResearch[]
  oportunidades: OportunidadeMonitor[]
  pesquisas: PesquisaSalva[]
  logs: Array<Record<string, unknown> & { id: string }>
  audit: Array<Record<string, unknown> & { id: string }>
  control: RobotControlState | null
  busyKey?: RobotControlKey | null
  onControl: (key: RobotControlKey, intent: 'paused' | 'running') => void
  onRerunSearch: () => void
  onRetry: () => void
  onOpenFila: () => void
  onOpenLogs: () => void
  onOpenLeads: () => void
  onOpenPessoas: () => void
  onConfigureFollowup: () => void
}) {
  const [filtro, setFiltro] = useState<FiltroRobos>('todos')
  const [detalhe, setDetalhe] = useState<RobotControlKey | null>(null)
  const view = useMemo(
    () =>
      buildRobotOpsView({
        control: props.control || DEFAULT_ROBOT_CONTROL,
        processRun: props.run,
        processRuns: props.processRuns,
        jobs: props.jobs,
        people: props.people as Array<CompanyPeopleResearch & Record<string, unknown>>,
        oportunidades: props.oportunidades,
        pesquisas: props.pesquisas,
        logs: props.logs,
        audit: props.audit,
      }),
    [props.control, props.run, props.processRuns, props.jobs, props.people, props.oportunidades, props.pesquisas, props.logs, props.audit]
  )
  const cards = view.cards.filter((c) => {
    if (filtro === 'todos') return true
    if (filtro === 'idle') return c.mode === 'idle' || c.mode === 'prepared'
    return c.mode === filtro
  })
  const selected = view.cards.find((c) => c.key === detalhe) || null

  return (
    <div className="space-y-3">
      <div
        className="rounded-xl px-4 py-3 border"
        style={{ background: 'var(--code-surface)', borderColor: 'var(--code-border)' }}
      >
        <h2 className="text-base font-semibold text-white">🤖 Central de robôs</h2>
        <p className="text-[12px] text-slate-400 mt-1">
          5 robôs · {view.working} trabalhando · {view.paused} pausados · {view.waiting} aguardando
          {view.errors ? ` · ${view.errors} com erro` : ''}
        </p>
        <p className="text-[11px] text-slate-500 mt-1">
          Jobs ativos: {view.jobsAtivos} · Fila total: {view.filaTotal} · Erros: {view.errosTotal}
        </p>
        <p className="text-[10px] text-slate-500 mt-2">
          🔎 Busca → 🧠 Enriquecimento → 🎯 Classificação → 🔗 CRM → 💬 Atendimento
          <span className="text-slate-600"> · pausar um não para os outros</span>
        </p>
      </div>

      <div className="flex flex-wrap gap-1">
        {(
          [
            ['todos', 'Todos'],
            ['running', 'Trabalhando'],
            ['paused', 'Pausados'],
            ['idle', 'Aguardando'],
            ['error', 'Erro'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFiltro(id)}
            className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border ${
              filtro === id ? 'bg-nexus-orange text-white border-nexus-orange' : 'text-slate-300'
            }`}
            style={filtro === id ? undefined : { borderColor: 'var(--code-border)' }}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 gap-2.5">
        {cards.map((card) => (
          <RobotCard
            key={card.key}
            card={card}
            busy={props.busyKey === card.key}
            onPrimary={() => {
              if (card.primaryAction === 'pause') props.onControl(card.key, 'paused')
              else if (card.primaryAction === 'resume') props.onControl(card.key, 'running')
              else if (card.primaryAction === 'rerun') props.onRerunSearch()
              else if (card.primaryAction === 'retry') props.onRetry()
              else if (card.primaryAction === 'configure') props.onConfigureFollowup()
            }}
            onDetails={() => setDetalhe(card.key)}
          />
        ))}
      </div>
      {cards.length === 0 ? <p className="text-xs text-slate-500">Nenhum robô neste filtro.</p> : null}

      <div
        className="rounded-xl px-4 py-3 border"
        style={{ background: 'var(--code-surface)', borderColor: 'var(--code-border)' }}
      >
        <h3 className="text-[11px] font-semibold tracking-wide uppercase text-slate-400">Atividade recente</h3>
        <div className="mt-2 space-y-1.5">
          {view.activity.length === 0 ? (
            <p className="text-[12px] text-slate-500">Sem eventos reais ainda.</p>
          ) : (
            view.activity.map((ev) => {
              const c = view.cards.find((x) => x.key === ev.key)
              return (
                <div key={ev.id} className="text-[12px] leading-snug">
                  <span className="tabular-nums text-slate-500">{ev.hora}</span>
                  <span className="text-slate-300">  {c?.emoji || '•'} {c?.label || ev.key}</span>
                  <p className="text-slate-400 pl-[3.25rem]">{ev.text}</p>
                </div>
              )
            })
          )}
        </div>
      </div>

      {selected ? (
        <div className="fixed inset-0 z-40 flex justify-end" role="dialog">
          <button type="button" className="flex-1 bg-black/50" aria-label="Fechar" onClick={() => setDetalhe(null)} />
          <aside className="w-full max-w-sm h-full overflow-y-auto p-4 space-y-3" style={{ background: 'var(--code-surface)', borderLeft: '1px solid var(--code-border)' }}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-white">{selected.emoji} {selected.label}</p>
                <p className="text-[12px] mt-1" style={{ color: DOT[selected.mode] }}>● {selected.modeLabel}</p>
              </div>
              <button type="button" className="text-xs text-slate-400" onClick={() => setDetalhe(null)}>Fechar</button>
            </div>
            <Field label="Tarefa atual" value={selected.tarefa} />
            <Field label="Fila" value={String(selected.fila)} />
            <Field label="Processados hoje" value={String(selected.processadosHoje)} />
            <Field label="Concluídos" value={String(selected.concluidos)} />
            <Field label="Parciais" value={String(selected.parciais)} />
            <Field label="Erros" value={String(selected.erros)} />
            <Field label="Última execução" value={selected.ultimaExecucao} />
            {selected.fontes.length ? <Field label="Fontes ativas" value={selected.fontes.join('\n')} /> : null}
            <div className="flex flex-wrap gap-2 pt-2">
              {selected.primaryAction === 'pause' ? (
                <button type="button" className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-700 text-white" onClick={() => props.onControl(selected.key, 'paused')}>Pausar robô</button>
              ) : null}
              {selected.primaryAction === 'resume' ? (
                <button type="button" className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-nexus-orange text-white" onClick={() => props.onControl(selected.key, 'running')}>Retomar</button>
              ) : null}
              <button type="button" className="text-xs font-semibold px-3 py-1.5 rounded-lg border text-slate-200" style={{ borderColor: 'var(--code-border)' }} onClick={() => { selected.key === 'enrichment' || selected.key === 'followup' ? props.onOpenPessoas() : selected.key === 'search' ? props.onOpenFila() : props.onOpenLeads(); setDetalhe(null) }}>Ver fila</button>
              <button type="button" className="text-xs font-semibold px-3 py-1.5 rounded-lg border text-slate-200" style={{ borderColor: 'var(--code-border)' }} onClick={() => { props.onOpenLogs(); setDetalhe(null) }}>Ver logs</button>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-[12px] text-slate-200 whitespace-pre-line mt-0.5">{value || '—'}</p>
    </div>
  )
}

function RobotCard(props: { card: RobotCardModel; busy?: boolean; onPrimary: () => void; onDetails: () => void }) {
  const c = props.card
  const primaryLabel =
    c.primaryAction === 'pause'
      ? 'Pausar'
      : c.primaryAction === 'resume'
        ? 'Retomar'
        : c.primaryAction === 'rerun'
          ? 'Executar novamente'
          : c.primaryAction === 'retry'
            ? 'Reprocessar'
            : 'Configurar'
  return (
    <div className="rounded-xl px-3 py-2.5 border min-w-0" style={{ background: 'var(--code-surface)', borderColor: 'var(--code-border)' }}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[12px] font-semibold text-white leading-tight">{c.emoji} {c.label.replace('Robô de ', '').replace('Robô ', '').toUpperCase()}</p>
        <span className="text-[10px] font-semibold shrink-0" style={{ color: DOT[c.mode] }}>● {c.modeLabel.toUpperCase()}</span>
      </div>
      <p className="text-[10px] text-slate-500 mt-2">Tarefa atual</p>
      <p className="text-[12px] text-slate-200 leading-snug min-h-[2.2em]">{c.tarefa}</p>
      {c.mode !== 'prepared' ? (
        <>
          <div className="flex items-center justify-between mt-2">
            <span className="text-[10px] text-slate-500">Progresso</span>
            <span className="text-[11px] tabular-nums text-slate-300">{c.progress}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden mt-1">
            <div className="h-full bg-nexus-orange" style={{ width: `${Math.min(100, c.progress)}%` }} />
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 mt-2 text-[11px] text-slate-400">
            <span>Fila <b className="text-white tabular-nums">{c.fila}</b></span>
            <span>Erros <b className="text-white tabular-nums">{c.erros}</b></span>
            {c.key === 'search' ? (
              <>
                <span>Encontrados <b className="text-white tabular-nums">{c.encontrados}</b></span>
                <span>Novos <b className="text-white tabular-nums">{c.novos}</b></span>
                <span>Duplicados <b className="text-white tabular-nums">{c.duplicados}</b></span>
              </>
            ) : null}
          </div>
          <p className="text-[10px] text-slate-500 mt-1.5">Última execução: {c.ultimaExecucao}</p>
        </>
      ) : null}
      <div className="flex gap-1.5 mt-2">
        <button
          type="button"
          disabled={props.busy}
          onClick={props.onPrimary}
          className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-nexus-orange text-white disabled:opacity-50"
        >
          {primaryLabel}
        </button>
        <button type="button" onClick={props.onDetails} className="text-[11px] font-semibold px-2.5 py-1 rounded-lg border text-slate-200" style={{ borderColor: 'var(--code-border)' }}>
          Detalhes
        </button>
      </div>
    </div>
  )
}

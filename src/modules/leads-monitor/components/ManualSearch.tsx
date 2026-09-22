import { Play, RefreshCw, Save } from 'lucide-react'
import type { FiltrosPesquisa, MonitorRunResult, SearchRunProgresso, SearchRunStatus } from '../types'
import { produtoLabel } from '../catalog/produtosMonitor'
import { SearchFilters } from './SearchFilters'

const FONTE_LABEL: Record<string, string> = {
  openstreetmap: 'OpenStreetMap',
  osm: 'OpenStreetMap',
  google_places: 'Google Places',
  csv: 'CSV',
  webhook: 'Webhook',
  api_externa: 'API externa',
}

function fonteTexto(filtros: FiltrosPesquisa, resultado?: MonitorRunResult | null) {
  const ids = (filtros.fontesHabilitadas || []).filter(Boolean)
  if (ids.length) return ids.map((id) => FONTE_LABEL[id] || id).join(', ')
  const fromRun = (resultado?.fontes || []).map((f) => FONTE_LABEL[f] || f.replace(/^fonte:/, 'Fonte '))
  if (fromRun.length) return fromRun.join(', ')
  return 'Fontes da campanha'
}

function localTexto(filtros: FiltrosPesquisa) {
  const parts = [filtros.bairro, filtros.cidade, filtros.estado, filtros.cep].filter(Boolean)
  return parts.length ? parts.join(' · ') : '—'
}

function statusProcessamento(running: boolean, status?: SearchRunStatus) {
  if (running || status === 'queued' || status === 'running') return { label: 'Em andamento', done: false }
  if (status === 'paused') return { label: 'Pausado', done: false }
  if (status === 'cancelled') return { label: 'Cancelado', done: false }
  if (status === 'failed') return { label: 'Erro', done: false }
  if (status === 'succeeded') return { label: 'Concluído ✓', done: true }
  return { label: 'Concluído ✓', done: true }
}

export function ManualSearch(props: {
  filtros: FiltrosPesquisa
  onChange: (next: FiltrosPesquisa) => void
  cepMsg: string
  onCepMsg: (msg: string) => void
  buscando: boolean
  searchRunning: boolean
  searchStatus?: SearchRunStatus
  progresso?: SearchRunProgresso
  erro: string | null
  nomeCampanha: string
  onNomeCampanha: (v: string) => void
  onBuscar: () => void
  onCancelar: () => void
  onSalvarCampanha: () => void
  ultimoResultado?: MonitorRunResult | null
  onVerLeads: () => void
  onVerPessoas: () => void
}) {
  const showSummary = props.searchRunning || Boolean(props.ultimoResultado) || Boolean(props.searchStatus)
  const st = statusProcessamento(props.searchRunning, props.searchStatus)
  const encontrados = props.searchRunning
    ? Number(props.progresso?.encontrados || 0)
    : Number(props.ultimoResultado?.encontrados ?? props.progresso?.encontrados ?? 0)
  const novos = props.searchRunning
    ? Number(props.progresso?.novos || 0)
    : Number(props.ultimoResultado?.novos ?? props.progresso?.novos ?? 0)
  const duplicados = props.searchRunning
    ? Number(props.progresso?.duplicados || 0)
    : Number(props.ultimoResultado?.duplicados ?? props.progresso?.duplicados ?? 0)
  const finishedOk = !props.searchRunning && (props.searchStatus === 'succeeded' || Boolean(props.ultimoResultado))

  return (
    <div className="space-y-3">
      <div
        className="rounded-xl p-4 border space-y-3"
        style={{ background: 'var(--code-surface)', borderColor: 'var(--code-border)' }}
      >
        <div>
          <h2 className="text-base font-semibold text-white">🔎 Busca manual</h2>
          <p className="text-xs text-slate-400 mt-1">
            Pesquisa pontual. Este botão não ativa campanha automática e não liga o Auto ON.
          </p>
        </div>
        <SearchFilters
          filtros={props.filtros}
          onChange={props.onChange}
          cepMsg={props.cepMsg}
          onCepMsg={props.onCepMsg}
        />
        {props.searchRunning ? (
          <div className="rounded-xl border border-nexus-orange/30 px-4 py-3 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-slate-200">
                Busca em andamento · {props.progresso?.etapa || 'Processando'}
              </span>
              <span className="tabular-nums text-slate-500">
                {Number(props.progresso?.percent || 0)}% · {Number(props.progresso?.encontrados || 0)} encontrados
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-700 overflow-hidden">
              <div className="h-full bg-nexus-orange" style={{ width: `${Math.min(100, Number(props.progresso?.percent || 0))}%` }} />
            </div>
            <div className="flex justify-end">
              <button type="button" onClick={props.onCancelar} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-600 text-white">
                Cancelar busca
              </button>
            </div>
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2 items-center">
          <button
            type="button"
            disabled={props.buscando}
            onClick={props.onBuscar}
            className="px-4 py-2.5 bg-nexus-orange text-white rounded-lg flex items-center gap-2 text-sm font-semibold disabled:opacity-60"
          >
            {props.buscando ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {props.buscando ? 'Enfileirando…' : '🔎 Iniciar busca'}
          </button>
          <input
            value={props.nomeCampanha}
            onChange={(e) => props.onNomeCampanha(e.target.value)}
            placeholder="Nome da campanha (salvar, sem iniciar)"
            className="px-3 py-2.5 rounded-lg bg-slate-100 dark:bg-slate-700 dark:text-white text-sm min-w-[200px]"
          />
          <button
            type="button"
            onClick={props.onSalvarCampanha}
            className="px-4 py-2.5 bg-slate-700 text-white rounded-lg flex items-center gap-2 text-sm font-semibold"
          >
            <Save className="w-4 h-4" /> Salvar campanha
          </button>
        </div>
        {props.erro ? <p className="text-sm text-red-500">{props.erro}</p> : null}
      </div>

      {showSummary ? (
        <div
          className="rounded-xl px-4 py-3 border space-y-2"
          style={{ background: 'var(--code-surface)', borderColor: 'var(--code-border)' }}
        >
          <h3 className="text-[11px] font-semibold tracking-wide uppercase text-slate-400">Processamento</h3>
          <p className="text-sm text-white">
            Status: <span className={st.done ? 'text-emerald-400' : 'text-amber-400'}>{st.label}</span>
          </p>
          <div className="text-[13px] text-slate-300 space-y-0.5">
            <p>
              <span className="tabular-nums font-semibold text-white">{encontrados}</span> registros encontrados
            </p>
            <p>
              <span className="tabular-nums text-white">{novos}</span> novos ·{' '}
              <span className="tabular-nums text-white">{duplicados}</span> duplicados
            </p>
          </div>
          <div className="text-[11px] text-slate-500 space-y-0.5 pt-1" style={{ borderTop: '1px solid var(--code-border)' }}>
            <p>Fonte: {fonteTexto(props.filtros, props.ultimoResultado)}</p>
            <p>Segmento: {produtoLabel(props.filtros.operacao) || props.filtros.segmento || '—'}</p>
            <p>Localização: {localTexto(props.filtros)}</p>
          </div>
        </div>
      ) : null}

      {finishedOk ? (
        <div
          className="rounded-xl px-4 py-3 border space-y-2"
          style={{ background: 'var(--code-surface)', borderColor: 'var(--code-border)' }}
        >
          <h3 className="text-[11px] font-semibold tracking-wide uppercase text-slate-400">Resultado</h3>
          <p className="text-sm font-semibold text-emerald-400">✓ Busca concluída</p>
          <p className="text-[12px] text-slate-400">Os leads encontrados foram salvos no Leads Monitor.</p>
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={props.onVerLeads}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-nexus-orange text-white"
            >
              Ver Leads
            </button>
            <button
              type="button"
              onClick={props.onVerPessoas}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border text-slate-200"
              style={{ borderColor: 'var(--code-border)' }}
            >
              Ver Pessoas
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

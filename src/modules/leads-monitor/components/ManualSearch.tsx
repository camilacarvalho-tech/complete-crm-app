import { Play, RefreshCw, Save } from 'lucide-react'
import type { FiltrosPesquisa, SearchRunProgresso } from '../types'
import { SearchFilters } from './SearchFilters'

export function ManualSearch(props: {
  filtros: FiltrosPesquisa
  onChange: (next: FiltrosPesquisa) => void
  cepMsg: string
  onCepMsg: (msg: string) => void
  buscando: boolean
  searchRunning: boolean
  progresso?: SearchRunProgresso
  erro: string | null
  nomeCampanha: string
  onNomeCampanha: (v: string) => void
  onBuscar: () => void
  onCancelar: () => void
  onSalvarCampanha: () => void
}) {
  return (
    <div
      className="rounded-xl p-4 border space-y-4"
      style={{ background: 'var(--code-surface)', borderColor: 'var(--code-border)' }}
    >
      <div>
        <h2 className="text-lg font-semibold text-white">🔎 Busca manual</h2>
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
      {props.searchRunning && props.progresso && (
        <div className="rounded-xl border border-nexus-orange/30 px-4 py-3 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-slate-200">Busca em andamento · {props.progresso.etapa}</span>
            <span className="tabular-nums text-slate-500">
              {props.progresso.percent}% · {props.progresso.encontrados} encontrados
            </span>
          </div>
          <div className="h-2 rounded-full bg-slate-700 overflow-hidden">
            <div className="h-full bg-nexus-orange" style={{ width: `${Math.min(100, props.progresso.percent)}%` }} />
          </div>
          <div className="flex justify-end">
            <button type="button" onClick={props.onCancelar} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-600 text-white">
              Cancelar busca
            </button>
          </div>
        </div>
      )}
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
  )
}

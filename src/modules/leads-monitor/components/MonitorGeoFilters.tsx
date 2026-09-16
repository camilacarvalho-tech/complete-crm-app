import { useMemo, useRef, useState } from 'react'
import { ESTADOS_BR_NOMES } from '../constants'
import type { FiltrosPesquisa } from '../types'
import { CIDADE_TODAS, resolveAbrangencia, selectedCitiesFromFiltros } from '../search/geoCoverage'
import { useMunicipios } from '../../../hooks/useMunicipios'
import { useClickOutside, useEscLayer } from '../../../hooks/useEscLayer'

export function MonitorGeoFilters({
  filtros,
  onChange,
}: {
  filtros: FiltrosPesquisa
  onChange: (next: FiltrosPesquisa) => void
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const panelRef = useRef<HTMLDivElement>(null)
  const closePanel = () => setOpen(false)
  useEscLayer(open, closePanel)
  useClickOutside(open, panelRef, closePanel)
  const selected = selectedCitiesFromFiltros(filtros)
  const todas = !selected.length && (!filtros.cidade || filtros.cidade === CIDADE_TODAS)
  const { cidades, total, loading, error } = useMunicipios(filtros.estado, q)
  const abrangencia = resolveAbrangencia(filtros)
  const summary = todas
    ? `Todas as cidades${total ? ` (${total})` : ''}`
    : selected.length <= 3
      ? selected.join(', ')
      : `${selected.length} cidades selecionadas`

  const setTodas = () => {
    onChange({ ...filtros, cidade: CIDADE_TODAS, cidadesSelecionadas: [] })
    setOpen(false)
  }

  const toggleCity = (name: string) => {
    const next = selected.includes(name) ? selected.filter((c) => c !== name) : [...selected, name]
    onChange({
      ...filtros,
      cidadesSelecionadas: next,
      cidade: next[0] || CIDADE_TODAS,
    })
  }

  const fila = useMemo(() => selected, [selected])

  return (
    <>
      <div>
        <label className="text-xs text-slate-500">País</label>
        <select
          value={filtros.pais || 'Brasil'}
          onChange={(e) => onChange({ ...filtros, pais: e.target.value })}
          className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 dark:text-white text-sm"
        >
          <option value="Brasil">Brasil</option>
        </select>
      </div>
      <div>
        <label className="text-xs text-slate-500">Estado</label>
        <select
          value={filtros.estado}
          onChange={(e) => onChange({ ...filtros, estado: e.target.value, cidade: '', cidadesSelecionadas: [] })}
          className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 dark:text-white text-sm"
        >
          <option value="">Todos os estados</option>
          {ESTADOS_BR_NOMES.map((s) => (
            <option key={s.uf} value={s.uf}>
              {s.nome} — {s.uf}
            </option>
          ))}
        </select>
      </div>
      <div className="relative" ref={panelRef}>
        <label className="text-xs text-slate-500">Cidade</label>
        <button
          type="button"
          disabled={!filtros.estado && !todas}
          onClick={() => setOpen((v) => !v)}
          className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 dark:text-white text-sm text-left disabled:opacity-60"
        >
          {summary} ▾
        </button>
        {open && (
          <div className="absolute z-30 mt-1 w-full max-h-72 overflow-auto rounded-lg border p-2 shadow-lg" style={{ background: 'var(--code-surface)', borderColor: 'var(--code-border)' }}>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Pesquisar cidade"
              disabled={!filtros.estado}
              className="w-full mb-2 px-2 py-1 rounded bg-slate-100 dark:bg-slate-700 text-xs"
            />
            <label className="flex items-center gap-2 text-xs py-1 font-semibold">
              <input type="checkbox" checked={todas} onChange={setTodas} />
              Todas as cidades{total ? ` (${total})` : ''}
            </label>
            {cidades.map((c) => (
              <label key={c} className="flex items-center gap-2 text-xs py-0.5">
                <input type="checkbox" checked={selected.includes(c)} onChange={() => toggleCity(c)} />
                {c}
              </label>
            ))}
            <button type="button" className="mt-2 text-[11px] underline" onClick={closePanel}>
              Fechar
            </button>
          </div>
        )}
        {loading && <p className="text-[10px] text-slate-400 mt-1">Carregando IBGE…</p>}
        {error && <p className="text-[10px] text-red-500 mt-1">{error}</p>}
        <p className="text-[10px] text-slate-400 mt-1">Abrangência: {abrangencia}</p>
        {fila.length > 1 && (
          <ol className="mt-1 text-[11px] text-slate-600 dark:text-slate-300 list-decimal list-inside">
            {fila.map((c, i) => (
              <li key={c}>{i + 1}. {c}</li>
            ))}
          </ol>
        )}
      </div>
    </>
  )
}

import { useMemo, useRef, useState } from 'react'
import { CARGO_TODOS, CARGOS_FUNCOES, cargosEfetivos } from '../catalog/cargosFuncoes'
import { useClickOutside, useEscLayer } from '../../../hooks/useEscLayer'

export function CargosFuncoesPanel({
  selected,
  onChange,
}: {
  selected: string[]
  onChange: (next: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const panelRef = useRef<HTMLDivElement>(null)
  const closePanel = () => setOpen(false)
  useEscLayer(open, closePanel)
  useClickOutside(open, panelRef, closePanel)
  const todos = selected.includes(CARGO_TODOS) || selected.length === 0
  const efetivos = cargosEfetivos(selected)
  const query = q.trim().toLowerCase()
  const groups = useMemo(
    () =>
      CARGOS_FUNCOES.map((g) => ({
        ...g,
        cargos: query ? g.cargos.filter((c) => c.toLowerCase().includes(query)) : g.cargos,
      })).filter((g) => g.cargos.length),
    [query]
  )
  const summary = todos
    ? 'Todos os cargos'
    : efetivos.length <= 3
      ? efetivos.join(', ')
      : `${efetivos.length} cargos selecionados`

  const toggle = (cargo: string) => {
    if (cargo === CARGO_TODOS) {
      onChange([CARGO_TODOS])
      return
    }
    const cur = efetivos.includes(cargo) ? efetivos.filter((c) => c !== cargo) : [...efetivos, cargo]
    onChange(cur.length ? cur : [CARGO_TODOS])
  }

  return (
    <div className="relative" ref={panelRef}>
      <label className="text-xs text-slate-500">Cargos / Funções a buscar</label>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 dark:text-white text-sm text-left"
      >
        {summary} ▾
      </button>
      {open && (
        <div className="absolute z-30 mt-1 w-full max-h-72 overflow-auto rounded-lg border p-2 shadow-lg" style={{ background: 'var(--code-surface)', borderColor: 'var(--code-border)' }}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filtrar cargo"
            className="w-full mb-2 px-2 py-1 rounded bg-slate-100 dark:bg-slate-700 text-xs"
          />
          <label className="flex items-center gap-2 text-xs py-1 font-semibold">
            <input type="checkbox" checked={todos} onChange={() => toggle(CARGO_TODOS)} />
            Todos os cargos
          </label>
          {groups.map((g) => (
            <div key={g.grupo} className="mt-2">
              <div className="text-[10px] uppercase tracking-wide text-slate-400">{g.grupo}</div>
              {g.cargos.map((c) => (
                <label key={c} className="flex items-center gap-2 text-xs py-0.5">
                  <input type="checkbox" checked={!todos && efetivos.includes(c)} onChange={() => toggle(c)} />
                  {c}
                </label>
              ))}
            </div>
          ))}
          <button type="button" className="mt-2 text-[11px] underline" onClick={closePanel}>
            Fechar
          </button>
        </div>
      )}
      <p className="text-[10px] text-slate-400 mt-1">
        Critério de prospecção/enriquecimento. Se a fonte não informar o cargo: Não informado.
      </p>
    </div>
  )
}

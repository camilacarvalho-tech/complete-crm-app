import { FONTES_CAPTURA_CAMPANHA } from '../services/fontesCampanha'

export function FontesCapturaCheckboxes({
  value,
  onChange,
}: {
  value?: string[]
  onChange: (next: string[]) => void
}) {
  const selected = value || []
  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">🔎 Fontes de pesquisa</div>
      <p className="text-[11px] text-slate-500">
        O robô consulta somente as fontes marcadas. Nenhuma marcada = todas as fontes executáveis (compatibilidade).
        IBGE não é fonte de leads — permanece como referência geográfica.
      </p>
      <div className="flex flex-wrap gap-2">
        {FONTES_CAPTURA_CAMPANHA.map((fonte) => {
          const checked = selected.includes(fonte.id)
          return (
            <label
              key={fonte.id}
              className={`text-xs px-2.5 py-1.5 rounded-lg border cursor-pointer ${
                checked
                  ? 'border-nexus-orange bg-orange-500/10 text-orange-200'
                  : 'border-slate-600 text-slate-300'
              }`}
            >
              <input
                type="checkbox"
                className="mr-1.5 align-middle"
                checked={checked}
                onChange={() => {
                  onChange(checked ? selected.filter((id) => id !== fonte.id) : [...selected, fonte.id])
                }}
              />
              {fonte.label}
            </label>
          )
        })}
      </div>
    </div>
  )
}

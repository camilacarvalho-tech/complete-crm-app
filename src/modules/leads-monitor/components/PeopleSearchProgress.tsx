import type { PeopleSourceProgress } from '../types/peopleResearch'

export function PeopleSearchProgress({
  etapa,
  fontes,
}: {
  etapa: string
  fontes: PeopleSourceProgress[]
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{etapa}</p>
      <ul className="space-y-1.5">
        {fontes.map((f) => (
          <li key={f.id} className="text-xs text-slate-500 flex justify-between gap-2">
            <span>
              {f.status === 'ok' && '✓ '}
              {f.status === 'running' && '⏳ '}
              {f.status === 'error' && '✕ '}
              {f.status === 'skipped' && '– '}
              {f.status === 'pending' && '⏳ '}
              {f.label}
            </span>
            <span className="shrink-0 text-slate-400">
              {f.status === 'ok' ? `${f.count} · ${f.tempoMs}ms` : f.error || f.status}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

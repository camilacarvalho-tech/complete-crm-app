import type { ProcessRun } from '../types/processRun'
import type { PesquisaSalva } from '../types'

export function QueuePanel({
  run,
  pesquisas,
}: {
  run: ProcessRun | null
  pesquisas: PesquisaSalva[]
}) {
  const cities = run?.geoCities || []
  const idx = run?.geoCityIndex || 0
  const campanha = pesquisas.find((p) => p.id === String(run?.filtrosSnapshot?.pesquisaId || ''))
  return (
    <div
      className="rounded-xl p-4 border space-y-3"
      style={{ background: 'var(--code-surface)', borderColor: 'var(--code-border)' }}
    >
      <h2 className="text-lg font-semibold text-white">📋 Fila de cidades</h2>
      <p className="text-xs text-slate-400">
        Mesma fila do processamento. Checkpoint por cidade. Bairro e CEP vêm do filtro da execução.
      </p>
      <div className="text-xs text-slate-400">
        UF {run?.geoUfs?.[run.geoUfIndex || 0] || run?.filtrosSnapshot?.estado || '—'} · Campanha {campanha?.nome || run?.nome || '—'} ·
        Bairro {run?.geoBairro || '—'} · CEP {run?.geoCep || '—'}
      </div>
      {!cities.length ? (
        <p className="text-sm text-slate-500">Nenhuma fila geográfica ativa.</p>
      ) : (
        <ul className="space-y-2">
          {cities.map((city, i) => {
            const current = i === idx || city === run?.cidadeAtual
            const done = i < idx || (run?.status === 'concluido' && i <= idx)
            const erro = current && Boolean(run?.lastError)
            const mark = erro ? '🔴' : current && run?.status === 'processando' ? '🔵' : done ? '🟢' : '🟡'
            const label = erro ? 'erro' : current && run?.status === 'processando' ? 'processando' : done ? 'concluído' : 'aguardando'
            return (
              <li
                key={`${city}-${i}`}
                className="flex flex-wrap justify-between gap-2 text-sm border-b pb-2"
                style={{ borderColor: 'var(--code-border)' }}
              >
                <span className="text-white">
                  {mark} {run?.geoUfs?.[run.geoUfIndex || 0] || ''} {city}
                </span>
                <span className="text-xs text-slate-400">{label}</span>
              </li>
            )
          })}
        </ul>
      )}
      <div className="text-[11px] text-slate-500">
        Encontrados {run?.validos || 0} · processados {run?.processados || 0} · duplicados {run?.duplicados || 0} ·
        erros {run?.erros || 0} · tentativas da cidade atual {run?.cursor || 0}
      </div>
    </div>
  )
}

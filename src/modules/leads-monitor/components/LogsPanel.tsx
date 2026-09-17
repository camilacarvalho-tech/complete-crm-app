import { useMemo, useState } from 'react'
import type { LogCanal } from '../types/logs'
import { filtrarLogs, linhasDeLog } from '../services/logService'
import { formatMonitorDateTime } from '../utils/datetime'

const FILTROS: Array<{ id: LogCanal; label: string }> = [
  { id: 'todos', label: 'Todos' },
  { id: 'busca', label: 'Busca' },
  { id: 'robo', label: 'Robô' },
  { id: 'enriquecimento', label: 'Enriquecimento' },
  { id: 'classificacao', label: 'Classificação' },
  { id: 'crm', label: 'CRM' },
  { id: 'sistema', label: 'Sistema' },
  { id: 'aviso', label: 'Aviso' },
  { id: 'erro', label: 'Erro' },
  { id: 'lgpd', label: 'LGPD' },
  { id: 'esc', label: 'ESC' },
]

export function LogsPanel({
  items,
}: {
  items: Array<Record<string, unknown> & { id: string }>
}) {
  const [canal, setCanal] = useState<LogCanal>('todos')
  const linhas = useMemo(() => filtrarLogs(linhasDeLog(items), canal), [items, canal])
  return (
    <div
      className="rounded-xl p-4 border space-y-3"
      style={{ background: 'var(--code-surface)', borderColor: 'var(--code-border)' }}
    >
      <h2 className="text-lg font-semibold text-white">📜 Central de logs</h2>
      <p className="text-xs text-slate-400">Leitura dos logs e da auditoria já existentes — sem segundo sistema de log.</p>
      <div className="flex flex-wrap gap-1">
        {FILTROS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setCanal(f.id)}
            className={`text-xs px-2.5 py-1 rounded-lg ${canal === f.id ? 'bg-nexus-orange text-white' : 'bg-slate-800 text-slate-300'}`}
          >
            {f.label}
          </button>
        ))}
      </div>
      <ul className="space-y-2 max-h-[560px] overflow-y-auto text-xs">
        {linhas.map((l) => (
          <li key={l.id} className="border-b pb-2" style={{ borderColor: 'var(--code-border)' }}>
            <div className="text-slate-400">{formatMonitorDateTime(l.timestamp) || l.hora}</div>
            <div className="text-white font-medium">
              {l.canal.toUpperCase()} · {l.acao}
            </div>
            <div className="text-slate-300">{l.mensagem}</div>
            <div className="text-slate-500">
              {[l.estado, l.cidade, l.bairro, l.cep].filter(Boolean).join(' · ') || '—'} · {l.status || ''}
            </div>
          </li>
        ))}
        {!linhas.length && <li className="text-slate-500">Sem eventos neste filtro.</li>}
      </ul>
    </div>
  )
}

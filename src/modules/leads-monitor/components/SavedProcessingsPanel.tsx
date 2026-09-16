import type { ProcessRun } from '../types/processRun'
import { formatMonitorDateTime } from '../utils/datetime'

export function SavedProcessingsPanel(props: {
  runs: ProcessRun[]
  onOpen: (run: ProcessRun) => void
  onResume: (run: ProcessRun) => void
  onExport: (run: ProcessRun) => void
  onDelete: (run: ProcessRun) => void
}) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 font-semibold">Processamentos salvos</div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-xs">
          <thead className="bg-slate-50 dark:bg-slate-900/40 text-slate-500">
            <tr>
              {['Nome', 'Data', 'Origem', 'Total', 'Processados', 'Enriquecidos', 'Pessoas', 'Qualificados', 'Erros', 'Status', 'Ações'].map((h) => (
                <th key={h} className="text-left px-3 py-2 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {props.runs.map((r) => (
              <tr key={r.id} className="border-t border-slate-100 dark:border-slate-700">
                <td className="px-3 py-2">{r.nome}</td>
                <td className="px-3 py-2 whitespace-nowrap">{formatMonitorDateTime(r.criadoEm || r.startedAt)}</td>
                <td className="px-3 py-2">{r.origem}</td>
                <td className="px-3 py-2">{r.total}</td>
                <td className="px-3 py-2">{r.processados}</td>
                <td className="px-3 py-2">{r.enriquecidos}</td>
                <td className="px-3 py-2">{r.pessoasEncontradas}</td>
                <td className="px-3 py-2">{r.qualificados}</td>
                <td className="px-3 py-2">{r.erros}</td>
                <td className="px-3 py-2">{r.status}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    <button type="button" className="underline" onClick={() => props.onOpen(r)}>Abrir</button>
                    {(r.status === 'pausado' || r.status === 'aguardando') && (
                      <button type="button" className="underline" onClick={() => props.onResume(r)}>Retomar</button>
                    )}
                    <button type="button" className="underline" onClick={() => props.onExport(r)}>Exportar</button>
                    <button
                      type="button"
                      className="underline text-red-600"
                      onClick={() => {
                        if (window.confirm('Excluir este processamento do Monitor? Clientes do CRM não serão apagados.')) {
                          props.onDelete(r)
                        }
                      }}
                    >
                      Excluir
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!props.runs.length && (
              <tr>
                <td colSpan={11} className="px-3 py-6 text-slate-400 text-center">Nenhum processamento salvo</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

import { getEnrichmentProviders } from '../enrichment/enrichmentRegistry'
import { ENRICHABLE_FIELDS } from '../enrichment/enrichmentTypes'

export function FontesEnrichmentPanel() {
  const rows = getEnrichmentProviders()
  return (
    <div
      className="rounded-xl p-4 border space-y-3"
      style={{ background: 'var(--code-surface)', borderColor: 'var(--code-border)' }}
    >
      <div className="text-sm font-semibold text-white">Fontes de enriquecimento</div>
      <p className="text-[11px] text-slate-500">
        Complementam PersonLead já existente. Nenhum endpoint fictício está ligado. CSV/planilha é origem ativa da
        importação, não uma API de cruzamento.
      </p>
      <div className="overflow-x-auto">
        <table className="min-w-full text-xs">
          <thead className="text-slate-400">
            <tr>
              {['Fonte', 'Tipo', 'Status', 'Campos suportados', 'Última execução', 'Enriquecidos', 'Sem correspondência', 'Erros'].map(
                (h) => (
                  <th key={h} className="text-left px-2 py-1 font-medium">
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-t" style={{ borderColor: 'var(--code-border)' }}>
                <td className="px-2 py-2 text-slate-200">{p.name}</td>
                <td className="px-2 py-2">{p.type}</td>
                <td className="px-2 py-2">{p.status}</td>
                <td className="px-2 py-2 max-w-[220px]">{(p.supportedFields || ENRICHABLE_FIELDS).join(', ')}</td>
                <td className="px-2 py-2">{p.lastRunAt || '—'}</td>
                <td className="px-2 py-2">{p.enrichedCount ?? 0}</td>
                <td className="px-2 py-2">{p.noMatchCount ?? 0}</td>
                <td className="px-2 py-2">{p.errorCount ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

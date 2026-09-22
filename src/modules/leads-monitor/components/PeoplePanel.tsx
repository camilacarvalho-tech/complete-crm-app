import { useMemo, useState } from 'react'
import type { CompanyPeopleResearch } from '../types/peopleResearch'
import type { OportunidadeMonitor } from '../types'
import { toPersonLead } from '../pipeline/personLead'
import { getCallableEnrichmentProviders, getEnrichmentProviders } from '../enrichment/enrichmentRegistry'
import { runEnrichmentQueue, type EnrichmentQueueProgress } from '../enrichment/enrichmentQueue'
import {
  downloadPeopleEnrichmentExport,
  type EnrichmentExportMode,
} from '../enrichment/enrichmentExport'

function maskPhone(v?: string) {
  const d = String(v || '').replace(/\D/g, '')
  if (d.length < 4) return v || '—'
  return `***${d.slice(-4)}`
}

export function PeoplePanel(props: {
  people: CompanyPeopleResearch[]
  companies: OportunidadeMonitor[]
  empresaId: string
  actor?: { usuarioId?: string; usuarioNome?: string }
  onAddCrm: (p: CompanyPeopleResearch, company: OportunidadeMonitor) => void
  onAprovarEmpresa?: (company: OportunidadeMonitor) => void
  onToast: (kind: 'info' | 'success' | 'error', title: string, msg?: string) => void
}) {
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<EnrichmentQueueProgress | null>(null)
  const [historyId, setHistoryId] = useState<string | null>(null)
  const [exportMode, setExportMode] = useState<EnrichmentExportMode>('both')
  const active = getCallableEnrichmentProviders()
  const historyPerson = props.people.find((p) => p.id === historyId)
  const historyLead = historyPerson
    ? toPersonLead(historyPerson, props.companies.find((c) => c.id === historyPerson.opportunityId) || null)
    : null

  const selectedPeople = useMemo(
    () => props.people.filter((p) => selected[p.id]),
    [props.people, selected]
  )

  const run = async (list: CompanyPeopleResearch[]) => {
    if (!props.empresaId) return
    if (!list.length) {
      props.onToast('info', 'Nenhuma pessoa selecionada')
      return
    }
    if (!active.length) {
      props.onToast('info', 'Nenhuma fonte de enriquecimento está configurada.')
      return
    }
    setBusy(true)
    try {
      const result = await runEnrichmentQueue({
        empresaId: props.empresaId,
        people: list,
        companies: props.companies,
        actor: props.actor,
        onProgress: setProgress,
      })
      if (result.message) props.onToast('info', result.message)
      else props.onToast('success', 'Enriquecimento concluído', `${result.completed} processados`)
    } catch (e: unknown) {
      props.onToast('error', 'Falha no enriquecimento', e instanceof Error ? e.message : '')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 items-center">
        <button
          type="button"
          disabled={busy}
          className="px-3 py-1.5 rounded-lg bg-slate-700 text-white text-xs font-semibold disabled:opacity-60"
          onClick={() => {
            const first = selectedPeople[0] || props.people[0]
            if (first) void run([first])
          }}
        >
          ENRIQUECER
        </button>
        <button
          type="button"
          disabled={busy}
          className="px-3 py-1.5 rounded-lg bg-slate-700 text-white text-xs font-semibold disabled:opacity-60"
          onClick={() => void run(selectedPeople)}
        >
          ENRIQUECER SELECIONADOS
        </button>
        <button
          type="button"
          disabled={busy}
          className="px-3 py-1.5 rounded-lg bg-nexus-orange text-white text-xs font-semibold disabled:opacity-60"
          onClick={() => void run(props.people)}
        >
          ENRIQUECER TODOS
        </button>
        <button
          type="button"
          className="px-3 py-1.5 rounded-lg border border-slate-600 text-slate-200 text-xs"
          onClick={() => setHistoryId(selectedPeople[0]?.id || props.people[0]?.id || null)}
        >
          VER HISTÓRICO
        </button>
        <span className="text-[11px] text-slate-500">
          Fontes ativas: {active.map((p) => p.name).join(', ') || 'nenhuma API de cruzamento'}
        </span>
      </div>
      {!getEnrichmentProviders().some((p) => p.status === 'ACTIVE' && p.type !== 'AUTHORIZED_IMPORT') ? (
        <p className="text-xs text-amber-400">Nenhuma fonte de enriquecimento está configurada.</p>
      ) : null}
      {progress ? (
        <p className="text-[11px] text-slate-400">
          Fila: pendentes {progress.pending} · processando {progress.processing} · ok {progress.completed} · falhas{' '}
          {progress.failed} · ignorados {progress.skipped}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-3 items-center text-[11px] text-slate-400">
        <span>Exportar:</span>
        {(
          [
            ['original', 'Somente dados originais'],
            ['enriched', 'Dados enriquecidos'],
            ['both', 'Original + enriquecido'],
          ] as const
        ).map(([id, label]) => (
          <label key={id} className="flex items-center gap-1">
            <input type="radio" checked={exportMode === id} onChange={() => setExportMode(id)} />
            {label}
          </label>
        ))}
        <button
          type="button"
          className="underline"
          onClick={() =>
            downloadPeopleEnrichmentExport({
              people: props.people,
              companies: props.companies,
              mode: exportMode,
              format: 'csv',
            })
          }
        >
          CSV
        </button>
        <button
          type="button"
          className="underline"
          onClick={() =>
            downloadPeopleEnrichmentExport({
              people: props.people,
              companies: props.companies,
              mode: exportMode,
              format: 'xlsx',
            })
          }
        >
          XLS
        </button>
      </div>
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-x-auto">
        <table className="min-w-full text-xs">
          <thead className="bg-slate-50 dark:bg-slate-900/40 text-slate-500">
            <tr>
              <th className="px-3 py-2">
                <input
                  type="checkbox"
                  onChange={(e) => {
                    const next: Record<string, boolean> = {}
                    if (e.target.checked) props.people.forEach((p) => { next[p.id] = true })
                    setSelected(next)
                  }}
                />
              </th>
              {['Nome', 'Empresa', 'CNPJ', 'Cargo', 'Relação', 'Telefone', 'WhatsApp', 'Enrichment', 'Status', 'Ações'].map((h) => (
                <th key={h} className="text-left px-3 py-2">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {props.people.map((p) => {
              const company = props.companies.find((o) => o.id === p.opportunityId)
              const extra = p as CompanyPeopleResearch & { enrichmentStatus?: string }
              return (
                <tr key={p.id} className="border-t border-slate-100 dark:border-slate-700">
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={Boolean(selected[p.id])}
                      onChange={(e) => setSelected((s) => ({ ...s, [p.id]: e.target.checked }))}
                    />
                  </td>
                  <td className="px-3 py-2">{p.personName}</td>
                  <td className="px-3 py-2">{p.companyName}</td>
                  <td className="px-3 py-2">{p.companyCnpj}</td>
                  <td className="px-3 py-2">{p.jobTitle}</td>
                  <td className="px-3 py-2">{p.relationToCompany}</td>
                  <td className="px-3 py-2">{maskPhone(p.phone)}</td>
                  <td className="px-3 py-2">{maskPhone(p.whatsapp)}</td>
                  <td className="px-3 py-2">{extra.enrichmentStatus || 'NOT_ENRICHED'}</td>
                  <td className="px-3 py-2">{p.status}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2 flex-wrap">
                      <button type="button" className="underline" onClick={() => void run([p])}>
                        Enriquecer
                      </button>
                      <button type="button" className="underline" onClick={() => setHistoryId(p.id)}>
                        Histórico
                      </button>
                      {company && props.onAprovarEmpresa ? (
                        <button type="button" className="underline" onClick={() => props.onAprovarEmpresa?.(company)}>
                          Empresa→CRM
                        </button>
                      ) : null}
                      {company ? (
                        <button type="button" className="underline" onClick={() => props.onAddCrm(p, company)}>
                          CRM
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              )
            })}
            {!props.people.length ? (
              <tr>
                <td colSpan={11} className="px-3 py-6 text-center text-slate-400">
                  Nenhuma pessoa publicamente associada foi encontrada nas fontes consultadas.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      {historyLead ? (
        <div className="rounded-xl border border-slate-600 p-3 text-xs text-slate-300 space-y-2">
          <div className="flex justify-between">
            <span className="font-semibold text-white">Histórico · {historyLead.nome}</span>
            <button type="button" className="underline" onClick={() => setHistoryId(null)}>
              Fechar
            </button>
          </div>
          <p>Status: {historyLead.enrichmentStatus || 'NOT_ENRICHED'}</p>
          <p>Fontes: {(historyLead.enrichmentSources || []).join(', ') || '—'}</p>
          <ul className="space-y-1">
            {(historyLead.enrichmentHistory || []).length ? (
              (historyLead.enrichmentHistory || []).map((h, i) => (
                <li key={i}>
                  {h.field}: {maskPhone(h.oldValue) || '∅'} → {maskPhone(h.newValue) || '∅'} · {h.source}
                </li>
              ))
            ) : (
              <li>Sem alterações de enriquecimento.</li>
            )}
          </ul>
          {(historyLead.enrichmentCandidates || []).length ? (
            <div>
              <div className="font-semibold text-slate-200 mt-2">Candidatos (não aplicados)</div>
              {(historyLead.enrichmentCandidates || []).map((c, i) => (
                <p key={i}>
                  {c.field} · {c.reason} · {c.source}
                </p>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

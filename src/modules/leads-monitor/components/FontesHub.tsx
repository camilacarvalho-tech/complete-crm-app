import { getEnrichmentProviders } from '../enrichment/enrichmentRegistry'
import { getBankProviders } from '../../bank/bankProviderRegistry'
import { listPersonSourceDescriptors } from '../person/personSourceRegistry'
import { ENRICHABLE_FIELDS } from '../enrichment/enrichmentTypes'

function Badge({ status }: { status: string }) {
  const s = status.toUpperCase()
  const ok = s === 'ACTIVE' || s === 'ATIVA' || s === 'CONFIGURADA' || s === 'DISPONÍVEL'
  return <span className={ok ? 'text-emerald-400' : s.includes('ERROR') || s.includes('ERRO') ? 'text-red-400' : 'text-amber-400'}>{s}</span>
}

export function FontesHub() {
  const people = listPersonSourceDescriptors()
  const enrich = getEnrichmentProviders()
  const banks = getBankProviders()
  return (
    <div className="space-y-4 text-xs">
      <section className="rounded-xl p-4 border" style={{ borderColor: 'var(--code-border)', background: 'var(--code-surface)' }}>
        <div className="text-sm font-semibold text-white mb-2">Fontes empresariais</div>
        <ul className="space-y-1 text-slate-300">
          <li>OpenStreetMap / Overpass · <Badge status="ACTIVE" /></li>
          <li>Google Places · <Badge status="ACTIVE" /> (opcional; 403 é ignorado)</li>
          <li>Receita CNPJ / QSA (BrasilAPI) · <Badge status="ACTIVE" /></li>
        </ul>
      </section>
      <section className="rounded-xl p-4 border" style={{ borderColor: 'var(--code-border)', background: 'var(--code-surface)' }}>
        <div className="text-sm font-semibold text-white mb-2">Fontes de pessoas</div>
        <ul className="space-y-1 text-slate-300">
          {people.map((p) => (
            <li key={p.id}>
              {p.label} · <Badge status={p.health === 'NAO_CONFIGURADA' ? 'NOT_CONFIGURED' : p.health} />
            </li>
          ))}
        </ul>
      </section>
      <section className="rounded-xl p-4 border" style={{ borderColor: 'var(--code-border)', background: 'var(--code-surface)' }}>
        <div className="text-sm font-semibold text-white mb-2">Fontes de inteligência</div>
        <ul className="space-y-1 text-slate-300">
          <li>INSS (open data / inteligência) · <Badge status="ACTIVE" /> — não entrega CPF/WhatsApp</li>
          <li>RAIS / CAGED · <Badge status="NOT_CONFIGURED" /></li>
          <li>IBGE (municípios) · <Badge status="ACTIVE" /></li>
        </ul>
      </section>
      <section className="rounded-xl p-4 border" style={{ borderColor: 'var(--code-border)', background: 'var(--code-surface)' }}>
        <div className="text-sm font-semibold text-white mb-2">Fontes de enriquecimento</div>
        <ul className="space-y-1 text-slate-300">
          {enrich.map((p) => (
            <li key={p.id}>
              {p.name} · <Badge status={p.status} /> · campos: {(p.supportedFields || ENRICHABLE_FIELDS).slice(0, 6).join(', ')}…
            </li>
          ))}
        </ul>
      </section>
      <section className="rounded-xl p-4 border" style={{ borderColor: 'var(--code-border)', background: 'var(--code-surface)' }}>
        <div className="text-sm font-semibold text-white mb-2">Fontes bancárias</div>
        <ul className="space-y-1 text-slate-300">
          {banks.map((b) => (
            <li key={b.id}>
              {b.name} · <Badge status={b.status} />
            </li>
          ))}
        </ul>
        <p className="text-[11px] text-slate-500 mt-2">Adapters futuros. Sem endpoint inventado.</p>
      </section>
    </div>
  )
}

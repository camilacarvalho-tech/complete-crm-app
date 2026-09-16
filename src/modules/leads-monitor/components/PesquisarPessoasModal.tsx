import { useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'
import { useEscLayer } from '../../../hooks/useEscLayer'
import { PeopleSearchProgress } from './PeopleSearchProgress'
import { PersonResultCard } from './PersonResultCard'
import { formatMonitorDateTime } from '../utils/datetime'
import type { OportunidadeMonitor } from '../types'
import type { CompanyPeopleResearch, PeopleRun } from '../types/peopleResearch'

export function PesquisarPessoasModal({
  company,
  run,
  people,
  onClose,
  onIgnore,
  onAddCrm,
}: {
  company: OportunidadeMonitor
  run: PeopleRun | null
  people: CompanyPeopleResearch[]
  onClose: () => void
  onIgnore: (p: CompanyPeopleResearch) => Promise<void>
  onAddCrm: (p: CompanyPeopleResearch) => Promise<void>
}) {
  const [sendingId, setSendingId] = useState<string | null>(null)
  const running = run?.status === 'running' || run?.status === 'queued'
  const done = run?.status === 'succeeded' || run?.status === 'failed'
  const visiveis = useMemo(
    () => people.filter((p) => p.status !== 'ignorado'),
    [people]
  )
  const t = run?.totais
  useEscLayer(true, onClose)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'var(--code-overlay)' }}>
      <div className="nexus-card w-full max-w-2xl max-h-[90vh] overflow-y-auto p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-lg font-semibold text-slate-800 dark:text-white">
              <span
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-orange-500/15 text-xl"
                style={{
                  animation: running ? 'lm-lupa 1.2s ease-in-out infinite' : undefined,
                }}
              >
                <Search className="w-5 h-5 text-orange-500" />
              </span>
              {running ? 'Pesquisando...' : done ? 'Pesquisa concluída' : 'Pesquisar pessoas'}
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Empresa: {company.nome}
              {company.cidade ? ` · ${company.cidade}/${company.estado}` : ''}
            </p>
            {company.cnpj ? <p className="text-xs text-slate-400">CNPJ: {company.cnpj}</p> : null}
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <style>{`
          @keyframes lm-lupa {
            0%, 100% { transform: rotate(-14deg) scale(1); }
            50% { transform: rotate(12deg) scale(1.08); }
          }
        `}</style>

        <PeopleSearchProgress
          etapa={run?.etapa || 'Na fila'}
          fontes={run?.fontes || []}
        />

        {run?.companyPhone ? <p className="text-xs text-slate-500">Telefone comercial: {run.companyPhone}</p> : null}
        {run?.companyWhatsapp ? (
          <p className="text-xs text-slate-500">
            WhatsApp comercial: {run.companyWhatsapp}{' '}
            {run.companyWhatsappUrl ? (
              <a className="underline text-emerald-600" href={run.companyWhatsappUrl} target="_blank" rel="noreferrer">
                Abrir WhatsApp
              </a>
            ) : null}
          </p>
        ) : null}

        {run?.manuais?.length ? (
          <div className="text-xs space-y-1">
            <p className="font-medium text-slate-600 dark:text-slate-300">Consulta manual (sem API de funcionários)</p>
            {run.manuais.map((m) => (
              <a key={m.url} className="block text-sky-600 underline" href={m.url} target="_blank" rel="noreferrer">
                {m.label}
              </a>
            ))}
          </div>
        ) : null}

        {done && t ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
            <div className="rounded-lg bg-slate-50 dark:bg-slate-700/50 p-2">{t.pessoas} pessoas</div>
            <div className="rounded-lg bg-slate-50 dark:bg-slate-700/50 p-2">{t.confirmadas} confirmadas</div>
            <div className="rounded-lg bg-slate-50 dark:bg-slate-700/50 p-2">{t.naoConfirmadas} não confirmadas</div>
            <div className="rounded-lg bg-slate-50 dark:bg-slate-700/50 p-2">{t.fontes} fontes</div>
            <div className="rounded-lg bg-slate-50 dark:bg-slate-700/50 p-2">{t.telefones} telefones</div>
            <div className="rounded-lg bg-slate-50 dark:bg-slate-700/50 p-2">{t.whatsapps} WhatsApps</div>
            <div className="rounded-lg bg-slate-50 dark:bg-slate-700/50 p-2">{t.perfis} perfis/links</div>
            <div className="rounded-lg bg-slate-50 dark:bg-slate-700/50 p-2">{run.tempoMs} ms</div>
          </div>
        ) : null}

        {run?.lastError ? <p className="text-xs text-amber-600">{run.lastError}</p> : null}
        {run?.finishedAt ? (
          <p className="text-[11px] text-slate-400">Concluída em {formatMonitorDateTime(run.finishedAt)}</p>
        ) : null}

        <div className="space-y-2">
          {visiveis.length === 0 && done ? (
            <p className="text-sm text-slate-500">
              Nenhuma pessoa identificada automaticamente. Use os links de consulta manual. QSA só aparece quando há CNPJ.
            </p>
          ) : (
            visiveis.map((p) => (
              <PersonResultCard
                key={p.id}
                person={p}
                sending={sendingId === p.id}
                onIgnore={() => onIgnore(p)}
                onAddCrm={async () => {
                  setSendingId(p.id)
                  try {
                    await onAddCrm(p)
                  } finally {
                    setSendingId(null)
                  }
                }}
              />
            ))
          )}
        </div>
        <div className="flex justify-end">
          <button type="button" className="text-xs px-3 py-2 rounded-lg border" style={{ borderColor: 'var(--code-border)' }} onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}

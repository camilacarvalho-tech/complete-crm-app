import { useState } from 'react'
import { ExternalLink, Send, UserRound, XCircle } from 'lucide-react'
import { useEscLayer } from '../../../hooks/useEscLayer'
import { LgpdGovernancaBlock } from './LgpdGovernancaBlock'
import { Link } from 'react-router-dom'
import { formatMonitorDateTime } from '../utils/datetime'
import type { CompanyPeopleResearch } from '../types/peopleResearch'

const REL_LABEL: Record<string, string> = {
  funcionario: 'Funcionário',
  ex_funcionario: 'Ex-funcionário',
  administrador: 'Administrador',
  socio: 'Sócio',
  gestor: 'Gestor',
  profissional_relacionado: 'Profissional relacionado',
  nao_confirmado: 'Não confirmado',
}

export function PersonResultCard({
  person,
  sending,
  onIgnore,
  onAddCrm,
}: {
  person: CompanyPeopleResearch
  sending?: boolean
  onIgnore: () => void
  onAddCrm: () => void
}) {
  const sent = person.status === 'enviado_crm'
  const ignored = person.status === 'ignorado'
  const [open, setOpen] = useState(false)
  useEscLayer(open, () => setOpen(false))
  return (
    <article className="rounded-xl border border-slate-200 dark:border-slate-600 p-3 space-y-2 text-sm">
      <div className="font-semibold text-slate-800 dark:text-white">{person.personName}</div>
      {person.jobTitle ? <div className="text-xs text-slate-500">{person.jobTitle}</div> : null}
      <div className="text-xs text-slate-500">{person.companyName}</div>
      <div className="text-xs">Relação: {REL_LABEL[person.relationToCompany] || person.relationToCompany}</div>
      {person.phone ? <div className="text-xs">Telefone: {person.phone}</div> : null}
      {person.whatsapp ? (
        <div className="text-xs">
          WhatsApp: {person.whatsapp}{' '}
          {person.whatsappSourceUrl ? (
            <a className="text-emerald-600 underline" href={person.whatsappSourceUrl} target="_blank" rel="noreferrer">
              Abrir WhatsApp
            </a>
          ) : null}
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2 text-xs">
        {person.linkedinUrl ? (
          <a className="text-sky-600 underline" href={person.linkedinUrl} target="_blank" rel="noreferrer">
            LinkedIn
          </a>
        ) : null}
        {person.instagramUrl ? (
          <a className="text-pink-600 underline" href={person.instagramUrl} target="_blank" rel="noreferrer">
            Instagram
          </a>
        ) : null}
        {person.facebookUrl ? (
          <a className="text-blue-600 underline" href={person.facebookUrl} target="_blank" rel="noreferrer">
            Facebook
          </a>
        ) : null}
      </div>
      <div className="text-[11px] text-slate-400">
        Fonte: {person.sourceName || person.source} · confiança {person.confidence} ·{' '}
        {formatMonitorDateTime(person.foundAt || person.createdAt)}
      </div>
      <div className="flex flex-wrap gap-1.5 pt-1">
        {person.sourceUrl ? (
          <a
            href={person.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-xs inline-flex items-center gap-1"
          >
            <ExternalLink className="w-3 h-3" /> Ver fonte
          </a>
        ) : null}
        {!sent && !ignored ? (
          <>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-xs"
            >
              Ver detalhes
            </button>
            <button
              type="button"
              disabled={sending}
              onClick={onAddCrm}
              className="px-2 py-1 rounded-lg bg-emerald-500 text-white text-xs inline-flex items-center gap-1 disabled:opacity-60"
            >
              <Send className="w-3 h-3" /> Adicionar ao CRM
            </button>
            <button
              type="button"
              onClick={onIgnore}
              className="px-2 py-1 rounded-lg bg-slate-200 dark:bg-slate-600 text-xs inline-flex items-center gap-1"
            >
              <XCircle className="w-3 h-3" /> Ignorar
            </button>
          </>
        ) : sent ? (
          <div className="space-y-1">
            <div className="text-xs text-emerald-600 font-semibold">✓ Enviado ao CRM</div>
            <div className="text-xs text-slate-500">Cliente CRM: {person.personName}</div>
            {person.crmPersonId ? (
              <Link
                to="/whatsapp"
                className="px-2 py-1 rounded-lg bg-sky-600 text-white text-xs inline-flex items-center gap-1"
              >
                <UserRound className="w-3 h-3" /> Abrir no CRM
              </Link>
            ) : null}
          </div>
        ) : (
          <span className="text-xs text-slate-400">Ignorada</span>
        )}
      </div>
      {open ? (
        <div className="fixed inset-0 z-50 flex justify-end" style={{ background: 'var(--code-overlay)' }}>
          <aside className="w-full max-w-md h-full overflow-y-auto p-4 nexus-card rounded-none" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold">Detalhes</h3>
              <button type="button" onClick={() => setOpen(false)}>Fechar</button>
            </div>
            <p className="text-xs font-semibold mb-1">Dados pessoais</p>
            <dl className="text-xs space-y-1">
              <div>Nome: {person.personName || '—'}</div>
              <div>CPF: {(person as { cpf?: string }).cpf || '—'}</div>
              <div>Cargo: {person.jobTitle || '—'}</div>
              <div>Telefone: {person.phone || '—'}</div>
              <div>WhatsApp: {person.whatsapp || '—'}</div>
              <div>E-mail: {(person as { email?: string }).email || '—'}</div>
            </dl>
            <p className="text-xs font-semibold mt-3 mb-1">Dados empresariais</p>
            <dl className="text-xs space-y-1">
              <div>Empresa: {person.companyName || 'Não informado'}</div>
              <div>CNPJ: {person.companyCnpj || 'Não informado'}</div>
              <div>Relação: {REL_LABEL[person.relationToCompany] || person.relationToCompany}</div>
              <div>Fonte: {person.sourceName || person.source || 'Não informado'}</div>
              <div>
                Perfil profissional público:{' '}
                {person.linkedinUrl || person.instagramUrl || person.facebookUrl || 'Não informado'}
              </div>
            </dl>
            <div className="mt-3">
              <LgpdGovernancaBlock
                compact
                record={{
                  origemLabel: person.sourceName || person.source,
                  fonteDado: person.sourceName,
                  coletadoEm: person.foundAt || person.createdAt,
                  atualizadoEm: person.updatedAt,
                }}
              />
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              {person.whatsapp ? <a className="px-2 py-1 rounded bg-emerald-600 text-white" href={`https://wa.me/${person.whatsapp.replace(/\D/g, '')}`}>WhatsApp</a> : null}
              {person.phone ? <a className="px-2 py-1 rounded bg-slate-700 text-white" href={`tel:${person.phone}`}>Telefone</a> : null}
              {person.crmPersonId ? <Link className="px-2 py-1 rounded bg-sky-600 text-white" to="/whatsapp">Abrir atendimento</Link> : null}
              <button type="button" className="px-2 py-1 rounded border text-xs" onClick={() => setOpen(false)}>Fechar</button>
            </div>
          </aside>
        </div>
      ) : null}
    </article>
  )
}

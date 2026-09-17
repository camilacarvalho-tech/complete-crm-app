import { Link } from 'react-router-dom'
import { CheckCircle2, RefreshCw, Search, Send, Trash2, User, XCircle } from 'lucide-react'
import type { OportunidadeMonitor, PesquisaSalva } from '../types'
import { redactCpf, maskPhone, formatCep } from '../utils/formatters'
import { formatMonitorDateTime } from '../utils/datetime'

type FiltroLista =
  | 'todos'
  | 'novo'
  | 'enviado_crm'
  | 'rejeitado'
  | 'leads_quentes'
  | 'aprovado'

function StatusBadge({ status }: { status: OportunidadeMonitor['status'] }) {
  const label: Record<string, string> = {
    novo: 'Pendente',
    qualificado: 'Qualificado',
    aprovado: 'Qualificado',
    enviado_crm: 'Enviado ao CRM',
    rejeitado: 'Descartado',
    duplicado: 'Duplicado',
  }
  return (
    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-700 text-slate-200">
      {label[status] || status}
    </span>
  )
}

export function LeadResults(props: {
  lista: OportunidadeMonitor[]
  loading: boolean
  filtroStatus: FiltroLista
  onFiltro: (s: FiltroLista) => void
  pesquisas: PesquisaSalva[]
  enviandoId: string | null
  onAprovar: (op: OportunidadeMonitor) => void
  onRejeitar: (op: OportunidadeMonitor) => void
  onRemove: (op: OportunidadeMonitor) => void
  onPessoas: (op: OportunidadeMonitor) => void
  onLgpd: (op: OportunidadeMonitor) => void
}) {
  const campanhaNome = (id?: string | null) => props.pesquisas.find((p) => p.id === id)?.nome || id || '—'
  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ background: 'var(--code-surface)', borderColor: 'var(--code-border)' }}
    >
      <div className="px-4 py-3 border-b flex flex-wrap items-center justify-between gap-2" style={{ borderColor: 'var(--code-border)' }}>
        <div className="text-sm font-semibold text-white">Leads encontrados ({props.lista.length})</div>
        <div className="flex flex-wrap gap-1">
          {(
            [
              ['todos', 'Todos'],
              ['leads_quentes', 'Quentes'],
              ['novo', 'Novos'],
              ['enviado_crm', 'CRM'],
              ['rejeitado', 'Descartados'],
            ] as const
          ).map(([s, label]) => (
            <button
              key={s}
              type="button"
              onClick={() => props.onFiltro(s)}
              className={`text-xs px-2.5 py-1 rounded-lg ${
                props.filtroStatus === s ? 'bg-slate-600 text-white' : 'bg-slate-800 text-slate-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {props.loading ? (
        <div className="p-8 text-center text-slate-500 text-sm">Carregando...</div>
      ) : props.lista.length === 0 ? (
        <div className="p-8 text-center text-slate-500 text-sm">Nenhum lead neste filtro.</div>
      ) : (
        <div className="overflow-x-auto max-h-[640px] overflow-y-auto">
          <table className="min-w-full text-xs">
            <thead className="text-slate-400">
              <tr>
                {['Nome', 'Tipo', 'Empresa', 'Segmento', 'UF', 'Cidade', 'Bairro', 'CEP', 'Telefone', 'E-mail', 'CPF', 'Fonte', 'Campanha', 'Data', 'Score', 'CRM', 'Ações'].map(
                  (h) => (
                    <th key={h} className="text-left px-3 py-2 font-medium whitespace-nowrap">
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {props.lista.map((op) => {
                const cpfRaw = String(op.metadados?.cpf || '')
                return (
                  <tr key={op.id} className="border-t" style={{ borderColor: 'var(--code-border)' }}>
                    <td className="px-3 py-2 text-white font-medium whitespace-nowrap">{op.nome}</td>
                    <td className="px-3 py-2">{op.tipo}</td>
                    <td className="px-3 py-2">{op.empresaNome || (op.tipo === 'empresa' ? op.nome : '—')}</td>
                    <td className="px-3 py-2">{op.segmento || '—'}</td>
                    <td className="px-3 py-2">{op.estado}</td>
                    <td className="px-3 py-2">{op.cidade}</td>
                    <td className="px-3 py-2">{op.bairro || String(op.metadados?.bairro || '—')}</td>
                    <td className="px-3 py-2">{formatCep(op.cep) || '—'}</td>
                    <td className="px-3 py-2">{op.telefone ? maskPhone(op.telefone) : '—'}</td>
                    <td className="px-3 py-2">{op.email || '—'}</td>
                    <td className="px-3 py-2">{cpfRaw ? redactCpf(cpfRaw) : '—'}</td>
                    <td className="px-3 py-2">{op.origemLabel || op.fonteDado || op.connectorId}</td>
                    <td className="px-3 py-2">{campanhaNome(op.pesquisaId)}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{formatMonitorDateTime(op.encontradoEm || op.criadoEm)}</td>
                    <td className="px-3 py-2 font-semibold">{op.score ?? '—'}</td>
                    <td className="px-3 py-2">
                      <StatusBadge status={op.status} />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1 flex-wrap">
                        {op.tipo === 'empresa' && (
                          <button type="button" onClick={() => props.onPessoas(op)} className="px-2 py-1 rounded bg-sky-700 text-white">
                            <Search className="w-3 h-3" />
                          </button>
                        )}
                        {op.status !== 'enviado_crm' && op.status !== 'rejeitado' && (
                          <>
                            <button
                              type="button"
                              disabled={props.enviandoId === op.id}
                              onClick={() => props.onAprovar(op)}
                              className="px-2 py-1 rounded bg-emerald-600 text-white"
                            >
                              {props.enviandoId === op.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                            </button>
                            <button type="button" onClick={() => props.onLgpd(op)} className="px-2 py-1 rounded border text-slate-300">
                              LGPD
                            </button>
                            <button type="button" onClick={() => props.onRejeitar(op)} className="px-2 py-1 rounded bg-slate-700">
                              <XCircle className="w-3 h-3" />
                            </button>
                          </>
                        )}
                        {op.status === 'enviado_crm' && op.crmClienteId ? (
                          <Link to={`/clientes?id=${op.crmClienteId}`} className="px-2 py-1 rounded bg-sky-600 text-white flex items-center gap-1">
                            <User className="w-3 h-3" /> CRM
                          </Link>
                        ) : null}
                        {op.status === 'enviado_crm' && !op.crmClienteId ? (
                          <span className="text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Enviado
                          </span>
                        ) : null}
                        <button type="button" onClick={() => props.onRemove(op)} className="px-2 py-1 text-slate-500">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export type { FiltroLista }

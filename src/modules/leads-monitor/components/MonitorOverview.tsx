import { Activity, Bot, CheckCircle2, Send } from 'lucide-react'
import type { ProcessRun } from '../types/processRun'
import type { MonitorRunResult, PesquisaSalva } from '../types'
import { formatMonitorDateTime } from '../utils/datetime'

export function MonitorOverview(props: {
  online: boolean
  robotsAtivos: number
  robotsTotal: number
  campanhasAtivas: number
  campanhasPausadas?: number
  stats: {
    encontrados: number
    empresasHoje?: number
    novos?: number
    duplicados?: number
    enviados: number
    aprovados: number
    erros?: number
    fontesAtivas?: number
    pendentes?: number
  }
  ultimoResultado: MonitorRunResult | null
  run: ProcessRun | null
  pesquisas: PesquisaSalva[]
}) {
  const { online, robotsAtivos, robotsTotal, campanhasAtivas, stats, ultimoResultado, run } = props
  const cards = [
    { label: 'Monitor', value: online ? 'Online' : 'Offline', extra: online ? '🟢' : '⚪' },
    { label: 'Robôs', value: `${robotsAtivos}/${robotsTotal}`, extra: 'ativos' },
    { label: 'Campanhas ativas', value: String(campanhasAtivas) },
    { label: 'Campanhas pausadas', value: String(props.campanhasPausadas ?? 0) },
    { label: 'Leads hoje', value: String(stats.empresasHoje ?? 0) },
    { label: 'Encontrados', value: String(stats.encontrados) },
    { label: 'Novos', value: String(stats.novos ?? 0) },
    { label: 'Qualificados', value: String(stats.aprovados) },
    { label: 'Duplicados', value: String(stats.duplicados ?? 0) },
    { label: 'Enviados CRM', value: String(stats.enviados) },
    { label: 'Erros', value: String(stats.erros ?? 0) },
    { label: 'Cidades', value: `${run?.cidadesProcessadas || 0}/${run?.cidadesTotal || 0}` },
  ]
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-xl p-4 border"
            style={{ background: 'var(--code-surface)', borderColor: 'var(--code-border)' }}
          >
            <div className="text-[11px] uppercase tracking-wide text-slate-500">{c.label}</div>
            <div className="text-2xl font-bold tabular-nums text-white mt-1">{c.value}</div>
            {c.extra ? <div className="text-[11px] text-slate-400 mt-0.5">{c.extra}</div> : null}
          </div>
        ))}
      </div>
      <div
        className="rounded-xl p-4 border text-sm text-slate-300"
        style={{ background: 'var(--code-surface)', borderColor: 'var(--code-border)' }}
      >
        <div className="font-semibold text-white mb-2 flex items-center gap-2">
          <Activity className="w-4 h-4 text-nexus-orange" /> Atividade em tempo real
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
          <span>Robô: {run?.status || 'aguardando'}</span>
          <span>Campanha: {run?.nome || '—'}</span>
          <span>
            Local: {run?.filtrosSnapshot?.estado || '—'} → {run?.cidadeAtual || '—'}
            {run?.geoBairro ? ` → ${run.geoBairro}` : ''}
          </span>
          <span>CEP: {String(run?.geoCep || run?.filtrosSnapshot?.cep || '—')}</span>
          <span>Progresso: {run?.progresso || 0}%</span>
          <span>Cidades: {run?.cidadesProcessadas || 0}/{run?.cidadesTotal || 0}</span>
        </div>
        {ultimoResultado ? (
          <div className="mt-3 text-xs text-slate-400">
            Última busca · {ultimoResultado.encontrados} encontrados · {ultimoResultado.novos} novos ·{' '}
            {ultimoResultado.duplicados} duplicados · Fontes: {ultimoResultado.fontes.join(', ') || '—'}
          </div>
        ) : null}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        {[
          { icon: Bot, label: 'Processamento', value: run?.etapaAtual || '—' },
          { icon: Send, label: 'CRM', value: stats.enviados },
          { icon: CheckCircle2, label: 'Aprovados', value: stats.aprovados },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-xl p-3 border flex items-center gap-2"
            style={{ background: 'var(--code-surface)', borderColor: 'var(--code-border)' }}
          >
            <item.icon className="w-4 h-4 text-nexus-orange" />
            <div>
              <div className="text-slate-500">{item.label}</div>
              <div className="font-semibold text-white">{String(item.value)}</div>
            </div>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-slate-500">
        Atualizado {formatMonitorDateTime(new Date())} · {props.pesquisas.length} campanhas salvas
      </p>
      {props.pesquisas.length > 0 && (
        <div className="text-xs text-slate-400 space-y-1">
          <div className="font-semibold text-white">Resumo das campanhas</div>
          {props.pesquisas.slice(0, 8).map((p) => (
            <div key={p.id}>
              {p.ativa ? '🟢' : '⚪'} {p.nome} · {p.estado || '—'} {p.cidade || ''} · fontes{' '}
              {(p.fontesHabilitadas || []).join(', ') || 'todas'}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

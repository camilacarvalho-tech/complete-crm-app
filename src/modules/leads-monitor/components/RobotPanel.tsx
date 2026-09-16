import { PROCESS_STAGES, type ProcessRun, type ProcessRunStatus } from '../types/processRun'
import { formatMonitorTime } from '../utils/datetime'

const STATUS_LABEL: Record<ProcessRunStatus, string> = {
  aguardando: 'AGUARDANDO',
  processando: 'PROCESSANDO',
  pausado: 'PAUSADO',
  concluido: 'CONCLUÍDO',
  concluido_com_erros: 'CONCLUÍDO COM ERROS',
  erro: 'ERRO',
  cancelado: 'CANCELADO',
}

const STATUS_STYLE: Record<ProcessRunStatus, { color: string; bg: string; border: string }> = {
  aguardando: { color: '#cbd5e1', bg: 'var(--code-surface-muted)', border: 'var(--code-border)' },
  processando: { color: '#fdba74', bg: 'color-mix(in srgb, var(--code-orange) 18%, #111827)', border: 'var(--code-orange)' },
  pausado: { color: '#fde68a', bg: 'color-mix(in srgb, var(--code-yellow) 16%, #111827)', border: 'var(--code-yellow)' },
  concluido: { color: '#86efac', bg: 'color-mix(in srgb, var(--code-success) 18%, #111827)', border: 'var(--code-success)' },
  concluido_com_erros: { color: '#fdba74', bg: 'color-mix(in srgb, var(--code-orange) 16%, #111827)', border: 'var(--code-orange)' },
  erro: { color: '#fca5a5', bg: 'color-mix(in srgb, var(--code-danger) 18%, #111827)', border: 'var(--code-danger)' },
  cancelado: { color: '#94a3b8', bg: 'var(--code-surface-muted)', border: 'var(--code-border)' },
}

const CARDS: Array<{ key: string; label: string; read: (run: ProcessRun) => number }> = [
  { key: 'encontrados', label: 'Encontrados', read: (r) => Number(r.validos || 0) },
  { key: 'processados', label: 'Processados', read: (r) => Number(r.processados || 0) },
  { key: 'enriquecidos', label: 'Enriquecidos', read: (r) => Number(r.enriquecidos || 0) },
  { key: 'pessoas', label: 'Pessoas', read: (r) => Number(r.pessoasEncontradas || 0) },
  { key: 'qualificados', label: 'Qualificados', read: (r) => Number(r.qualificados || 0) },
  { key: 'duplicados', label: 'Duplicados', read: (r) => Number(r.duplicados || 0) },
  { key: 'pendencias', label: 'Pendências', read: (r) => Number(r.invalidos || 0) },
  { key: 'erros', label: 'Erros', read: (r) => Number(r.erros || 0) },
]

const ACTION_LABEL: Record<string, string> = {
  'job.enqueue': 'Job iniciado',
  'job.complete': 'Job concluído',
  'job.fail': 'Job com erro',
  'search.start': 'Consulta iniciada',
  'search.complete': 'Consulta concluída',
  'search.cancel': 'Cancelamento solicitado',
  'process.create': 'Processamento criado',
  'process.control': 'Controle do robô atualizado',
}

type ActivityItem = {
  id: string
  at?: unknown
  hora?: string
  action?: string
  message?: string
  entidade?: string
  entidadeId?: string
  meta?: Record<string, unknown> | null
}

function looksSensitive(text: string) {
  return /token|secret|password|senha|apikey|api_key|bearer|authorization/i.test(text)
}

function mapEtapaIndex(etapaAtual: string, status: ProcessRunStatus) {
  const exact = PROCESS_STAGES.indexOf(etapaAtual as (typeof PROCESS_STAGES)[number])
  if (exact >= 0) return exact
  const t = (etapaAtual || '').toLowerCase()
  if (/finaliz|conclu/.test(t)) return 7
  if (/qualif/.test(t)) return 6
  if (/pessoa/.test(t)) return 5
  if (/enriq|osm|overpass|buscando|cidade/.test(t)) return 4
  if (/dedup/.test(t)) return 3
  if (/valid/.test(t)) return 2
  if (/normal/.test(t)) return 1
  if (/receb|fila|inici/.test(t)) return 0
  if (status === 'processando' || status === 'aguardando') return 4
  if (status === 'concluido' || status === 'concluido_com_erros') return 7
  return -1
}

function cityMark(opts: { index: number; currentIndex: number; currentName?: string | null; city: string; status: ProcessRunStatus; lastError?: string | null }) {
  const { index, currentIndex, currentName, city, status, lastError } = opts
  const isCurrent = city === currentName || index === currentIndex
  if (status === 'erro' && isCurrent && lastError) return { mark: '✕', kind: 'erro' as const }
  if (status === 'concluido' || status === 'concluido_com_erros') return { mark: '✓', kind: 'ok' as const }
  if (index < currentIndex) return { mark: '✓', kind: 'ok' as const }
  if (isCurrent && (status === 'processando' || status === 'aguardando')) return { mark: '→', kind: 'now' as const }
  if (isCurrent && status === 'pausado') return { mark: '→', kind: 'now' as const }
  if (isCurrent && status === 'cancelado') return { mark: '○', kind: 'wait' as const }
  return { mark: '○', kind: 'wait' as const }
}

function activityText(item: ActivityItem) {
  const raw = String(item.message || ACTION_LABEL[String(item.action || '')] || item.action || '').trim()
  if (!raw || looksSensitive(raw)) return ''
  return raw.slice(0, 180)
}

const btn =
  'text-xs font-semibold px-3 py-2 rounded-lg disabled:opacity-50'
const btnGhost = `${btn} border`
const btnPrimary = `${btn} text-white`
const btnDanger = `${btn} text-white`

export function RobotPanel(props: {
  run: ProcessRun | null
  logs?: ActivityItem[]
  onStart: () => void
  onPause: () => void
  onResume: () => void
  onCancel: () => void
  onRetryErrors?: () => void
  starting?: boolean
}) {
  const run = props.run
  const status: ProcessRunStatus = run?.status || 'aguardando'
  const style = STATUS_STYLE[status]
  const working = status === 'processando'
  const etapaIdx = run ? mapEtapaIndex(run.etapaAtual, status) : -1
  const cities = run?.geoCities || []
  const cityIndex = run?.geoCityIndex || 0
  const relatedLogs = (props.logs || [])
    .filter((item) => {
      if (!run) return Boolean(activityText(item))
      const metaRun = String(item.meta?.processRunId || '')
      const ok =
        !metaRun ||
        metaRun === run.id ||
        item.entidadeId === run.id ||
        item.entidade === 'processRun' ||
        /search|job|process|geo/i.test(String(item.action || item.message || ''))
      return ok && Boolean(activityText(item))
    })
    .slice(0, 24)

  return (
    <section
      className="rounded-2xl p-5 space-y-4"
      style={{
        background: 'var(--code-surface)',
        border: '1px solid var(--code-card-border)',
        color: 'var(--code-text)',
      }}
      aria-label="Robô do Leads Monitor"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold" style={{ color: 'var(--code-text)' }}>
            🤖 ROBÔ DO LEADS MONITOR
          </h2>
          <p className="text-sm" style={{ color: 'var(--code-muted)' }}>
            Automação de prospecção, enriquecimento, validação e qualificação
          </p>
          {run ? (
            <p className="text-xs mt-1" style={{ color: 'var(--code-muted)' }}>
              {run.nome} · {run.origem}
              {run.abrangenciaGeografica ? ` · ${run.abrangenciaGeografica}` : ''}
            </p>
          ) : (
            <p className="text-xs mt-1" style={{ color: 'var(--code-muted)' }}>
              Nenhum processamento em curso. Configure os filtros e inicie.
            </p>
          )}
        </div>
        <div
          className="text-xs font-bold tracking-wide px-3 py-2 rounded-lg"
          style={{ color: style.color, background: style.bg, border: `1px solid ${style.border}` }}
        >
          {STATUS_LABEL[status]}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {status === 'aguardando' && (
          <button
            type="button"
            className={btnPrimary}
            style={{ background: 'var(--code-orange)' }}
            disabled={props.starting}
            onClick={run ? props.onResume : props.onStart}
          >
            Iniciar
          </button>
        )}
        {working && (
          <>
            <button type="button" className={btnGhost} style={{ borderColor: 'var(--code-border)' }} onClick={props.onPause}>
              Pausar
            </button>
            <button type="button" className={btnDanger} style={{ background: 'var(--code-danger)' }} onClick={props.onCancel}>
              Cancelar
            </button>
          </>
        )}
        {status === 'pausado' && (
          <>
            <button type="button" className={btnPrimary} style={{ background: 'var(--code-orange)' }} onClick={props.onResume}>
              Retomar
            </button>
            <button type="button" className={btnDanger} style={{ background: 'var(--code-danger)' }} onClick={props.onCancel}>
              Cancelar
            </button>
          </>
        )}
        {(status === 'concluido' || status === 'cancelado') && (
          <button type="button" className={btnPrimary} style={{ background: 'var(--code-orange)' }} disabled={props.starting} onClick={props.onStart}>
            Processar novamente
          </button>
        )}
        {status === 'concluido_com_erros' && props.onRetryErrors && (
          <button type="button" className={btnPrimary} style={{ background: 'var(--code-orange)' }} onClick={props.onRetryErrors}>
            Tentar novamente
          </button>
        )}
        {status === 'erro' && (
          <button
            type="button"
            className={btnPrimary}
            style={{ background: 'var(--code-orange)' }}
            onClick={props.onRetryErrors || props.onStart}
          >
            Tentar novamente
          </button>
        )}
      </div>

      <div>
        <div className="flex flex-wrap justify-between gap-2 text-xs mb-1" style={{ color: 'var(--code-muted)' }}>
          <span>Progresso geral: {run?.progresso || 0}%</span>
          <span>
            Registros: {run?.cursor || run?.processados || 0} / {run?.total || 0}
          </span>
          {run?.cidadesTotal ? (
            <span>
              Cidades: {run.cidadesProcessadas || 0} / {run.cidadesTotal}
            </span>
          ) : null}
        </div>
        <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--code-surface-muted)' }}>
          <div
            className="h-full transition-all"
            style={{ width: `${Math.min(100, run?.progresso || 0)}%`, background: 'var(--code-orange)' }}
          />
        </div>
        {run?.cidadeAtual ? (
          <p className="text-xs mt-1" style={{ color: 'var(--code-muted)' }}>
            Cidade atual: {run.cidadeAtual}
            {run.etapaAtual ? ` · ${run.etapaAtual}` : ''}
          </p>
        ) : null}
        {run?.lastError ? (
          <p className="text-xs mt-1" style={{ color: '#fca5a5' }}>
            {String(run.lastError).slice(0, 220)}
          </p>
        ) : null}
      </div>

      {run ? (
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-2">
          {CARDS.map((c) => (
            <div
              key={c.key}
              className="rounded-xl px-3 py-2"
              style={{ background: 'var(--code-surface-muted)', border: '1px solid var(--code-border)' }}
            >
              <div className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--code-muted)' }}>
                {c.label}
              </div>
              <div className="text-lg font-bold tabular-nums">{c.read(run)}</div>
            </div>
          ))}
        </div>
      ) : null}

      <div>
        <p className="text-xs font-semibold mb-2" style={{ color: 'var(--code-muted)' }}>
          Etapas
        </p>
        <ol className="grid grid-cols-2 md:grid-cols-4 gap-1 text-xs">
          {PROCESS_STAGES.map((s, i) => {
            const done =
              etapaIdx > i || status === 'concluido' || status === 'concluido_com_erros'
            const current = etapaIdx === i && (working || status === 'aguardando' || status === 'pausado')
            return (
              <li
                key={s}
                className={current ? 'font-semibold' : ''}
                style={{
                  color: current ? 'var(--code-orange)' : done ? '#86efac' : 'var(--code-muted)',
                }}
              >
                {done ? '✓' : current ? '→' : '○'} {s}
              </li>
            )
          })}
        </ol>
      </div>

      {cities.length > 0 ? (
        <div className="text-xs space-y-1">
          <p className="font-semibold" style={{ color: 'var(--code-muted)' }}>
            Fila de cidades
          </p>
          <p style={{ color: 'var(--code-muted)' }}>
            Cidades processadas: {run?.cidadesProcessadas || 0} / {run?.cidadesTotal || cities.length}
          </p>
          <ol className="space-y-0.5 max-h-40 overflow-auto">
            {cities.map((c, i) => {
              const mark = cityMark({
                index: i,
                currentIndex: cityIndex,
                currentName: run?.cidadeAtual,
                city: c,
                status,
                lastError: run?.lastError,
              })
              const color =
                mark.kind === 'ok' ? '#86efac' : mark.kind === 'now' ? 'var(--code-orange)' : mark.kind === 'erro' ? '#fca5a5' : 'var(--code-muted)'
              return (
                <li key={`${c}-${i}`} style={{ color }} className={mark.kind === 'now' ? 'font-semibold' : ''}>
                  {mark.mark} {i + 1}. {c}
                  {mark.kind === 'ok' ? ' · concluída' : mark.kind === 'now' && working ? ' · processando' : mark.kind === 'now' && status === 'pausado' ? ' · pausada' : mark.kind === 'erro' ? ' · erro' : ' · aguardando'}
                </li>
              )
            })}
          </ol>
        </div>
      ) : null}

      <div>
        <p className="text-xs font-semibold mb-2" style={{ color: 'var(--code-muted)' }}>
          ATIVIDADE DO ROBÔ
        </p>
        <ul
          className="text-xs space-y-1 max-h-40 overflow-auto rounded-lg p-3"
          style={{ background: 'var(--code-surface-muted)', border: '1px solid var(--code-border)' }}
        >
          {relatedLogs.map((item) => {
            const text = activityText(item)
            const time = item.hora || formatMonitorTime(item.at)
            return (
              <li key={item.id}>
                {time && time !== '—' ? `${time} — ` : ''}
                {text}
              </li>
            )
          })}
          {!relatedLogs.length && <li style={{ color: 'var(--code-muted)' }}>Sem eventos registrados para este processamento.</li>}
        </ul>
      </div>
    </section>
  )
}

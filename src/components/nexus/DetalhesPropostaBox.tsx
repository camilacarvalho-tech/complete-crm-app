import { useState } from 'react'
import { X } from 'lucide-react'
import { digitacaoStatusLabel, operationLabel, productCatalogLabel } from '../../catalog/productCatalog'
import { displayOperationalStatus, emptyLabel, formatCpfDisplay, formatMoney, formatPrazo, type HistoryEvent } from '../../modules/digitacao/digitacaoDesk'
import { labelPt } from '../../lib/uiPt'
import { toDate } from '../../lib/nexusCore'
import { useEscLayer } from '../../hooks/useEscLayer'
import '../../pages/digitacaoDesk.css'

type Rec = { id: string; [key: string]: unknown }
type StepId = 'assinatura' | 'averbacao' | 'averbado' | 'finalizado'

const STEPS: { id: StepId; label: string }[] = [
  { id: 'assinatura', label: 'Assinatura' },
  { id: 'averbacao', label: 'Averbação' },
  { id: 'averbado', label: 'Averbado' },
  { id: 'finalizado', label: 'Contrato finalizado' },
]

const FIELD_STEP: Record<string, StepId> = {
  statusAssinatura: 'assinatura',
  linkAssinatura: 'assinatura',
  assinaturaUrl: 'assinatura',
  statusAverbacao: 'averbacao',
  statusAverbado: 'averbado',
  statusPagamento: 'finalizado',
  statusContrato: 'finalizado',
}

function when(value: unknown) {
  const d = toDate(value)
  if (!d) return ''
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function readable(value: unknown) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  return labelPt(raw)
}

function isInternal(label: string) {
  return /^(registro criado|última atualização|ultima atualizacao|robô preencheu.*|status:?\s*alterado)$/i.test(label.trim())
}

function reached(text: string) {
  return Boolean(text) && !/aguard|penden|n[aã]o |nao |cancel|erro|bloquead|recus/i.test(text)
}

function stepOf(text: string): StepId | '' {
  const s = text.toLowerCase()
  if (/contrato final|finaliz|liquid|desembolso|pagamento confirm|opera[cç][aã]o finalizada/.test(s)) return 'finalizado'
  if (/averbad/.test(s)) return 'averbado'
  if (/averba/.test(s)) return 'averbacao'
  if (/assin|formaliz|inten[cç][aã]o enviada|proposta enviada|reenviando link/.test(s)) return 'assinatura'
  return ''
}

function grupoDe(text: string) {
  const s = text.toLowerCase()
  if (/finaliz|liquid|contrato final/.test(s)) return 'finalizado'
  if (/anu[eê]nc/.test(s)) return 'anuencia'
  if (/desbloque/.test(s)) return 'desbloqueio'
  if (/averb|reserva/.test(s)) return 'averbacao'
  if (/assin|formaliz/.test(s)) return 'assinatura'
  if (/video|v[ií]deo/.test(s)) return 'video'
  if (/document|an[aá]lise/.test(s)) return 'analise'
  if (/pagamento|pago|paga/.test(s)) return 'pagamento'
  if (/portabil/.test(s)) return 'portabilidade'
  return ''
}

const LINHA_ICRED = [
  { id: 'portabilidade', label: 'Aguardando Portabilidade' },
  { id: 'desbloqueio', label: 'Desbloqueio benefício' },
  { id: 'averbacao', label: 'Averbação' },
  { id: 'anuencia', label: 'Anuência' },
  { id: 'finalizado', label: 'Contrato finalizado' },
]

const FILTRO_RAPIDO = [
  { id: 'todos', label: 'Todos' },
  { id: 'analise', label: 'Análise documental' },
  { id: 'video', label: 'Vídeo chamada' },
  { id: 'averbacao', label: 'Averbação/Reserva' },
  { id: 'assinatura', label: 'Assinatura' },
  { id: 'pagamento', label: 'Pagamento' },
]

function eventosIcred(rec: Rec, historico: HistoryEvent[]) {
  const out: { at: string; grupo: string; evento: string; situacao: string }[] = []
  const push = (text: unknown, at: unknown, situacao?: unknown) => {
    const evento = readable(text)
    if (!evento || isInternal(evento)) return
    const stamp = when(at) || '—'
    if (out.some((e) => e.evento === evento && e.at === stamp)) return
    out.push({
      at: stamp,
      grupo: grupoDe(evento) || grupoDe(readable(situacao)),
      evento,
      situacao: readable(situacao) || '—',
    })
  }
  const hist = rec.historico
  if (Array.isArray(hist)) {
    for (const h of hist) {
      if (!h || typeof h !== 'object') continue
      const row = h as Record<string, unknown>
      push(row.evento || row.descricao || row.label || row.status, row.em || row.data || row.criadoEm, row.situacao || row.status)
    }
  }
  for (const ev of historico) push(ev.label, ev.at, rec.status)
  for (const key of ['statusInstituicao', 'statusBanco', 'statusOriginal', 'ultimoHistorico', 'mensagemSimulacao']) {
    push(rec[key], rec.atualizadoEm || rec.criadoEm, rec.status)
  }
  return out
}

function apiLines(rec: Rec, historico: HistoryEvent[]) {
  const lines: { step: StepId; text: string; at: string }[] = []
  const push = (step: StepId | '', text: unknown, at: unknown) => {
    const label = readable(text)
    if (!step || !label || isInternal(label)) return
    const stamp = when(at)
    if (lines.some((l) => l.step === step && l.text === label)) return
    lines.push({ step, text: label, at: stamp })
  }

  for (const [field, step] of Object.entries(FIELD_STEP)) {
    push(step, rec[field], rec.atualizadoEm || rec.criadoEm)
  }
  for (const key of ['statusInstituicao', 'statusBanco', 'statusOriginal', 'situacao', 'ultimoHistorico', 'mensagemSimulacao', 'status']) {
    const text = rec[key]
    push(stepOf(readable(text)), text, rec.atualizadoEm || rec.criadoEm)
  }

  const hist = rec.historico
  if (Array.isArray(hist)) {
    for (const h of hist) {
      if (!h || typeof h !== 'object') continue
      const row = h as Record<string, unknown>
      const text = row.status || row.situacao || row.descricao || row.label || row.evento || row.acao
      const bound = FIELD_STEP[String(row.etapa || row.fase || '')] || stepOf(readable(text))
      push(bound, text, row.em || row.criadoEm || row.data)
    }
  }
  for (const ev of historico) {
    push(stepOf(ev.label), ev.label, ev.at)
  }
  return lines
}

export function DetalhesPropostaBox({
  rec,
  clienteNome,
  historico,
  onClose,
  onOpenFull,
  embedded = false,
}: {
  rec: Rec
  clienteNome?: string
  historico: HistoryEvent[]
  onClose: () => void
  onOpenFull?: () => void
  embedded?: boolean
}) {
  useEscLayer(true, onClose)
  const [etapa, setEtapa] = useState<StepId | null>(null)
  const [filtro, setFiltro] = useState('todos')
  const status = digitacaoStatusLabel(String(rec.status || '')) || displayOperationalStatus(rec)
  const tipo = operationLabel(String(rec.operacao || '')) || emptyLabel(rec.operacao, 'Não informado')
  const nome = clienteNome || String(rec.clienteNome || 'Cliente')
  const linhas = apiLines(rec, historico)
  const aberta = etapa ? linhas.filter((l) => l.step === etapa) : []
  const etapaLabel = STEPS.find((s) => s.id === etapa)?.label || ''
  const eventos = eventosIcred(rec, historico)
  const filtroAtivo = FILTRO_RAPIDO.some((f) => f.id === filtro) ? filtro : 'todos'
  const visiveis = filtroAtivo === 'todos' ? eventos : eventos.filter((e) => e.grupo === filtroAtivo)
  const passos = embedded ? LINHA_ICRED : STEPS

  const painel = (
    <aside className={embedded ? 'proposta-caixa embedded' : 'proposta-caixa'} role="dialog" aria-label="Detalhes da proposta" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Detalhes da proposta</p>
            <p className="text-[11px] mt-1" style={{ color: 'var(--code-muted)' }}>
              {productCatalogLabel(String(rec.produto || '')) || emptyLabel(rec.produto, 'Produto não informado')}
              {' · '}
              {emptyLabel(rec.banco || rec.instituicao, 'Instituição não informada')}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold">{nome}</p>
            <p className="text-[11px]" style={{ color: 'var(--code-muted)' }}>{rec.cpf ? formatCpfDisplay(String(rec.cpf)) : ''}</p>
          </div>
          <button type="button" aria-label="Fechar" onClick={onClose}><X className="w-4 h-4" /></button>
        </header>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12px]">
          <span>Status atual: <b>{status}</b></span>
          <span>Tipo: <b>{tipo}</b></span>
          {embedded ? <span className="status-pill">{status}</span> : null}
          <span>Parcela: <b>{rec.parcela == null || rec.parcela === '' ? 'Não informado' : formatMoney(rec.parcela)}</b></span>
          <span>Prazo: <b>{formatPrazo(rec.prazo)}</b></span>
        </div>

        <div className="proposta-caixa-steps">
          {passos.map((step, i) => {
            const daEtapa = embedded
              ? eventos.filter((e) => e.grupo === step.id)
              : linhas.filter((l) => l.step === (step.id as StepId))
            const on = daEtapa.some((l) => reached('text' in l ? l.text : l.evento))
            const at = daEtapa.find((l) => l.at && l.at !== '—')?.at || ''
            const ativo = embedded ? filtroAtivo === step.id : etapa === step.id
            return (
              <button
                key={step.id}
                type="button"
                className={`proposta-caixa-step${ativo ? ' sel' : ''}`}
                onClick={() => embedded ? setFiltro(step.id) : setEtapa(step.id as StepId)}
              >
                <span className={on ? 'dot on' : 'dot'} />
                {i < passos.length - 1 ? <span className={on ? 'line on' : 'line'} /> : null}
                <p>{step.label}</p>
                {on && at ? <small>{at}</small> : null}
              </button>
            )
          })}
        </div>

        {embedded ? (
          <>
            <div className="flex flex-wrap gap-3 mt-3 text-[12px]">
              {FILTRO_RAPIDO.map((f) => (
                <label key={f.id} className="inline-flex items-center gap-1 cursor-pointer">
                  <input type="radio" name="filtro-rapido" checked={filtroAtivo === f.id} onChange={() => setFiltro(f.id)} />
                  {f.label}
                </label>
              ))}
            </div>
            <div className="desk-table-wrap mt-3">
              {visiveis.length === 0 ? (
                <p className="text-[12px] py-2">A API ainda não retornou eventos desta etapa para este cliente.</p>
              ) : (
                <table className="icred-eventos">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Grupo de atividade</th>
                      <th>Evento</th>
                      <th>Situação</th>
                      <th>Histórico</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visiveis.map((ev, i) => (
                      <tr key={`${ev.evento}-${i}`}>
                        <td>{ev.at}</td>
                        <td>{FILTRO_RAPIDO.find((f) => f.id === ev.grupo)?.label || LINHA_ICRED.find((f) => f.id === ev.grupo)?.label || '—'}</td>
                        <td>{ev.evento}</td>
                        <td>{ev.situacao}</td>
                        <td>{ev.evento}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        ) : (
          <div className="proposta-etapa-painel">
            {!etapa ? (
              <p>Clique em Assinatura, Averbação, Averbado ou Contrato finalizado para ver o status que a API retornou deste cliente.</p>
            ) : (
              <>
                <p className="font-semibold">{etapaLabel}</p>
                {aberta.length === 0 ? (
                  <p className="mt-1">A API ainda não retornou o status desta etapa para este cliente.</p>
                ) : (
                  <ul className="mt-1 space-y-1">
                    {aberta.map((linha, i) => (
                      <li key={`${linha.text}-${i}`}>
                        {linha.at ? <span style={{ color: 'var(--code-muted)' }}>{linha.at} </span> : null}
                        {linha.text}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        )}

        {onOpenFull ? (
          <button type="button" className="text-[12px] mt-3 font-semibold" style={{ color: 'var(--code-orange)' }} onClick={onOpenFull}>
            Abrir ficha completa
          </button>
        ) : null}
    </aside>
  )

  if (embedded) return painel
  return (
    <div className="proposta-caixa-overlay" onClick={onClose}>
      {painel}
    </div>
  )
}

import { labelPt } from '../../lib/uiPt.ts'

function digits(value?: string): string {
  return String(value || '').replace(/\D/g, '')
}

function toDate(value: unknown): Date | null {
  if (!value) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? null : d
  }
  if (typeof value === 'object' && value && 'toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
    try {
      return (value as { toDate: () => Date }).toDate()
    } catch {
      return null
    }
  }
  if (typeof value === 'object' && value && 'seconds' in value) {
    return new Date(Number((value as { seconds: number }).seconds) * 1000)
  }
  return null
}

export type DeskRecord = { id: string; [key: string]: unknown }

export function formatCpfDisplay(value?: string): string {
  const d = digits(value)
  if (d.length !== 11) return String(value || '').trim()
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

export function isCompleteCpf(query: string): boolean {
  return digits(query).length === 11
}

export function matchClientes<T extends { id: string; nome?: string; cpf?: string }>(
  items: T[],
  query: string,
  limit = 8
): T[] {
  const q = String(query || '').trim().toLowerCase()
  if (!q) return items.slice(0, limit)
  const qd = digits(q)
  return items
    .filter((c) => {
      const nome = String(c.nome || '').toLowerCase()
      const cpf = digits(c.cpf)
      if (qd && cpf.includes(qd)) return true
      if (!qd && nome.includes(q)) return true
      if (qd && nome.includes(q)) return true
      if (!qd && nome.includes(q.replace(/\s+/g, ' '))) return true
      return nome.includes(q)
    })
    .slice(0, limit)
}

export function findExactCliente<T extends { id: string; cpf?: string }>(items: T[], query: string): T | null {
  const d = digits(query)
  if (d.length !== 11) return null
  const hits = items.filter((c) => digits(c.cpf) === d)
  return hits.length === 1 ? hits[0] : hits[0] || null
}

export function emptyLabel(value: unknown, missing = 'Não informado'): string {
  if (value == null) return missing
  const s = String(value).trim()
  return s ? s : missing
}

export function formatMoney(value: unknown): string {
  if (value == null || value === '') return 'Não informado'
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }
  const s = String(value).trim()
  if (!s) return 'Não informado'
  if (/r\$/i.test(s) || /%/.test(s)) return s
  const n = Number(String(s).replace(/\./g, '').replace(',', '.'))
  if (Number.isFinite(n) && /^-?\d+([.,]\d+)?$/.test(s.replace(/\s/g, ''))) {
    return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }
  return s
}

export function formatPrazo(value: unknown): string {
  if (value == null || value === '') return 'Não informado'
  const s = String(value).trim()
  if (!s) return 'Não informado'
  if (/x|mes/i.test(s)) return s
  return `${s}x`
}

export function displayOperationalStatus(rec: DeskRecord): string {
  const crm = String(rec.status || rec.statusProposta || '').trim()
  if (crm) return labelPt(crm)
  const inst = String(rec.statusInstituicao || rec.statusBanco || rec.statusOriginal || rec.statusAssinatura || '').trim()
  return inst || 'Não informado'
}

export type FieldSource = 'Instituição' | 'Cliente' | ''

export function sourcedField(opts: {
  value: unknown
  fromInstitution?: boolean
  fromCliente?: boolean
  waitingInstitution?: boolean
}): { value: string; source: FieldSource; missing: boolean } {
  const empty = opts.value == null || String(opts.value).trim() === ''
  if (empty && opts.waitingInstitution && opts.fromInstitution) {
    return { value: 'Não retornado pela instituição', source: '', missing: true }
  }
  if (empty) return { value: 'Não informado', source: '', missing: true }
  const source: FieldSource = opts.fromInstitution ? 'Instituição' : opts.fromCliente ? 'Cliente' : ''
  return { value: String(opts.value).trim(), source, missing: false }
}

export function digitacaoKey(rec: DeskRecord): string {
  return [
    String(rec.clienteId || 'sem-cliente'),
    String(rec.banco || rec.instituicao || ''),
    String(rec.produto || ''),
    String(rec.operacao || ''),
  ]
    .join(':')
    .toLowerCase()
}

export function proposalsForCliente(
  digitacoes: DeskRecord[],
  propostas: DeskRecord[],
  cliente: { id: string; cpf?: string }
): DeskRecord[] {
  const id = cliente.id
  const cpf = digits(cliente.cpf)
  const fromDig = digitacoes.filter(
    (d) => String(d.clienteId || '') === id || (cpf && digits(String(d.cpf || '')) === cpf)
  )
  const keys = new Set(fromDig.map(digitacaoKey))
  const fromProp = propostas.filter((p) => {
    const match = String(p.clienteId || '') === id || (cpf && digits(String(p.cpf || '')) === cpf)
    if (!match) return false
    return !keys.has(digitacaoKey(p))
  })
  return [...fromDig, ...fromProp]
}

export function buildPendencias(opts: {
  rec: DeskRecord
  docs: DeskRecord[]
}): string[] {
  const out: string[] = []
  const st = displayOperationalStatus(opts.rec)
  const msg = String(opts.rec.mensagemSimulacao || opts.rec.status || '')
  if (/aguardando api/i.test(msg) || String(opts.rec.mensagemSimulacao || '') === 'Aguardando API') {
    out.push('Aguardando API')
  }
  if (/aguardando assinatura/i.test(st)) out.push('Aguardando assinatura')
  const pendingDocs = opts.docs.filter((d) => /pendente|pendencia/i.test(String(d.status || '')))
  for (const d of pendingDocs) {
    out.push(`Documento pendente: ${String(d.nome || d.categoria || d.id)}`)
  }
  const instFields = ['parcela', 'prazo', 'valorLiberado', 'contrato', 'saldoDevedor']
  const waiting = /aguardando api|não retornado|nao retornado/i.test(msg)
  if (waiting) {
    const missing = instFields.some((k) => opts.rec[k] == null || String(opts.rec[k]).trim() === '')
    if (missing) out.push('Campo não retornado pela instituição')
  }
  return [...new Set(out)]
}

export type HistoryEvent = { at: Date | null; label: string }

export function buildHistory(opts: {
  rec: DeskRecord
  auditoria: DeskRecord[]
}): HistoryEvent[] {
  const events: HistoryEvent[] = []
  const id = opts.rec.id
  for (const a of opts.auditoria) {
    if (String(a.entidadeId || a.recordId || '') !== id) continue
    events.push({
      at: toDate(a.criadoEm || a.created_at),
      label: String(a.acao || a.evento || a.descricao || '').trim(),
    })
  }
  const hist = opts.rec.historico
  if (Array.isArray(hist)) {
    for (const h of hist) {
      if (!h || typeof h !== 'object') continue
      const row = h as Record<string, unknown>
      const label = String(row.label || row.acao || row.evento || '').trim()
      if (!label) continue
      events.push({ at: toDate(row.em || row.criadoEm || row.data), label })
    }
  }
  if (opts.rec.criadoEm) events.push({ at: toDate(opts.rec.criadoEm), label: 'Registro criado' })
  if (opts.rec.atualizadoEm) events.push({ at: toDate(opts.rec.atualizadoEm), label: 'Última atualização' })
  if (opts.rec.mensagemSimulacao) {
    events.push({ at: toDate(opts.rec.atualizadoEm || opts.rec.criadoEm), label: String(opts.rec.mensagemSimulacao) })
  }
  if (opts.rec.preenchidoPorRobo) {
    events.push({ at: toDate(opts.rec.atualizadoEm || opts.rec.criadoEm), label: 'Robô preencheu os campos disponíveis' })
  }
  return events
    .filter((e) => e.label)
    .sort((a, b) => (a.at?.getTime() || 0) - (b.at?.getTime() || 0))
}

export function waitingInstitution(rec: DeskRecord): boolean {
  return /aguardando api|aguardando integração|aguardando integracao/i.test(
    `${rec.mensagemSimulacao || ''} ${rec.status || ''}`
  )
}

export function hasSignatureBlock(rec: DeskRecord): boolean {
  const st = displayOperationalStatus(rec)
  return /aguardando assinatura/i.test(st) || Boolean(rec.linkAssinatura || rec.assinaturaUrl || rec.dataEnvioAssinatura)
}

export function documentOpenUrl(doc: DeskRecord): string {
  return String(doc.url || doc.link || doc.arquivoUrl || doc.downloadUrl || doc.href || '').trim()
}

export function docsForProposal(docs: DeskRecord[], rec: DeskRecord): DeskRecord[] {
  const cid = String(rec.clienteId || '')
  const pid = String(rec.id || '')
  return docs.filter((d) => {
    const ids = [d.propostaId, d.digitacaoId, d.entidadeId, d.recordId]
    if (pid && ids.some((x) => String(x || '') === pid)) return true
    return Boolean(cid) && String(d.clienteId || '') === cid
  })
}

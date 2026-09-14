import { originCode, originLabel } from '../catalog/crmCatalog'
import { createdOf, inRange, normalizeStage, stageIdFromLegacy, toDate } from './nexusCore'
import type { NexusCliente, NexusRecord } from '../types/nexus'

export const ORIGIN_COLORS: Record<string, string> = {
  'TRÁFEGO PAGO': '#f97316',
  FACEBOOK: '#2563eb',
  INSTAGRAM: '#7c3aed',
  WHATSAPP: '#16a34a',
  INDICAÇÃO: '#eab308',
  ORGÂNICO: '#06b6d4',
  'LANDING PAGE': '#22d3ee',
  'LEADS MONITOR': '#0ea5e9',
  GOOGLE: '#2563eb',
  SITE: '#64748b',
  'FOLLOW-UP': '#d97706',
  CAMPANHA: '#f59e0b',
  API: '#7c3aed',
  MANUAL: '#94a3b8',
  OUTROS: '#475569',
}

export const CODE_PALETTE = ['#f97316', '#2563eb', '#7c3aed', '#06b6d4', '#16a34a', '#eab308', '#22d3ee', '#dc2626']

export function colorFor(name: string, i: number) {
  return ORIGIN_COLORS[name] || CODE_PALETTE[i % CODE_PALETTE.length]
}

export function stageOf(c: NexusCliente) {
  return normalizeStage(String(c.pipelineStage || stageIdFromLegacy(c.status, c.pipeline)))
}

export function productOf(c: NexusCliente) {
  return String(c.subproduto || c.modalidade || c.produto || (c.modalidades || [])[0] || '').trim()
}

export function countBy(items: string[]) {
  const map = new Map<string, number>()
  items.forEach((k) => {
    if (!k) return
    map.set(k, (map.get(k) || 0) + 1)
  })
  const total = [...map.values()].reduce((s, n) => s + n, 0)
  return [...map.entries()]
    .map(([name, value]) => ({ name, value, total, pct: total ? (value / total) * 100 : 0 }))
    .sort((a, b) => b.value - a.value)
}

export function filterPeriod<T extends { criadoEm?: unknown; created_at?: unknown; data?: unknown }>(items: T[], from: Date, to: Date) {
  return items.filter((i) => {
    const c = createdOf(i)
    return !c || inRange(c, from, to)
  })
}

export function leadsByDay(clientes: NexusCliente[]) {
  const map = new Map<string, number>()
  clientes.forEach((c) => {
    const d = toDate(createdOf(c))
    if (!d) return
    const key = d.toISOString().slice(0, 10)
    map.set(key, (map.get(key) || 0) + 1)
  })
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([dia, qtd]) => ({ dia: dia.slice(5), qtd, full: dia }))
}

export function evolutionByOrigin(clientes: NexusCliente[]) {
  const days = new Map<string, Record<string, number>>()
  clientes.forEach((c) => {
    const d = toDate(createdOf(c))
    if (!d) return
    const day = d.toISOString().slice(5, 10)
    const origin = originLabel(originCode(String(c.source || c.origem || 'manual')))
    const row = days.get(day) || {}
    row[origin] = (row[origin] || 0) + 1
    days.set(day, row)
  })
  return [...days.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([dia, vals]) => ({ dia, ...vals }))
}

export function exportCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return
  const keys = Object.keys(rows[0])
  const body = [keys.join(';'), ...rows.map((r) => keys.map((k) => String(r[k] ?? '')).join(';'))].join('\n')
  const blob = new Blob(['\uFEFF' + body], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename.endsWith('.csv') || filename.endsWith('.xlsx') ? filename : `${filename}.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}

export function exportPdf(title: string, rows: Record<string, unknown>[]) {
  const keys = rows[0] ? Object.keys(rows[0]) : []
  const html = `<html><head><title>${title}</title></head><body><h1>${title}</h1><table border="1" cellpadding="6">${
    keys.length ? `<tr>${keys.map((k) => `<th>${k}</th>`).join('')}</tr>${rows.map((r) => `<tr>${keys.map((k) => `<td>${String(r[k] ?? '')}</td>`).join('')}</tr>`).join('')}` : '<p>Sem dados para este período.</p>'
  }</table></body></html>`
  const w = window.open('', '_blank')
  if (!w) return
  w.document.write(html)
  w.document.close()
  w.focus()
  w.print()
}

export function sumMoney(items: NexusRecord[], tipo?: string) {
  return items
    .filter((t) => !tipo || String(t.tipo) === tipo)
    .reduce((s, t) => s + Number(t.valor || 0), 0)
}

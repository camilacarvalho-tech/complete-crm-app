/**
 * Data/hora do Leads Monitor.
 * Persistência: Firestore Timestamp / ISO UTC.
 * UI: America/Sao_Paulo, pt-BR.
 */

export const MONITOR_TZ = 'America/Sao_Paulo'
export const MONITOR_LOCALE = 'pt-BR'

function asDate(value: unknown): Date | null {
  if (value == null || value === '') return null
  if (value instanceof Date && Number.isFinite(value.getTime())) return value
  if (typeof value === 'number' && Number.isFinite(value)) {
    const ms = value < 1e12 ? value * 1000 : value
    const d = new Date(ms)
    return Number.isFinite(d.getTime()) ? d : null
  }
  if (typeof value === 'string') {
    const d = new Date(value)
    return Number.isFinite(d.getTime()) ? d : null
  }
  const ts = value as { toDate?: () => Date; toMillis?: () => number; seconds?: number }
  if (typeof ts.toDate === 'function') {
    const d = ts.toDate()
    return Number.isFinite(d.getTime()) ? d : null
  }
  if (typeof ts.toMillis === 'function') {
    const d = new Date(ts.toMillis())
    return Number.isFinite(d.getTime()) ? d : null
  }
  if (typeof ts.seconds === 'number') {
    const d = new Date(ts.seconds * 1000)
    return Number.isFinite(d.getTime()) ? d : null
  }
  return null
}

function partsInTz(date: Date): { date: string; time: string; dateTime: string } {
  const dateFmt = new Intl.DateTimeFormat(MONITOR_LOCALE, {
    timeZone: MONITOR_TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  const timeFmt = new Intl.DateTimeFormat(MONITOR_LOCALE, {
    timeZone: MONITOR_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const dateStr = dateFmt.format(date)
  const timeStr = timeFmt.format(date)
  return { date: dateStr, time: timeStr, dateTime: `${dateStr} ${timeStr}` }
}

export function formatMonitorDate(value: unknown): string {
  const d = asDate(value)
  return d ? partsInTz(d).date : '—'
}

export function formatMonitorTime(value: unknown): string {
  const d = asDate(value)
  return d ? partsInTz(d).time : '—'
}

export function formatMonitorDateTime(value: unknown): string {
  const d = asDate(value)
  return d ? partsInTz(d).dateTime : '—'
}

export function formatMonitorRelative(value: unknown, now = new Date()): string {
  const d = asDate(value)
  if (!d) return '—'
  const diffMs = now.getTime() - d.getTime()
  if (diffMs < 15_000 && diffMs > -15_000) return 'agora'
  const abs = Math.abs(diffMs)
  const min = Math.round(abs / 60_000)
  const hour = Math.round(abs / 3_600_000)
  const day = Math.round(abs / 86_400_000)
  if (min < 60) return diffMs >= 0 ? `há ${min} min` : `em ${min} min`
  if (hour < 24) return diffMs >= 0 ? `há ${hour} h` : `em ${hour} h`
  if (day < 7) return diffMs >= 0 ? `há ${day} d` : `em ${day} d`
  return formatMonitorDateTime(d)
}

export function nowIsoUtc(): string {
  return new Date().toISOString()
}

export function auditDateUtc(value: Date = new Date()): string {
  return value.toISOString().slice(0, 10)
}

export function auditTimeSaoPaulo(value: Date = new Date()): string {
  return partsInTz(value).time
}

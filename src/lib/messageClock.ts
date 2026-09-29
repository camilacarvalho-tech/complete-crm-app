function diaLocal(value: Date): number {
  return value.getFullYear() * 10000 + value.getMonth() * 100 + value.getDate()
}

/** Horário da lista, no mesmo critério do WhatsApp: hora hoje, Ontem, dia da semana ou data. */
export function formatMessageClock(value: Date | null, now = new Date()): string {
  if (!value || Number.isNaN(value.getTime())) return ''
  const hm = value.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const diff = diaLocal(now) - diaLocal(value)
  if (diff === 0) return hm
  if (diff === 1) return 'Ontem'
  if (diff > 1 && diff < 7) return value.toLocaleDateString('pt-BR', { weekday: 'long' })
  return value.toLocaleDateString('pt-BR')
}

/** Sempre HH:mm no fuso local do timestamp gravado. */
export function horaMensagem(value: Date | null): string {
  if (!value || Number.isNaN(value.getTime())) return ''
  return value.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

/** Separador de dia: Hoje, Ontem ou dd/MM/yyyy. */
export function rotuloDiaMensagem(value: Date | null, now = new Date()): string {
  if (!value || Number.isNaN(value.getTime())) return ''
  const diff = diaLocal(now) - diaLocal(value)
  if (diff === 0) return 'Hoje'
  if (diff === 1) return 'Ontem'
  return value.toLocaleDateString('pt-BR')
}

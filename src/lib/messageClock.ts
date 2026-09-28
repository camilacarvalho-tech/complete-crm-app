function diaLocal(value: Date): number {
  return value.getFullYear() * 10000 + value.getMonth() * 100 + value.getDate()
}

/** Horário local do timestamp da mensagem. Não troca o instante gravado. */
export function formatMessageClock(value: Date | null, now = new Date()): string {
  if (!value || Number.isNaN(value.getTime())) return ''
  const hm = value.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const diff = diaLocal(now) - diaLocal(value)
  if (diff === 0) return hm
  if (diff === 1) return `Ontem ${hm}`
  return `${value.toLocaleDateString('pt-BR')} ${hm}`
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

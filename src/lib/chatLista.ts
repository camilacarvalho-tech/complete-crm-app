export function instanteChat(value: unknown): number {
  if (!value) return 0
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? 0 : value.getTime()
  if (typeof value === 'object' && value && 'toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
    try {
      const d = (value as { toDate: () => Date }).toDate()
      return Number.isNaN(d.getTime()) ? 0 : d.getTime()
    } catch {
      return 0
    }
  }
  if (typeof value === 'object' && value && 'seconds' in value) return Number((value as { seconds: number }).seconds) * 1000
  const n = Date.parse(String(value))
  return Number.isFinite(n) ? n : 0
}

export function teclaEnviaMensagem(key: string, shift: boolean): 'enviar' | 'linha' | 'ignorar' {
  if (key !== 'Enter') return 'ignorar'
  return shift ? 'linha' : 'enviar'
}

export function conversaFinalizada(conversa: { status?: unknown; statusAtendimento?: unknown } | null | undefined): boolean {
  const status = String(conversa?.status || '')
  const atendimento = String(conversa?.statusAtendimento || '')
  return status === 'finalizado' || atendimento === 'FINALIZADO'
}

export function naoLidasDe(conversa: { naoLidas?: unknown; unreadCount?: unknown }): number {
  const a = Number(conversa.naoLidas)
  const b = Number(conversa.unreadCount)
  const n = Math.max(Number.isFinite(a) ? a : 0, Number.isFinite(b) ? b : 0)
  return n > 0 ? n : 0
}

export function ordenarConversas<T extends { id: string; atualizadoEm?: unknown; criadoEm?: unknown }>(
  items: T[],
  ultimaMensagemEm: (id: string) => number = () => 0,
): T[] {
  return items.slice().sort((a, b) => {
    const tb = Math.max(instanteChat(b.atualizadoEm), instanteChat(b.criadoEm), ultimaMensagemEm(b.id))
    const ta = Math.max(instanteChat(a.atualizadoEm), instanteChat(a.criadoEm), ultimaMensagemEm(a.id))
    return tb - ta
  })
}

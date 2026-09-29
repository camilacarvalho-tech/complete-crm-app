/** Contrato CRM → NX ERP para resposta do atendente. Não chama a Meta. */

export function digitsPhone(value: string): string {
  return String(value || '').replace(/\D/g, '')
}

export function phoneError(value: string): string | null {
  const digits = digitsPhone(value)
  if (!digits) return 'Telefone ausente'
  if (digits.length < 10 || digits.length > 15) return 'Telefone inválido'
  return null
}

export function newClientMessageId(): string {
  return `crm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function botaoLista(valor?: string): string {
  const texto = String(valor || '').trim()
  if (texto && texto.length <= 20) return texto
  return 'Escolha modalidade'
}

export function buildRespostaChat(input: {
  crmMensagemId: string
  telefone: string
  texto: string
  operador?: string
  conversaId?: string
  clienteId?: string
  audioBase64?: string
  audioMime?: string
  midiaBase64?: string
  midiaMime?: string
  midiaNome?: string
  midiaLegenda?: string
  replyToWamid?: string
  lista?: { id: string; title: string }[]
  listaBotao?: string
  listaTitulo?: string
}) {
  const texto = String(input.texto || '').trim()
  const audio = String(input.audioBase64 || '').trim()
  const midia = String(input.midiaBase64 || '').trim()
  const lista = (input.lista || [])
    .map((item) => ({ id: String(item.id || '').trim().slice(0, 200), title: String(item.title || '').trim().slice(0, 24) }))
    .filter((item) => item.id && item.title)
    .slice(0, 10)
  return {
    tipo: 'resposta_chat' as const,
    crm_mensagem_id: String(input.crmMensagemId || '').trim(),
    telefone: digitsPhone(input.telefone),
    texto,
    mensagem: texto,
    operador: String(input.operador || 'Atendente CRM').trim() || 'Atendente CRM',
    conversaId: String(input.conversaId || ''),
    clienteId: String(input.clienteId || ''),
    ...(audio ? { audio_base64: audio, audio_mime: String(input.audioMime || 'audio/ogg') } : {}),
    ...(midia ? {
      midia_base64: midia,
      midia_mime: String(input.midiaMime || 'application/octet-stream'),
      midia_nome: String(input.midiaNome || 'arquivo'),
      midia_legenda: String(input.midiaLegenda || ''),
    } : {}),
    ...(String(input.replyToWamid || '').trim() ? { reply_to_wamid: String(input.replyToWamid).trim() } : {}),
    ...(lista.length ? {
      lista,
      lista_botao: botaoLista(input.listaBotao),
      lista_titulo: String(input.listaTitulo || 'Escolha sua modalidade').trim().slice(0, 24) || 'Escolha sua modalidade',
    } : {}),
  }
}

export function outboundStatus(ok: boolean): 'sent' | 'failed' {
  return ok ? 'sent' : 'failed'
}

export function deliveryMark(status?: string): 'pending' | 'sending' | 'sent' | 'delivered' | 'read' | 'failed' {
  const value = String(status || '').toLowerCase()
  if (value === 'read' || value === 'lida') return 'read'
  if (value === 'delivered' || value === 'entregue') return 'delivered'
  if (value === 'sent' || value === 'enviado' || value === 'aceito') return 'sent'
  if (value === 'sending') return 'sending'
  if (value === 'failed' || value === 'falha' || value === 'erro') return 'failed'
  return 'pending'
}

export function deliveryLabel(status?: string): string {
  const mark = deliveryMark(status)
  if (mark === 'read') return 'Lida'
  if (mark === 'delivered') return 'Entregue'
  if (mark === 'sent') return 'Enviada'
  if (mark === 'sending') return 'Enviando...'
  if (mark === 'failed') return 'Falhou'
  return 'Pendente'
}

export function deliveryGlyph(status?: string): string {
  const mark = deliveryMark(status)
  if (mark === 'read' || mark === 'delivered') return '✓✓'
  if (mark === 'sent') return '✓'
  if (mark === 'failed') return '!'
  if (mark === 'sending') return '…'
  return '◷'
}

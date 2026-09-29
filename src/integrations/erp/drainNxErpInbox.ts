import { collection, getDocs, query, serverTimestamp, updateDoc, where } from 'firebase/firestore'
import { db } from '../../firebase'
import { gravarMensagemRecebida, handleInboundErpMessage, type InboundErpPayload, type SaidaRobo } from '../../lib/inboundErpMessage'
import { handleErpToCrmEvent } from '../events/eventHandlers'
import { LETICIA_MENU_BOTAO, LETICIA_MENU_TITULO } from '../../modules/chat-robot/leticiaReception'
import { buildRespostaChat } from './chatOutbound'
import { postNxErpEvento } from './nxErpCrmClient'
import { mapCampaignEvent, mapInboundMessage, nxErpStatus } from './nxErpInbox'

type Queued = { id: string; kind: 'mensagem' | 'evento'; body: Record<string, unknown> }

export type MemoriaInbox = {
  clientes: { id: string; telefone?: string; whatsapp?: string; telefoneNormalizado?: string }[]
  conversas: {
    id: string
    clienteId?: string
    canal?: string
    status?: string
    statusAtendimento?: string
    roboPausado?: boolean
    robotPaused?: boolean
    robotState?: string
    botWelcomeSent?: boolean
    leticiaStep?: string
    etapa?: string
    botState?: { active?: boolean; flow?: string; step?: string }
    botAtivo?: boolean
    atendimentoHumano?: boolean
    welcomeSentAt?: string
    assignedTo?: string
  }[]
  mensagens: { id?: string; wamid?: string; messageId?: string; texto?: string; processedByLeticia?: boolean }[]
  conversaAbertaId?: string
}

async function applyStatus(empresaId: string, body: Record<string, unknown>) {
  const status = nxErpStatus(body.status)
  const key = String(body.wamid || body.message_id || body.messageId || '').trim()
  if (!status || !key) return
  const snap = await getDocs(
    query(collection(db, 'empresas', empresaId, 'mensagens'), where('messageId', '==', key))
  )
  for (const item of snap.docs) {
    await updateDoc(item.ref, { erpStatus: status, atualizadoEm: serverTimestamp() })
  }
}

async function applyItem(empresaId: string, item: Queued, memoria?: MemoriaInbox) {
  if (item.kind === 'mensagem') {
    const mapped = mapInboundMessage(item.body)
    const payload: InboundErpPayload = { ...mapped, replyToWamid: mapped.replyToWamid }
    if (memoria) {
      const saida = await gravarMensagemRecebida(empresaId, payload, memoria)
      if (saida) await publicarLeticia(empresaId, saida)
      return
    }
    await handleInboundErpMessage(empresaId, payload)
    return
  }
  const tipo = String(item.body.tipo || item.body.type || '').trim().toLowerCase()
  const event = mapCampaignEvent(tipo)
  if (tipo === 'mensagem_entregue' || tipo === 'mensagem_lida' || tipo === 'mensagem_falhou' || tipo === 'mensagem_enviada') {
    await applyStatus(empresaId, item.body)
    return
  }
  if (event === 'message_received') {
    await handleInboundErpMessage(empresaId, mapInboundMessage(item.body))
    return
  }
  if (!event) return
  const mapped = mapInboundMessage(item.body)
  await handleErpToCrmEvent({
    empresaId,
    type: event,
    direction: 'erp_to_crm',
    idempotencyKey: mapped.messageId || item.id,
    payload: {
      ...item.body,
      campaignId: mapped.campaignId,
      campaignName: mapped.campanhaNome,
      erpCampaignId: mapped.campaignId,
      messageId: mapped.messageId,
      phone: mapped.phone,
      message: mapped.message,
    },
    status: 'recorded',
    id: item.id,
  })
}

async function publicarLeticia(empresaId: string, saida: SaidaRobo) {
  try {
    await sendReplyViaNxErp({
      empresaId,
      telefone: saida.telefone,
      mensagem: saida.texto,
      conversaId: saida.conversaId,
      clienteId: saida.clienteId,
      crmMensagemId: saida.crmMensagemId,
      operador: 'Letícia',
      lista: saida.opcoes,
      listaBotao: saida.opcoes?.length ? LETICIA_MENU_BOTAO : undefined,
      listaTitulo: saida.opcoes?.length ? LETICIA_MENU_TITULO : undefined,
    })
  } catch {
    /* o texto já ficou no histórico; esta tentativa não repete o disparo */
  }
}

/** Lê a fila local gravada pelo endpoint autenticado e aplica no Chat existente. */
export async function drainNxErpHttpInbox(empresaId: string, memoria?: MemoriaInbox): Promise<number> {
  const pending = await fetch('/__nx_crm_inbound/pending')
  if (!pending.ok) return 0
  const data = (await pending.json()) as { items?: Queued[] }
  const items = (Array.isArray(data.items) ? data.items : []).slice().sort((a, b) => {
    const ta = Number(a.body?.timestamp || 0)
    const tb = Number(b.body?.timestamp || 0)
    if (ta && tb && ta !== tb) return ta - tb
    return 0
  })
  const done: string[] = []
  for (const item of items) {
    try {
      await applyItem(empresaId, item, memoria)
      done.push(item.id)
    } catch {
      /* permanece na fila para a próxima leitura */
    }
  }
  if (done.length) {
    await fetch('/__nx_crm_inbound/ack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: done }),
    })
  }
  return done.length
}

/** Resposta do atendente segue para o NX ERP em POST /api/crm/eventos. Não chama a Meta. */
export async function sendReplyViaNxErp(opts: {
  empresaId: string
  telefone: string
  mensagem: string
  conversaId: string
  clienteId: string
  crmMensagemId: string
  operador?: string
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
}): Promise<{ ok: boolean; status: 'sent' | 'failed'; message: string; wamid: string }> {
  const payload = buildRespostaChat({
    crmMensagemId: opts.crmMensagemId,
    telefone: opts.telefone,
    texto: opts.mensagem,
    operador: opts.operador,
    conversaId: opts.conversaId,
    clienteId: opts.clienteId,
    audioBase64: opts.audioBase64,
    audioMime: opts.audioMime,
    midiaBase64: opts.midiaBase64,
    midiaMime: opts.midiaMime,
    midiaNome: opts.midiaNome,
    midiaLegenda: opts.midiaLegenda,
    replyToWamid: opts.replyToWamid,
    lista: opts.lista,
    listaBotao: opts.listaBotao,
    listaTitulo: opts.listaTitulo,
  })
  console.info(`[CRM OUTBOUND] crm_mensagem_id=${payload.crm_mensagem_id} telefone_digitos=${payload.telefone.length}`)
  const result = await postNxErpEvento(opts.empresaId, payload)
  if (result.ok) {
    console.info(`[META] wamid=${result.wamid || ''}`)
    console.info('[CHAT] status=sent')
    return { ok: true, status: 'sent', message: result.message, wamid: result.wamid || '' }
  }
  console.info(`[CHAT OUTBOUND ERROR]\nstage=nx-erp\nhttp_status=${result.status}\ncode=\nmessage=${result.message}`)
  return { ok: false, status: 'failed', message: result.message, wamid: '' }
}

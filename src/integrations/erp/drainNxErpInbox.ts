import { collection, getDocs, query, serverTimestamp, updateDoc, where } from 'firebase/firestore'
import { db } from '../../firebase'
import { handleInboundErpMessage } from '../../lib/inboundErpMessage'
import { handleErpToCrmEvent } from '../events/eventHandlers'
import { postNxErpEvento } from './nxErpCrmClient'
import { mapCampaignEvent, mapInboundMessage, nxErpStatus } from './nxErpInbox'

type Queued = { id: string; kind: 'mensagem' | 'evento'; body: Record<string, unknown> }

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

async function applyItem(empresaId: string, item: Queued) {
  if (item.kind === 'mensagem') {
    const mapped = mapInboundMessage(item.body)
    await handleInboundErpMessage(empresaId, mapped)
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

/** Lê a fila local gravada pelo endpoint autenticado e aplica no Chat existente. */
export async function drainNxErpHttpInbox(empresaId: string): Promise<number> {
  const pending = await fetch('/__nx_crm_inbound/pending')
  if (!pending.ok) return 0
  const data = (await pending.json()) as { items?: Queued[] }
  const items = Array.isArray(data.items) ? data.items : []
  const done: string[] = []
  for (const item of items) {
    try {
      await applyItem(empresaId, item)
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
}): Promise<{ ok: boolean; status: 'aceito' | 'falha'; message: string }> {
  const result = await postNxErpEvento(opts.empresaId, {
    tipo: 'resposta_chat',
    telefone: opts.telefone,
    mensagem: opts.mensagem,
    conversaId: opts.conversaId,
    clienteId: opts.clienteId,
  })
  if (result.ok) return { ok: true, status: 'aceito', message: result.message }
  return { ok: false, status: 'falha', message: result.message }
}

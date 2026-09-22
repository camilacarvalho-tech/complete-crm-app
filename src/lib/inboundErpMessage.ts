/**
 * INBOUND_MESSAGE do NX ERP → Chat Clientes (mesmas coleções conversas/mensagens).
 * Não inventa HTTP: a Function/webhook do ERP deve chamar esta função no backend
 * ou gravar em empresas/{id}/erpInbound e este handler processa o payload.
 */
import { addDoc, collection, doc, getDoc, getDocs, increment, query, serverTimestamp, updateDoc, where } from 'firebase/firestore'
import { db } from '../firebase'
import { garantirConversaFila } from './garantirConversaFila'
import { digits } from './nexusCore'
import { writeAudit } from './audit'
import { tickChatRobot } from '../modules/chat-robot/chatRobot'
import { resolveInboundOrigin } from './inboundOrigin'

export type InboundErpPayload = {
  messageId?: string
  phone?: string
  whatsapp?: string
  clientId?: string
  leadId?: string
  campaignId?: string
  erpCampaignId?: string
  message?: string
  messageType?: string
  timestamp?: string
  templateId?: string
  source?: string
  origin?: string
  direction?: string
}

export { resolveInboundOrigin } from './inboundOrigin'

export async function handleInboundErpMessage(
  empresaId: string,
  payload: InboundErpPayload
): Promise<{ conversaId: string; clienteId: string; created: boolean }> {
  const tel = digits(payload.whatsapp || payload.phone || '')
  const origemLead = resolveInboundOrigin(payload)
  let clienteId = String(payload.clientId || '')
  if (!tel && !clienteId) {
    throw new Error('Inbound ERP sem whatsapp/phone e sem clientId')
  }
  if (!clienteId && tel) {
    const snap = await getDocs(collection(db, 'empresas', empresaId, 'clientes'))
    const hit = snap.docs.find((d) => {
      const c = d.data() as { telefone?: string; whatsapp?: string; telefoneNormalizado?: string }
      const n = digits(c.whatsapp || c.telefone || c.telefoneNormalizado || '')
      return n && n === tel
    })
    if (hit) clienteId = hit.id
  }
  let created = false
  if (!clienteId && tel.length < 10) {
    throw new Error('Inbound sem identificador mínimo válido — cliente não criado.')
  }
  if (!clienteId) {
    const ref = await addDoc(collection(db, 'empresas', empresaId, 'clientes'), {
      nome: tel || 'Cliente WhatsApp',
      telefone: tel,
      telefoneNormalizado: tel,
      whatsapp: tel,
      origemLead,
      origem: origemLead,
      fonte: payload.source || 'NX_ERP',
      campanhaId: payload.campaignId || '',
      erpCampaignId: payload.erpCampaignId || '',
      leadId: payload.leadId || '',
      pipelineStage: 'novo_lead',
      status: 'NOVO LEAD',
      criadoEm: serverTimestamp(),
      atualizadoEm: serverTimestamp(),
    })
    clienteId = ref.id
    created = true
  } else {
    const cliRef = doc(db, 'empresas', empresaId, 'clientes', clienteId)
    const cli = await getDoc(cliRef)
    if (cli.exists()) {
      await updateDoc(cliRef, {
        atualizadoEm: serverTimestamp(),
        erpCampaignId: payload.erpCampaignId || cli.data()?.erpCampaignId || null,
      })
    }
  }

  const fila = await garantirConversaFila({
    empresaId,
    clienteId,
    titulo: tel || 'Atendimento',
    telefone: tel,
    origemLead,
    fonte: payload.source || 'NX_ERP',
    campanhaId: payload.campaignId,
  })

  const texto = String(payload.message || '').trim()
  if (texto) {
    if (payload.messageId) {
      const dup = await getDocs(
        query(collection(db, 'empresas', empresaId, 'mensagens'), where('messageId', '==', payload.messageId))
      )
      if (!dup.empty) {
        return { conversaId: fila.conversaId, clienteId, created }
      }
    }
    await addDoc(collection(db, 'empresas', empresaId, 'mensagens'), {
      conversaId: fila.conversaId,
      clienteId,
      autorId: 'cliente',
      autorNome: 'Cliente',
      texto,
      tipo: payload.messageType || 'texto',
      status: 'recebida',
      direction: 'INBOUND',
      source: payload.source || 'NX_ERP',
      messageId: payload.messageId || null,
      templateId: payload.templateId || null,
      erpCampaignId: payload.erpCampaignId || null,
      campaignId: payload.campaignId || null,
      origemLead,
      criadoEm: serverTimestamp(),
    })
    const convSnap = await getDoc(doc(db, 'empresas', empresaId, 'conversas', fila.conversaId))
    const conv = convSnap.data() || {}
    const st = String(conv.status || '')
    const keepStatus = st === 'em_atendimento' || st === 'aguardando_cliente' || st === 'aguardando_funcionario'
    const tick = tickChatRobot({
      state: String(conv.robotState || 'NEW'),
      inboundText: texto,
      channelConnected: false,
      robotEnabled: false,
      produto: String(conv.produto || conv.robotProduto || ''),
      operacao: String(conv.operacao || conv.robotOperacao || ''),
    })
    await updateDoc(doc(db, 'empresas', empresaId, 'conversas', fila.conversaId), {
      lastMessage: texto.slice(0, 240),
      lastMessageAt: serverTimestamp(),
      ...(fila.criada
        ? { unreadCount: 1 }
        : { naoLidas: increment(1), unreadCount: increment(1) }),
      conversationStatus: 'RESPONDIDO',
      ...(keepStatus ? {} : { status: tick.pauseRobot ? 'aguardando_funcionario' : 'aguardando_triagem' }),
      robotState: tick.nextState,
      robotPaused: tick.pauseRobot || st === 'em_atendimento',
      robotProduto: tick.produto || conv.robotProduto || null,
      robotOperacao: tick.operacao || conv.robotOperacao || null,
      requiredDocuments: tick.requiredDocuments || conv.requiredDocuments || null,
      requisitosPendentes: tick.pendingConfig || false,
      origemLead,
      atualizadoEm: serverTimestamp(),
    })
  }

  await writeAudit({
    empresaId,
    modulo: 'atendimento',
    acao: 'inbound.erp',
    entidade: 'conversa',
    entidadeId: fila.conversaId,
    depois: { source: 'NX_ERP', messageId: payload.messageId || null, clienteId, origemLead },
  })

  return { conversaId: fila.conversaId, clienteId, created }
}

/** Processa inbox empresas/{id}/erpInbound com processado!=true */
export async function drainErpInbound(empresaId: string): Promise<number> {
  const col = collection(db, 'empresas', empresaId, 'erpInbound')
  const snap = await getDocs(query(col, where('processado', '==', false)))
  let n = 0
  for (const d of snap.docs) {
    const data = d.data() as InboundErpPayload
    try {
      await handleInboundErpMessage(empresaId, data)
      await updateDoc(d.ref, { processado: true, processadoEm: serverTimestamp() })
      n += 1
    } catch (err) {
      await updateDoc(d.ref, {
        processado: true,
        processadoEm: serverTimestamp(),
        erro: String(err instanceof Error ? err.message : err).slice(0, 400),
      })
    }
  }
  return n
}

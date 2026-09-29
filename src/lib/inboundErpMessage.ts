/**
 * INBOUND_MESSAGE do NX ERP → Chat Clientes (mesmas coleções conversas/mensagens).
 * Não inventa HTTP: a Function/webhook do ERP deve chamar esta função no backend
 * ou gravar em empresas/{id}/erpInbound e este handler processa o payload.
 */
import { addDoc, collection, doc, getDoc, getDocs, increment, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore'
import { db } from '../firebase'
import { garantirConversaFila } from './garantirConversaFila'
import { digits } from './nexusCore'
import { writeAudit } from './audit'
import { camposConversa, leticiaReply, leticiaTravada, LETICIA_MENU_BOTAO, LETICIA_MENU_TITULO, podeResponder, stepDoBot, textoSelecaoCliente } from '../modules/chat-robot/leticiaReception'
import { resolveInboundOrigin } from './inboundOrigin'

export type InboundErpPayload = {
  messageId?: string
  phone?: string
  whatsapp?: string
  nome?: string
  clientId?: string
  leadId?: string
  campaignId?: string
  campanhaNome?: string
  disparoId?: string
  erpCampaignId?: string
  message?: string
  messageType?: string
  timestamp?: string
  templateId?: string
  produto?: string
  wamid?: string
  conversa?: string
  contato?: string
  source?: string
  origin?: string
  direction?: string
  status?: string
  replyToWamid?: string
  opcaoId?: string
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
      nome: String(payload.nome || '').trim() || tel || 'Cliente WhatsApp',
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
    campanhaNome: payload.campanhaNome,
    produto: payload.produto,
  })

    const texto = String(payload.message || '').trim()
    if (texto) {
    const chave = String(payload.wamid || payload.messageId || '').trim()
    if (chave) {
      const dup = await getDocs(
        query(collection(db, 'empresas', empresaId, 'mensagens'), where('messageId', '==', chave))
      )
      if (!dup.empty) {
        return { conversaId: fila.conversaId, clienteId, created }
      }
    }
    let replyToTexto = ''
    const citado = String(payload.replyToWamid || '').trim()
    if (citado) {
      const origem = await getDocs(
        query(collection(db, 'empresas', empresaId, 'mensagens'), where('wamid', '==', citado))
      )
      replyToTexto = String(origem.docs[0]?.data()?.texto || '').slice(0, 180)
    }
    const opcaoId = String(payload.opcaoId || '').trim()
    const textoCliente = opcaoId ? (textoSelecaoCliente(opcaoId) || texto) : texto
    await addDoc(collection(db, 'empresas', empresaId, 'mensagens'), {
      conversaId: fila.conversaId,
      clienteId,
      autorId: 'cliente',
      autorNome: payload.nome || 'Cliente',
      texto: textoCliente,
      opcaoId: opcaoId || null,
      tipo: payload.messageType || 'texto',
      status: 'recebida',
      direction: 'INBOUND',
      source: payload.source || 'NX_ERP',
      origin: payload.origin || 'whatsapp',
      messageId: chave || null,
      wamid: payload.wamid || null,
      replyToMessageId: citado || null,
      replyToTexto: replyToTexto || null,
      templateId: payload.templateId || null,
      erpCampaignId: payload.erpCampaignId || null,
      campaignId: payload.campaignId || null,
      campanhaNome: payload.campanhaNome || null,
      disparoId: payload.disparoId || null,
      produto: payload.produto || null,
      contato: payload.contato || null,
      erpConversaId: payload.conversa || null,
      erpStatus: payload.status || null,
      timestampErp: payload.timestamp || null,
      origemLead,
      criadoEm: serverTimestamp(),
    })
    const convSnap = await getDoc(doc(db, 'empresas', empresaId, 'conversas', fila.conversaId))
    const conv = (convSnap.data() || {}) as ConversaMemoria
    const st = String(conv.status || '')
    const keepStatus = st === 'em_atendimento' || st === 'aguardando_cliente' || st === 'aguardando_funcionario' || st === 'aguardando_atendimento' || st === 'transferido' || st === 'finalizado'
    const anterior = lerEstado(fila.conversaId, { ...conv, id: fila.conversaId })
    const reception = anterior.paused
      ? null
      : leticiaReply({
          paused: false,
          welcomed: anterior.welcomed,
          step: anterior.step,
          flow: String(conv.botState?.flow || ''),
          text: texto,
          opcaoId,
        })
    const welcomeSentAt = reception?.welcomed ? (anterior.welcomeSentAt || new Date().toISOString()) : anterior.welcomeSentAt
    const passo = reception?.step || anterior.step || 'menu'
    const pausou = Boolean(reception?.pause) || anterior.paused
    if (reception?.reply && chave) {
      await setDoc(doc(db, 'empresas', empresaId, 'mensagens', `leticia-${chave.replace(/\//g, '_').slice(0, 700)}`), {
        empresaId,
        conversaId: fila.conversaId,
        clienteId,
        autorNome: 'Letícia',
        autorId: 'leticia',
        texto: reception.reply,
        ...(reception.opcoes?.length ? { opcoes: reception.opcoes, listaBotao: LETICIA_MENU_TITULO } : {}),
        tipo: reception.opcoes?.length ? 'interativa' : 'texto',
        status: 'sent',
        direction: 'OUTBOUND',
        source: 'LETICIA_LOCAL',
        processedInboundId: chave,
        criadoEm: serverTimestamp(),
      })
    }
    const campos = camposConversa(reception, passo, pausou)
    estadoConversa.set(fila.conversaId, {
      step: pausou ? 'human' : passo,
      welcomed: reception?.welcomed ?? anterior.welcomed,
      paused: pausou,
      welcomeSentAt,
    })
    await updateDoc(doc(db, 'empresas', empresaId, 'conversas', fila.conversaId), {
      lastMessage: (reception?.reply || texto).slice(0, 240),
      lastMessageAt: serverTimestamp(),
      ...(fila.criada
        ? { unreadCount: 1, naoLidas: 1 }
        : { naoLidas: increment(1), unreadCount: increment(1) }),
      conversationStatus: 'RESPONDIDO',
      ...(keepStatus ? {} : { status: pausou ? 'aguardando_atendimento' : 'aguardando_triagem' }),
      robotState: pausou ? 'HUMAN_ACTIVE' : 'BOT_ACTIVE',
      robotPaused: pausou,
      roboPausado: pausou,
      botAtivo: !pausou,
      atendimentoHumano: pausou,
      botWelcomeSent: reception?.welcomed ?? anterior.welcomed,
      welcomeSentAt: welcomeSentAt || null,
      leticiaStep: campos.leticiaStep,
      etapa: campos.etapa,
      botState: campos.botState,
      ...(campos.modalidadeSelecionada ? { modalidadeSelecionada: campos.modalidadeSelecionada } : {}),
      assignedTo: reception?.transferTo || conv.assignedTo || null,
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

const jaGravadas = new Set<string>()
const estadoConversa = new Map<string, { step: string; welcomed: boolean; paused: boolean; welcomeSentAt: string }>()

type ConversaMemoria = {
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
  modalidadeSelecionada?: string
  botAtivo?: boolean
  atendimentoHumano?: boolean
  welcomeSentAt?: string
  assignedTo?: string
}

type MemoriaChat = {
  clientes: { id: string; telefone?: string; whatsapp?: string; telefoneNormalizado?: string }[]
  conversas: ConversaMemoria[]
  mensagens: { id?: string; wamid?: string; messageId?: string; texto?: string; processedByLeticia?: boolean }[]
  conversaAbertaId?: string
}

function humanoAtivo(conversa?: ConversaMemoria): boolean {
  return leticiaTravada(conversa)
}

function lerEstado(conversaId: string, conversa?: ConversaMemoria) {
  if (humanoAtivo(conversa)) {
    const parado = { step: 'human', welcomed: true, paused: true, welcomeSentAt: String(conversa?.welcomeSentAt || '') }
    estadoConversa.set(conversaId, parado)
    return parado
  }
  const cache = estadoConversa.get(conversaId)
  if (cache) return cache
  const welcomed = conversa?.botWelcomeSent === true || Boolean(conversa?.welcomeSentAt)
  const stepGravado = stepDoBot(conversa?.botState, String(conversa?.leticiaStep || ''), String(conversa?.etapa || ''))
  const estado = {
    step: stepGravado === 'human' ? 'menu' : stepGravado,
    welcomed,
    paused: false,
    welcomeSentAt: String(conversa?.welcomeSentAt || ''),
  }
  estadoConversa.set(conversaId, estado)
  return estado
}

/** Grava a mensagem do cliente usando a conversa já aberta no Chat, sem varrer o Firestore. */
export type SaidaRobo = {
  texto: string
  telefone: string
  conversaId: string
  clienteId: string
  crmMensagemId: string
  opcoes?: { id: string; title: string }[]
}

export async function gravarMensagemRecebida(
  empresaId: string,
  payload: InboundErpPayload,
  memoria: MemoriaChat,
): Promise<SaidaRobo | null> {
  const texto = String(payload.message || '').trim()
  const chave = String(payload.wamid || payload.messageId || '').trim()
  const opcaoId = String(payload.opcaoId || '').trim()
  if (!texto || !chave) return null
  const id = chave.replace(/\//g, '_').slice(0, 700)
  if (!podeResponder(jaGravadas, id) || memoria.mensagens.some((m) => m.id === id || m.wamid === chave || m.messageId === chave)) return null
  const textoCliente = opcaoId ? (textoSelecaoCliente(opcaoId) || texto) : texto

  const tel = digits(payload.whatsapp || payload.phone || '')
  if (tel.length < 10) throw new Error('Inbound sem telefone válido')
  const origemLead = resolveInboundOrigin(payload)
  let clienteId = memoria.clientes.find((c) => {
    const n = digits(c.whatsapp || c.telefone || c.telefoneNormalizado || '')
    return Boolean(n) && n === tel
  })?.id || ''
  if (!clienteId) {
    const ref = await addDoc(collection(db, 'empresas', empresaId, 'clientes'), {
      nome: String(payload.nome || '').trim() || tel,
      telefone: tel,
      telefoneNormalizado: tel,
      whatsapp: tel,
      origemLead,
      origem: origemLead,
      fonte: 'whatsapp',
      pipelineStage: 'novo_lead',
      status: 'NOVO LEAD',
      criadoEm: serverTimestamp(),
      atualizadoEm: serverTimestamp(),
    })
    clienteId = ref.id
  }

  const conversa = memoria.conversas.find((c) => c.canal !== 'interno' && c.clienteId === clienteId)
  let conversaId = conversa?.id || ''
  let criada = false
  if (!conversaId) {
    const fila = await garantirConversaFila({
      empresaId,
      clienteId,
      titulo: payload.nome || tel,
      telefone: tel,
      origemLead,
      fonte: 'whatsapp',
    })
    conversaId = fila.conversaId
    criada = fila.criada
  }

  const citado = String(payload.replyToWamid || '').trim()
  const replyToTexto = citado
    ? String(memoria.mensagens.find((m) => m.wamid === citado || m.messageId === citado)?.texto || '').slice(0, 180)
    : ''
  await setDoc(doc(db, 'empresas', empresaId, 'mensagens', id), {
    conversaId,
    clienteId,
    autorId: 'cliente',
    autorNome: payload.nome || 'Cliente',
    texto: textoCliente,
    opcaoId: opcaoId || null,
    tipo: opcaoId ? 'interativa' : (payload.messageType || 'texto'),
    status: 'recebida',
    direction: 'INBOUND',
    source: 'whatsapp',
    origin: payload.origin || 'whatsapp',
    messageId: chave,
    wamid: chave,
    replyToMessageId: citado || null,
    replyToTexto: replyToTexto || null,
    timestampErp: payload.timestamp || null,
    origemLead,
    criadoEm: serverTimestamp(),
  })
  jaGravadas.add(id)

  const st = String(conversa?.status || '')
  const keepStatus = st === 'em_atendimento' || st === 'aguardando_cliente' || st === 'aguardando_funcionario' || st === 'aguardando_atendimento' || st === 'transferido' || st === 'finalizado'
  const anterior = lerEstado(conversaId, conversa)
  const reception = anterior.paused
    ? null
    : leticiaReply({
        paused: false,
        welcomed: anterior.welcomed,
        step: anterior.step,
        flow: String(conversa?.botState?.flow || ''),
        text: texto,
        opcaoId,
      })
  const welcomeSentAt = reception?.welcomed
    ? (anterior.welcomeSentAt || new Date().toISOString())
    : anterior.welcomeSentAt
  const passo = reception?.step || anterior.step || 'menu'
  const pausou = Boolean(reception?.pause) || anterior.paused
  const crmMensagemId = `leticia-${id}`
  if (reception?.reply) {
    await setDoc(doc(db, 'empresas', empresaId, 'mensagens', crmMensagemId), {
      empresaId,
      conversaId,
      clienteId,
      autorNome: 'Letícia',
      autorId: 'leticia',
      texto: reception.reply,
      ...(reception.opcoes?.length ? { opcoes: reception.opcoes, listaBotao: LETICIA_MENU_TITULO } : {}),
      tipo: reception.opcoes?.length ? 'interativa' : 'texto',
      status: 'sent',
      direction: 'OUTBOUND',
      source: 'LETICIA_LOCAL',
      replyToMessageId: id,
      processedInboundId: chave,
      criadoEm: serverTimestamp(),
    })
  }
  await updateDoc(doc(db, 'empresas', empresaId, 'mensagens', id), { processedByLeticia: true })
  const proximo = {
    step: pausou ? 'human' : passo,
    welcomed: reception?.welcomed ?? anterior.welcomed,
    paused: pausou,
    welcomeSentAt,
  }
  estadoConversa.set(conversaId, proximo)
  const campos = camposConversa(reception, passo, pausou)
  if (conversa) {
    conversa.leticiaStep = campos.leticiaStep
    conversa.etapa = campos.etapa
    conversa.botState = campos.botState
    if (campos.modalidadeSelecionada) conversa.modalidadeSelecionada = campos.modalidadeSelecionada
    conversa.botWelcomeSent = proximo.welcomed
    conversa.welcomeSentAt = welcomeSentAt
    conversa.botAtivo = !pausou
    conversa.atendimentoHumano = pausou
    conversa.roboPausado = pausou
    conversa.robotPaused = pausou
    conversa.robotState = pausou ? 'HUMAN_ACTIVE' : 'BOT_ACTIVE'
    if (reception?.transferTo) conversa.assignedTo = reception.transferTo
  }
  memoria.mensagens.push({ id, wamid: chave, messageId: chave, texto, processedByLeticia: true })
  const aberta = memoria.conversaAbertaId === conversaId
  await updateDoc(doc(db, 'empresas', empresaId, 'conversas', conversaId), {
    lastMessage: (reception?.reply || texto).slice(0, 240),
    lastMessageAt: serverTimestamp(),
    ...(aberta
      ? { naoLidas: 0, unreadCount: 0 }
      : criada
        ? { unreadCount: 1, naoLidas: 1 }
        : { naoLidas: increment(1), unreadCount: increment(1) }),
    conversationStatus: 'RESPONDIDO',
    ...(keepStatus ? {} : { status: pausou ? 'aguardando_atendimento' : 'aguardando_triagem' }),
    robotState: pausou ? 'HUMAN_ACTIVE' : 'BOT_ACTIVE',
    robotPaused: pausou,
    roboPausado: pausou,
    botAtivo: !pausou,
    atendimentoHumano: pausou,
    botWelcomeSent: proximo.welcomed,
    welcomeSentAt: welcomeSentAt || null,
    leticiaStep: campos.leticiaStep,
    etapa: campos.etapa,
    botState: campos.botState,
    ...(campos.modalidadeSelecionada ? { modalidadeSelecionada: campos.modalidadeSelecionada } : {}),
    assignedTo: reception?.transferTo || conversa?.assignedTo || null,
    origemLead,
    atualizadoEm: serverTimestamp(),
  })
  if (!reception?.reply) return null
  return {
    texto: reception.reply,
    telefone: tel,
    conversaId,
    clienteId,
    crmMensagemId,
    ...(reception.opcoes?.length ? { opcoes: reception.opcoes } : {}),
  }
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

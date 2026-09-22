import { detectProductOperation, requirementsFor } from './productRequirements.ts'

export const CHAT_ROBOT_STATES = [
  'NEW',
  'GREETING',
  'IDENTIFICATION',
  'CPF_REQUEST',
  'PRODUCT_SELECTION',
  'DOCUMENT_REQUEST',
  'CONSULTING',
  'DOCUMENT_RECEIVED',
  'BANK_PROCESSING',
  'LINK_SENT',
  'WAITING_CONFIRMATION',
  'HUMAN_REQUEST',
  'FINISHED',
] as const

export type ChatRobotState = (typeof CHAT_ROBOT_STATES)[number]

export const ROBOT_SCRIPTS: Partial<Record<ChatRobotState, string>> = {
  GREETING: 'Olá, bom dia! Meu nome é Letícia, vou dar andamento no seu atendimento.',
  CPF_REQUEST: 'Para começarmos, poderia me informar seu CPF, por favor?',
  PRODUCT_SELECTION: 'Qual produto e operação você deseja consultar? (ex.: INSS portabilidade)',
  CONSULTING: 'Um momento, estamos consultando as informações para você.',
  LINK_SENT: 'Um momento, vamos enviar o link para você.',
  WAITING_CONFIRMATION: 'Assim que o valor estiver disponível em sua conta, nos avise, por favor.',
}

const HUMAN_HINT = /humano|atendente|falar com algu[eé]m|n[aã]o quero rob[oô]|falar com atendente|quero falar com atendente/i

export function isHumanHandoffText(text: string): boolean {
  const t = String(text || '').trim()
  if (t === '1') return true
  return HUMAN_HINT.test(t)
}

export type RobotTick = {
  nextState: ChatRobotState
  draftReply?: string
  pauseRobot: boolean
  documentReceived?: boolean
  sendNow: boolean
  produto?: string
  operacao?: string
  requiredDocuments?: string[]
  pendingConfig?: boolean
}

/**
 * Máquina de estados do Chat Clientes.
 * sendNow é sempre false até canal WhatsApp conectado E robô ativado.
 */
export function tickChatRobot(opts: {
  state: ChatRobotState | string
  inboundText: string
  channelConnected: boolean
  robotEnabled: boolean
  produto?: string
  operacao?: string
}): RobotTick {
  const text = String(opts.inboundText || '').trim()
  if (isHumanHandoffText(text)) {
    return { nextState: 'HUMAN_REQUEST', pauseRobot: true, sendNow: false, draftReply: undefined }
  }
  const canSend = Boolean(opts.channelConnected && opts.robotEnabled)
  const detected = detectProductOperation(text)
  const produto = detected.produto || opts.produto || ''
  const operacao = detected.operacao || opts.operacao || ''
  let next: ChatRobotState = (CHAT_ROBOT_STATES.includes(opts.state as ChatRobotState) ? opts.state : 'NEW') as ChatRobotState
  let draft: string | undefined
  let requiredDocuments: string[] | undefined
  let pendingConfig: boolean | undefined

  if (next === 'NEW' || next === 'GREETING') {
    next = 'CPF_REQUEST'
    draft = `${ROBOT_SCRIPTS.GREETING}\n${ROBOT_SCRIPTS.CPF_REQUEST}`
  } else if (next === 'CPF_REQUEST' || next === 'IDENTIFICATION') {
    next = 'PRODUCT_SELECTION'
    draft = ROBOT_SCRIPTS.PRODUCT_SELECTION
  } else if (next === 'PRODUCT_SELECTION') {
    if (!produto) {
      next = 'PRODUCT_SELECTION'
      draft = ROBOT_SCRIPTS.PRODUCT_SELECTION
    } else {
      const rule = requirementsFor(produto, operacao)
      requiredDocuments = rule.documents
      pendingConfig = rule.pendingConfig
      next = 'DOCUMENT_REQUEST'
      draft = rule.pendingConfig
        ? `${rule.note} Enquanto isso, se puder, envie: ${rule.documents.join(', ')}.`
        : `Para ${rule.produto} ${rule.operacao || ''}, envie somente: ${rule.documents.join(', ')}.`
    }
  } else if (next === 'DOCUMENT_REQUEST' || next === 'DOCUMENT_RECEIVED') {
    next = 'CONSULTING'
    draft = ROBOT_SCRIPTS.CONSULTING
  } else if (next === 'CONSULTING' || next === 'BANK_PROCESSING') {
    next = 'WAITING_CONFIRMATION'
    draft = ROBOT_SCRIPTS.WAITING_CONFIRMATION
  }

  return {
    nextState: next,
    draftReply: draft,
    pauseRobot: false,
    sendNow: canSend && Boolean(draft),
    produto,
    operacao,
    requiredDocuments,
    pendingConfig,
  }
}

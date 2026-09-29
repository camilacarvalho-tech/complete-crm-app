export const LETICIA_NAME = 'Letícia'
export const LETICIA_ROLE = 'Atendente Virtual'
export const LETICIA_COMPANY = 'Recomece Cred'

export const FGTS_INSTITUTIONS = [
  'BMP Sociedade de Crédito Direto',
  'BMP Sociedade de Crédito ao Microempreendedor',
  'Giro Sociedade de Crédito',
] as const

export const LETICIA_WELCOME = `Olá! Seja bem-vindo(a) à Recomece Cred! 💛
Sou a Letícia, atendente virtual.

Escolha a modalidade que deseja consultar:`

export const LETICIA_ESCLARECER = 'Para continuar, toque em Escolha sua modalidade.'

export const LETICIA_CPF_INVALIDO = 'Não consegui validar esse CPF. Pode conferir os números e me enviar novamente, por favor?'

export const LETICIA_HANDOFF = `Obrigada! 💛

Um momento, estamos verificando suas informações em nosso sistema.

Em instantes, um de nossos atendentes irá auxiliar você. 😊`

const MODALIDADES = [
  { id: 'credito_clt', flow: 'clt', numero: '1', label: 'Crédito CLT' },
  { id: 'fgts', flow: 'fgts', numero: '2', label: 'Saque-Aniversário FGTS' },
  { id: 'refinanciamento_casa', flow: 'casa', numero: '3', label: 'Refinanciamento de casa' },
  { id: 'refinanciamento_carro', flow: 'carro', numero: '4', label: 'Refinanciamento de carro' },
  { id: 'placa_solar', flow: 'solar', numero: '5', label: 'Crédito para placa solar' },
  { id: 'inss', flow: 'inss', numero: '6', label: 'INSS' },
  { id: 'servidor_publico', flow: 'servidor', numero: '7', label: 'Servidor Público' },
  { id: 'outros', flow: 'outros', numero: '8', label: 'Outros assuntos' },
] as const

export type ModalidadeId = (typeof MODALIDADES)[number]['id']
export type ModalidadeFlow = (typeof MODALIDADES)[number]['flow']

export type LeticiaOpcao = { id: string; title: string }

export const LETICIA_MENU_TITULO = 'Escolha sua modalidade'
export const LETICIA_MENU_BOTAO = 'Escolha modalidade'

export const LETICIA_MENU_OPCOES: LeticiaOpcao[] = MODALIDADES.map((item) => ({
  id: item.id,
  title: item.label,
}))

export type LeticiaStep =
  | 'menu'
  | 'clt_cpf' | 'fgts_cpf' | 'inss_cpf' | 'servidor_cpf'
  | 'casa_cpf' | 'carro_cpf' | 'solar_cpf' | 'outros_cpf'
  | 'human'

export type LeticiaTurn = {
  reply?: string
  step: LeticiaStep
  flow: string
  welcomed: boolean
  pause: boolean
  transferTo?: 'Laiane'
  opcoes?: LeticiaOpcao[]
  modalidadeSelecionada?: string
  leticiaStepGravar?: string
  etapaGravar?: string
}

const HUMAN = /humano|atendente|laiane|falar com algu[eé]m|quero falar com atendente/i

function textoOpcao(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[\uFE0F\u20E3]/g, '')
    .replace(/[０-９]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 0xfee0))
}

export function modalidadeDe(text: string): ModalidadeFlow | '' {
  const t = textoOpcao(text)
  const direto = MODALIDADES.find((item) => item.id === t || item.flow === t)
  if (direto) return direto.flow
  const n = t.match(/^([1-8])\b/)?.[1] || ''
  const peloNumero = MODALIDADES.find((item) => item.numero === n)
  if (peloNumero) return peloNumero.flow
  if (/placa solar|\bsolar\b/.test(t)) return 'solar'
  if (/fgts|saque[\s-]*anivers/.test(t)) return 'fgts'
  if (/inss|aposentador|benef[ií]cio/.test(t)) return 'inss'
  if (/siape|\bservidor\b/.test(t)) return 'servidor'
  if (/refinanciamento de carro|\bcarro\b/.test(t)) return 'carro'
  if (/refinanciamento de casa|\bcasa\b/.test(t)) return 'casa'
  if (/\bclt\b|consignado/.test(t)) return 'clt'
  if (/\boutros\b/.test(t)) return 'outros'
  return ''
}

export function rotuloModalidade(id: string): string {
  const t = textoOpcao(id)
  return MODALIDADES.find((item) => item.id === t || item.flow === t || item.numero === t)?.label || ''
}

export function modalidadeOficial(flow: string): string {
  const t = textoOpcao(flow)
  return MODALIDADES.find((item) => item.flow === t || item.id === t)?.id || ''
}

export function textoSelecaoCliente(id: string): string {
  const nome = rotuloModalidade(id)
  return nome ? `Cliente selecionou:\n${nome}` : ''
}

export function podeResponder(vistas: { has(id: string): boolean }, id: string): boolean {
  const chave = String(id || '').trim()
  return Boolean(chave) && !vistas.has(chave)
}

function rotulo(id: string): string {
  return rotuloModalidade(id) || 'essa modalidade'
}

function confirmar(id: string): string {
  return `Perfeito! 💛 Você escolheu ${rotulo(id)}.\n\nPara verificarmos as opções disponíveis, me informe seu CPF.`
}

function cpfDigits(text: string): string {
  return text.replace(/\D/g, '')
}

const ETAPA: Record<LeticiaStep, string> = {
  menu: 'MENU',
  clt_cpf: 'CLT_CPF',
  fgts_cpf: 'FGTS_CPF',
  inss_cpf: 'INSS_CPF',
  servidor_cpf: 'SERVIDOR_CPF',
  casa_cpf: 'CASA_CPF',
  carro_cpf: 'CARRO_CPF',
  solar_cpf: 'SOLAR_CPF',
  outros_cpf: 'OUTROS_CPF',
  human: 'HUMANO',
}

const STEP_DE_ETAPA = Object.fromEntries(Object.entries(ETAPA).map(([step, etapa]) => [etapa, step])) as Record<string, LeticiaStep>

const LEGADO: Record<string, LeticiaStep> = {
  fgts_qualify: 'fgts_cpf',
  inss_qualify: 'inss_cpf',
  clt_name: 'clt_cpf',
  fgts_name: 'fgts_cpf',
  inss_name: 'inss_cpf',
  servidor_orgao: 'servidor_cpf',
  servidor_name: 'servidor_cpf',
  casa_name: 'casa_cpf',
  carro_name: 'carro_cpf',
  solar_name: 'solar_cpf',
  outros_name: 'outros_cpf',
  clt_analysis: 'human',
  fgts_analysis: 'human',
  inss_analysis: 'human',
  servidor_analysis: 'human',
  casa_analysis: 'human',
  carro_analysis: 'human',
  solar_analysis: 'human',
  outros_analysis: 'human',
  choose_product: 'menu',
  choose_modality: 'menu',
  human_handoff: 'human',
  consulting: 'human',
}

export function etapaDe(step: string): string {
  const atual = stepDe(step)
  return ETAPA[atual] || 'MENU'
}

export function stepDe(step: string, etapa = ''): LeticiaStep {
  const bruto = (step || '').trim()
  if (LEGADO[bruto]) return LEGADO[bruto]
  const direto = bruto as LeticiaStep
  if (direto in ETAPA) return direto
  const pelaEtapa = STEP_DE_ETAPA[String(etapa || '').trim().toUpperCase()]
  return pelaEtapa || 'menu'
}

export function leticiaTravada(conversa?: {
  status?: unknown
  statusAtendimento?: unknown
  roboPausado?: unknown
  botState?: { active?: boolean; step?: string }
} | null): boolean {
  const status = String(conversa?.status || '')
  const atendimento = String(conversa?.statusAtendimento || '')
  if (status === 'finalizado' || atendimento === 'FINALIZADO') return true
  if (conversa?.botState?.active === false && conversa?.botState?.step === 'human_handoff') return true
  if (status === 'em_atendimento' && (conversa?.roboPausado === true || atendimento === 'HUMANO')) return true
  return false
}

export function flowDe(step: string): string {
  const atual = stepDe(step)
  if (atual === 'menu') return 'main'
  if (atual === 'human') return 'human'
  return atual.replace(/_cpf$/, '')
}

export type BotState = { active: boolean; flow: string; step: string }

export function botStateDe(step: string, paused: boolean, flowHint = ''): BotState {
  const atual = stepDe(step)
  const flow = atual === 'human'
    ? (flowHint && flowHint !== 'human' ? flowHint : 'human')
    : flowHint || flowDe(atual)
  const publico = atual === 'menu'
    ? 'choose_modality'
    : atual.endsWith('_cpf')
      ? 'request_cpf'
      : atual === 'human'
        ? 'human_handoff'
        : atual
  return {
    active: !paused && atual !== 'human',
    flow,
    step: publico,
  }
}

export function camposConversa(turn: LeticiaTurn | null | undefined, passo: string, pausou: boolean) {
  const leticiaStep = turn?.leticiaStepGravar || (pausou ? 'human' : passo)
  const etapa = turn?.etapaGravar || etapaDe(pausou ? 'human' : passo)
  return {
    leticiaStep,
    etapa,
    botState: botStateDe(pausou ? 'human' : passo, pausou, turn?.flow || ''),
    ...(turn?.modalidadeSelecionada ? { modalidadeSelecionada: turn.modalidadeSelecionada } : {}),
  }
}

export function stepDoBot(state?: { step?: string; flow?: string } | null, leticiaStep = '', etapa = ''): LeticiaStep {
  const bruto = String(state?.step || '').trim()
  const flow = String(state?.flow || '').trim()
  if (bruto === 'choose_modality' || bruto === 'choose_product') return 'menu'
  if (bruto === 'request_cpf' && flow && flow !== 'main' && flow !== 'human') return stepDe(`${flow}_cpf`)
  if (bruto === 'human_handoff' || bruto === 'consulting') return 'human'
  return stepDe(bruto || leticiaStep, etapa)
}

export function leticiaReply(input: {
  paused: boolean
  welcomed: boolean
  step: string
  text: string
  flow?: string
  opcaoId?: string
}): LeticiaTurn {
  const text = String(input.text || '').trim()
  const step = stepDe(input.step)
  const flow = input.flow || flowDe(step)
  if (input.paused || step === 'human') {
    return { step: 'human', flow: flow === 'main' ? 'human' : flow, welcomed: input.welcomed, pause: true }
  }
  if (HUMAN.test(text)) {
    return {
      reply: 'Vou transferir seu atendimento para a Laiane. 😊',
      step: 'human',
      flow: 'human',
      welcomed: true,
      pause: true,
      transferTo: 'Laiane',
    }
  }

  if (step.endsWith('_cpf')) {
    const modalidade = flowDe(step)
    if (!/\d/.test(text)) {
      return { reply: LETICIA_WELCOME, step: 'menu', flow: 'main', welcomed: true, pause: false, opcoes: LETICIA_MENU_OPCOES }
    }
    if (cpfDigits(text).length !== 11) {
      return { reply: LETICIA_CPF_INVALIDO, step, flow: modalidade, welcomed: true, pause: false }
    }
    return {
      reply: LETICIA_HANDOFF,
      step: 'human',
      flow: modalidade,
      welcomed: true,
      pause: true,
      modalidadeSelecionada: modalidadeOficial(modalidade),
      leticiaStepGravar: 'human_handoff',
      etapaGravar: 'human_handoff',
    }
  }

  const escolha = modalidadeDe(String(input.opcaoId || '')) || modalidadeDe(text)
  if (!input.welcomed && !escolha) {
    return { reply: LETICIA_WELCOME, step: 'menu', flow: 'main', welcomed: true, pause: false, opcoes: LETICIA_MENU_OPCOES }
  }
  if (escolha) {
    return {
      reply: confirmar(escolha),
      step: `${escolha}_cpf` as LeticiaStep,
      flow: escolha,
      welcomed: true,
      pause: false,
      modalidadeSelecionada: modalidadeOficial(escolha),
    }
  }
  return { reply: LETICIA_ESCLARECER, step: 'menu', flow: 'main', welcomed: true, pause: false, opcoes: LETICIA_MENU_OPCOES }
}

export type EstadoLetícia = { paused: boolean; welcomed: boolean; step: LeticiaStep; flow?: string }

/** Uma mensagem por vez. O estado que sai de uma entra na próxima. */
export function processarSequencia(inicial: EstadoLetícia, textos: string[]): { estado: EstadoLetícia; respostas: string[] } {
  const respostas: string[] = []
  let estado: EstadoLetícia = { ...inicial, step: stepDe(inicial.step), flow: inicial.flow || flowDe(inicial.step) }
  for (const text of textos) {
    const turn = leticiaReply({ paused: estado.paused, welcomed: estado.welcomed, step: estado.step, flow: estado.flow, text })
    estado = { paused: turn.pause, welcomed: turn.welcomed, step: turn.step, flow: turn.flow }
    if (turn.reply) respostas.push(turn.reply)
  }
  return { estado, respostas }
}

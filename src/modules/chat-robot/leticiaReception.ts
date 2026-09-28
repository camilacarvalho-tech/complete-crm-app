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

Como posso ajudar você hoje?

1️⃣ Crédito CLT
2️⃣ Saque-Aniversário FGTS
3️⃣ Refinanciamento de casa
4️⃣ Refinanciamento de carro
5️⃣ Crédito para placa solar
6️⃣ INSS
7️⃣ Servidor Público
8️⃣ Outros assuntos

Digite o número ou escreva a opção desejada.`

export type LeticiaStep =
  | 'menu'
  | 'clt_name' | 'clt_cpf' | 'clt_analysis'
  | 'fgts_name' | 'fgts_cpf' | 'fgts_analysis'
  | 'inss_name' | 'inss_cpf' | 'inss_analysis'
  | 'servidor_orgao' | 'servidor_name' | 'servidor_cpf' | 'servidor_analysis'
  | 'casa_name' | 'casa_cpf' | 'casa_analysis'
  | 'carro_name' | 'carro_cpf' | 'carro_analysis'
  | 'solar_name' | 'solar_cpf' | 'solar_analysis'
  | 'outros_name' | 'outros_cpf' | 'outros_analysis'
  | 'human'

export type LeticiaTurn = {
  reply?: string
  step: LeticiaStep
  welcomed: boolean
  pause: boolean
  transferTo?: 'Laiane'
}

const HUMAN = /humano|atendente|laiane|falar com algu[eé]m|quero falar com atendente/i
const FGTS = /fgts|saque[\s-]*anivers|antecipa[cç][aã]o fgts/i

function textoOpcao(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[\uFE0F\u20E3]/g, '')
    .replace(/[０-９]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 0xfee0))
}

function option(text: string): string {
  const t = textoOpcao(text)
  const n = t.match(/^([1-8])\b/)?.[1] || ''
  if (n === '1' || /clt|consignado|trabalho registrado/.test(t)) return 'clt'
  if (n === '2' || FGTS.test(t)) return 'fgts'
  if (n === '3' || /casa/.test(t)) return 'casa'
  if (n === '4' || /carro/.test(t)) return 'carro'
  if (n === '5' || /solar/.test(t)) return 'solar'
  if (n === '6' || /inss|aposentador/.test(t)) return 'inss'
  if (n === '7' || /servidor|prefeitura|municipal/.test(t)) return 'servidor'
  if (n === '8' || /outro/.test(t)) return 'outros'
  return ''
}

const ETAPA: Record<LeticiaStep, string> = {
  menu: 'MENU',
  clt_name: 'CLT_NOME',
  clt_cpf: 'CLT_CPF',
  clt_analysis: 'CLT_ANALISE',
  fgts_name: 'FGTS_NOME',
  fgts_cpf: 'FGTS_CPF',
  fgts_analysis: 'FGTS_ANALISE',
  inss_name: 'INSS_NOME',
  inss_cpf: 'INSS_CPF',
  inss_analysis: 'INSS_ANALISE',
  servidor_orgao: 'SERVIDOR_ORGAO',
  servidor_name: 'SERVIDOR_NOME',
  servidor_cpf: 'SERVIDOR_CPF',
  servidor_analysis: 'SERVIDOR_ANALISE',
  casa_name: 'CASA_NOME',
  casa_cpf: 'CASA_CPF',
  casa_analysis: 'CASA_ANALISE',
  carro_name: 'CARRO_NOME',
  carro_cpf: 'CARRO_CPF',
  carro_analysis: 'CARRO_ANALISE',
  solar_name: 'SOLAR_NOME',
  solar_cpf: 'SOLAR_CPF',
  solar_analysis: 'SOLAR_ANALISE',
  outros_name: 'OUTROS_NOME',
  outros_cpf: 'OUTROS_CPF',
  outros_analysis: 'OUTROS_ANALISE',
  human: 'HUMANO',
}

const STEP_DE_ETAPA = Object.fromEntries(Object.entries(ETAPA).map(([step, etapa]) => [etapa, step])) as Record<string, LeticiaStep>

export function etapaDe(step: string): string {
  return ETAPA[(step || 'menu') as LeticiaStep] || 'MENU'
}

export function stepDe(step: string, etapa = ''): LeticiaStep {
  const direto = (step || '').trim() as LeticiaStep
  if (direto in ETAPA) return direto
  const pelaEtapa = STEP_DE_ETAPA[String(etapa || '').trim().toUpperCase()]
  return pelaEtapa || 'menu'
}

function cpfDigits(text: string): string {
  return text.replace(/\D/g, '')
}

function primeiroNome(text: string): string {
  const parte = text.trim().split(/\s+/)[0] || ''
  return /^[A-Za-zÀ-ÿ]{2,}$/.test(parte) ? parte : ''
}

function pedirCpf(nome: string): string {
  return nome ? `Obrigada, ${nome}! Agora me informe seu CPF.` : 'Obrigada! Agora me informe seu CPF.'
}

const ANALISE = 'Perfeito. Vou verificar as informações para você.'
const AGUARDE = 'A verificação já foi encaminhada. Se quiser falar com a Laiane, é só pedir.'

export function leticiaReply(input: {
  paused: boolean
  welcomed: boolean
  step: string
  text: string
}): LeticiaTurn {
  const text = String(input.text || '').trim()
  const step = stepDe(input.step)
  if (input.paused || step === 'human') return { step: step === 'human' ? 'human' : step, welcomed: input.welcomed, pause: true }
  if (HUMAN.test(text)) {
    return {
      reply: 'Vou transferir seu atendimento para a Laiane. 😊',
      step: 'human',
      welcomed: true,
      pause: true,
      transferTo: 'Laiane',
    }
  }
  if (!input.welcomed) {
    return { reply: LETICIA_WELCOME, step: 'menu', welcomed: true, pause: false }
  }

  const choice = option(text)
  if (step === 'menu') {
    if (choice === 'clt') {
      return { reply: 'Perfeito! Vamos verificar as opções de Crédito CLT. 😊\n\nMe informe seu nome completo.', step: 'clt_name', welcomed: true, pause: false }
    }
    if (choice === 'fgts') {
      return { reply: 'Perfeito! Vamos verificar seu atendimento de Saque-Aniversário FGTS. 😊\n\nPrimeiro, me informe seu nome completo.', step: 'fgts_name', welcomed: true, pause: false }
    }
    if (choice === 'inss') {
      return { reply: 'Perfeito! Vamos verificar seu atendimento de INSS. 😊\n\nPrimeiro, me informe seu nome completo.', step: 'inss_name', welcomed: true, pause: false }
    }
    if (choice === 'servidor') {
      return { reply: 'Perfeito! Vamos verificar seu atendimento de Servidor Público. 😊\n\nQual órgão você trabalha?', step: 'servidor_orgao', welcomed: true, pause: false }
    }
    if (choice === 'casa') return { reply: 'Perfeito. Para o refinanciamento de casa, me informe seu nome completo.', step: 'casa_name', welcomed: true, pause: false }
    if (choice === 'carro') return { reply: 'Perfeito. Para o refinanciamento de carro, me informe seu nome completo.', step: 'carro_name', welcomed: true, pause: false }
    if (choice === 'solar') return { reply: 'Perfeito. Para o crédito de placa solar, me informe seu nome completo.', step: 'solar_name', welcomed: true, pause: false }
    if (choice === 'outros') return { reply: 'Certo. Me conte em uma frase o que você precisa e, em seguida, seu nome completo.', step: 'outros_name', welcomed: true, pause: false }
    return { reply: 'Digite o número ou escreva a opção desejada.', step: 'menu', welcomed: true, pause: false }
  }

  if (step.endsWith('_analysis')) {
    return { reply: AGUARDE, step, welcomed: true, pause: false }
  }
  if (step.endsWith('_name') || step === 'servidor_orgao') {
    if (cpfDigits(text).length >= 11 && step.endsWith('_name')) {
      return { reply: 'Antes do CPF, me informe seu nome completo.', step, welcomed: true, pause: false }
    }
    if (step === 'servidor_orgao') {
      return { reply: 'Obrigada. Qual seu nome completo?', step: 'servidor_name', welcomed: true, pause: false }
    }
    const nome = primeiroNome(text)
    const next = step.replace(/_name$/, '_cpf') as LeticiaStep
    return { reply: pedirCpf(nome), step: next, welcomed: true, pause: false }
  }
  if (step.endsWith('_cpf')) {
    if (cpfDigits(text).length < 11) {
      return { reply: 'Agora me informe seu CPF.', step, welcomed: true, pause: false }
    }
    const next = step.replace(/_cpf$/, '_analysis') as LeticiaStep
    return { reply: ANALISE, step: next, welcomed: true, pause: false }
  }

  return { reply: 'Digite o número ou escreva a opção desejada.', step: 'menu', welcomed: true, pause: false }
}

export type EstadoLetícia = { paused: boolean; welcomed: boolean; step: LeticiaStep }

/** Uma mensagem por vez. O estado que sai de uma entra na próxima. */
export function processarSequencia(inicial: EstadoLetícia, textos: string[]): { estado: EstadoLetícia; respostas: string[] } {
  const respostas: string[] = []
  let estado: EstadoLetícia = { ...inicial, step: stepDe(inicial.step) }
  for (const text of textos) {
    const turn = leticiaReply({ paused: estado.paused, welcomed: estado.welcomed, step: estado.step, text })
    estado = { paused: turn.pause, welcomed: turn.welcomed, step: turn.step }
    if (turn.reply) respostas.push(turn.reply)
  }
  return { estado, respostas }
}

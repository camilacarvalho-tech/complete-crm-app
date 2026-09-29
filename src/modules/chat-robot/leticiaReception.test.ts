import assert from 'node:assert/strict'
import test from 'node:test'
import { botStateDe, camposConversa, etapaDe, leticiaReply, leticiaTravada, LETICIA_ESCLARECER, LETICIA_HANDOFF, LETICIA_MENU_BOTAO, LETICIA_MENU_OPCOES, LETICIA_MENU_TITULO, LETICIA_WELCOME, podeResponder, processarSequencia, stepDoBot, textoSelecaoCliente } from './leticiaReception.ts'
import { formatMessageClock } from '../../lib/messageClock.ts'
import { filterEmojis } from '../../components/chat/emojiData.ts'

test('primeira mensagem é a saudação curta e a lista interativa, sem modalidades no texto', () => {
  const first = leticiaReply({ paused: false, welcomed: false, step: 'menu', text: 'oi' })
  assert.equal(first.reply, LETICIA_WELCOME)
  assert.match(first.reply || '', /Olá! Como podemos ajudar você hoje\?/)
  assert.match(first.reply || '', /Escolha uma modalidade:/)
  assert.doesNotMatch(first.reply || '', /1️⃣|2️⃣|Crédito CLT|FGTS|INSS/)
  assert.equal(first.opcoes?.length, 8)
  assert.deepEqual(first.opcoes, LETICIA_MENU_OPCOES)
  assert.equal(first.opcoes?.[0]?.id, 'credito_clt')
  assert.equal(first.opcoes?.[7]?.id, 'outros')
  assert.equal(LETICIA_MENU_TITULO, 'Escolha sua modalidade')
  assert.equal(LETICIA_MENU_BOTAO.length <= 20, true)
  assert.doesNotMatch(first.reply || '', /CPF|nome completo|nascimento/)
  assert.equal(first.step, 'menu')
  assert.deepEqual(botStateDe(first.step, false), { active: true, flow: 'main', step: 'choose_modality' })
})

test('cliente escolhe FGTS, INSS e CLT por número e só então o CPF é pedido', () => {
  for (const [texto, flow, nome] of [
    ['2', 'fgts', 'Saque-Aniversário FGTS'],
    ['6', 'inss', 'INSS'],
    ['1', 'clt', 'Crédito CLT'],
  ] as const) {
    const turn = leticiaReply({ paused: false, welcomed: true, step: 'menu', text: texto })
    assert.equal(turn.flow, flow)
    assert.equal(turn.step, `${flow}_cpf`)
    assert.match(turn.reply || '', new RegExp(`Você escolheu ${nome}`))
    assert.match(turn.reply || '', /me informe seu CPF/)
    assert.equal(turn.opcoes, undefined)
    assert.equal(turn.modalidadeSelecionada, texto === '2' ? 'fgts' : texto === '6' ? 'inss' : 'credito_clt')
    assert.doesNotMatch(turn.reply || '', /Seja bem-vindo/)
    assert.equal(botStateDe(turn.step, false).step, 'request_cpf')
  }
})

test('cliente escolhe pelo nome da modalidade', () => {
  const casos = [
    ['crédito CLT', 'clt'],
    ['FGTS', 'fgts'],
    ['saque aniversário', 'fgts'],
    ['saque-aniversário', 'fgts'],
    ['refinanciamento de casa', 'casa'],
    ['refinanciamento de carro', 'carro'],
    ['placa solar', 'solar'],
    ['crédito placa solar', 'solar'],
    ['aposentadoria', 'inss'],
    ['benefício', 'inss'],
    ['servidor público', 'servidor'],
    ['SIAPE', 'servidor'],
    ['outros', 'outros'],
  ] as const
  for (const [texto, flow] of casos) {
    const turn = leticiaReply({ paused: false, welcomed: true, step: 'menu', text: texto })
    assert.equal(turn.flow, flow, texto)
    assert.equal(turn.step, `${flow}_cpf`)
  }
})

test('cada id oficial escolhe a modalidade e pede só o CPF', () => {
  const ids = [
    ['credito_clt', 'clt', 'Crédito CLT'],
    ['fgts', 'fgts', 'Saque-Aniversário FGTS'],
    ['refinanciamento_casa', 'casa', 'Refinanciamento de casa'],
    ['refinanciamento_carro', 'carro', 'Refinanciamento de carro'],
    ['placa_solar', 'solar', 'Crédito para placa solar'],
    ['inss', 'inss', 'INSS'],
    ['servidor_publico', 'servidor', 'Servidor Público'],
    ['outros', 'outros', 'Outros assuntos'],
  ] as const
  for (const [id, flow, nome] of ids) {
    const turn = leticiaReply({ paused: false, welcomed: true, step: 'menu', text: 'toque', opcaoId: id })
    assert.equal(turn.flow, flow, id)
    assert.equal(turn.step, `${flow}_cpf`)
    assert.equal(turn.modalidadeSelecionada, id)
    assert.equal(turn.opcoes, undefined)
    assert.match(turn.reply || '', new RegExp(`Você escolheu ${nome}`))
    assert.match(turn.reply || '', /me informe seu CPF/)
    assert.doesNotMatch(turn.reply || '', /1️⃣|Escolha a modalidade/)
    assert.equal(textoSelecaoCliente(id), `Cliente selecionou:\n${nome}`)
    const campos = camposConversa(turn, turn.step, false)
    assert.equal(campos.modalidadeSelecionada, id)
    assert.equal(campos.leticiaStep, `${flow}_cpf`)
    assert.equal(campos.botState.step, 'request_cpf')
  }
})

test('a mesma seleção não gera segunda resposta', () => {
  const vistas = new Set<string>()
  const id = 'wamid.LISTA_FGTS'
  assert.equal(podeResponder(vistas, id), true)
  vistas.add(id)
  const turn = leticiaReply({ paused: false, welcomed: true, step: 'menu', text: 'Saque-Aniversário FGTS', opcaoId: 'fgts' })
  assert.match(turn.reply || '', /Saque-Aniversário FGTS/)
  assert.equal(podeResponder(vistas, id), false)
  const cpf = leticiaReply({ paused: false, welcomed: true, step: turn.step, flow: turn.flow, text: '12345678901' })
  assert.equal(cpf.reply, LETICIA_HANDOFF)
  const deNovo = leticiaReply({ paused: cpf.pause, welcomed: true, step: cpf.leticiaStepGravar || cpf.step, flow: cpf.flow, text: 'oi' })
  assert.equal(deNovo.reply, undefined)
})

test('resposta inválida não reinicia o menu', () => {
  const fluxo = processarSequencia({ paused: false, welcomed: false, step: 'menu' }, ['oi', 'talvez amanhã'])
  assert.equal(fluxo.respostas[0], LETICIA_WELCOME)
  assert.equal(fluxo.respostas[1], LETICIA_ESCLARECER)
  assert.doesNotMatch(fluxo.respostas[1], /Seja bem-vindo|8️⃣/)
  assert.equal(fluxo.estado.step, 'menu')
  const menu = leticiaReply({ paused: false, welcomed: true, step: 'menu', text: 'talvez amanhã' })
  assert.equal(menu.opcoes?.length, 8)
  const cpf = leticiaReply({ paused: false, welcomed: true, step: 'clt_cpf', flow: 'clt', text: '123' })
  assert.equal(cpf.opcoes, undefined)
})

test('CPF inválido pede de novo e CPF válido encerra a Letícia', () => {
  const ruim = leticiaReply({ paused: false, welcomed: true, step: 'fgts_cpf', flow: 'fgts', text: '123' })
  assert.equal(ruim.step, 'fgts_cpf')
  assert.equal(ruim.pause, false)
  assert.equal(ruim.reply, 'Não consegui validar esse CPF. Pode conferir os números e me enviar novamente, por favor?')
  const saudacao = leticiaReply({ paused: false, welcomed: true, step: 'fgts_cpf', flow: 'fgts', text: 'Bom dia' })
  assert.equal(saudacao.reply, LETICIA_WELCOME)
  assert.equal(saudacao.step, 'menu')
  assert.equal(saudacao.opcoes?.length, 8)
  assert.doesNotMatch(ruim.reply || '', /Seja bem-vindo/)
  const bom = leticiaReply({ paused: false, welcomed: true, step: 'fgts_cpf', flow: 'fgts', text: '12345678901' })
  assert.equal(bom.reply, LETICIA_HANDOFF)
  assert.equal(bom.pause, true)
  assert.equal(bom.step, 'human')
  assert.equal(bom.flow, 'fgts')
  assert.equal(bom.leticiaStepGravar, 'human_handoff')
  assert.equal(bom.etapaGravar, 'human_handoff')
  assert.equal(bom.modalidadeSelecionada, 'fgts')
  assert.deepEqual(camposConversa(bom, bom.step, true), {
    leticiaStep: 'human_handoff',
    etapa: 'human_handoff',
    botState: { active: false, flow: 'fgts', step: 'human_handoff' },
    modalidadeSelecionada: 'fgts',
  })
  assert.doesNotMatch(bom.reply || '', /12345678901|R\$/)
  const depois = leticiaReply({ paused: bom.pause, welcomed: true, step: bom.step, flow: bom.flow, text: 'oi' })
  assert.equal(depois.reply, undefined)
  assert.equal(depois.pause, true)
  assert.deepEqual(botStateDe(bom.step, true, bom.flow), { active: false, flow: 'fgts', step: 'human_handoff' })
})

test('estado da modalidade sobrevive ao recarregamento', () => {
  const salvo = botStateDe('inss_cpf', false)
  assert.deepEqual(salvo, { active: true, flow: 'inss', step: 'request_cpf' })
  const step = stepDoBot(salvo)
  assert.equal(step, 'inss_cpf')
  const next = leticiaReply({ paused: !salvo.active, welcomed: true, step, flow: salvo.flow, text: '12345678900' })
  assert.equal(next.reply, LETICIA_HANDOFF)
  assert.equal(next.flow, 'inss')
  assert.equal(etapaDe('inss_cpf'), 'INSS_CPF')
})

test('aguardando cliente não trava a Letícia; assumir e finalizar travam', () => {
  assert.equal(leticiaTravada({ status: 'aguardando_cliente', roboPausado: true, statusAtendimento: 'HUMANO' }), false)
  assert.equal(leticiaTravada({ status: 'em_atendimento', roboPausado: true, statusAtendimento: 'HUMANO' }), true)
  assert.equal(leticiaTravada({ status: 'finalizado' }), true)
  assert.equal(leticiaTravada({ status: 'transferido' }), true)
  assert.equal(leticiaTravada({ status: 'aguardando_atendimento', roboPausado: true }), true)
  assert.equal(leticiaTravada({ status: 'aguardando_funcionario', botState: { active: false, step: 'human_handoff' } }), true)
})

test('assumir ou finalizar impede nova resposta automática', () => {
  const turn = leticiaReply({ paused: true, welcomed: true, step: 'clt_cpf', flow: 'clt', text: '12345678901' })
  assert.equal(turn.reply, undefined)
  assert.equal(turn.pause, true)
  assert.equal(botStateDe('human', true, 'clt').active, false)
})

test('fluxo completo FGTS pede CPF só depois da escolha e não responde de novo', () => {
  const fluxo = processarSequencia({ paused: false, welcomed: false, step: 'menu' }, ['oi', '2', '123', '12345678901', 'ainda está aí?'])
  assert.equal(fluxo.respostas.length, 4)
  assert.equal(fluxo.respostas[0], LETICIA_WELCOME)
  assert.match(fluxo.respostas[1], /Saque-Aniversário FGTS/)
  assert.doesNotMatch(fluxo.respostas[0], /informe seu CPF/)
  assert.match(fluxo.respostas[2], /Não consegui validar esse CPF/)
  assert.equal(fluxo.respostas[3], LETICIA_HANDOFF)
  assert.equal(fluxo.estado.paused, true)
  assert.equal(fluxo.estado.flow, 'fgts')
})

test('welcome sai uma vez e Laiane impede a próxima resposta', () => {
  const fluxo = processarSequencia(
    { paused: false, welcomed: false, step: 'menu' },
    ['oi', 'bom dia', 'quero falar com a Laiane', '1'],
  )
  assert.equal(fluxo.respostas[0], LETICIA_WELCOME)
  assert.equal(fluxo.respostas[1], LETICIA_ESCLARECER)
  assert.match(fluxo.respostas[2], /Laiane/)
  assert.equal(fluxo.respostas.length, 3)
  assert.equal(fluxo.estado.paused, true)
  assert.equal(fluxo.estado.step, 'human')
})

test('transferir para Laiane pausa a Letícia', () => {
  const turn = leticiaReply({ paused: false, welcomed: true, step: 'menu', text: 'quero falar com atendente' })
  assert.equal(turn.pause, true)
  assert.equal(turn.transferTo, 'Laiane')
  assert.match(turn.reply || '', /Laiane/)
})

test('data de hoje mostra só a hora e data antiga mostra o dia', () => {
  const now = new Date(2026, 8, 28, 16, 24)
  assert.equal(formatMessageClock(new Date(2026, 8, 28, 16, 24), now), '16:24')
  assert.equal(formatMessageClock(new Date(2026, 8, 27, 18, 42), now), 'Ontem')
  assert.equal(formatMessageClock(new Date(2026, 8, 26, 9, 5), now), 'sábado')
  const antiga = formatMessageClock(new Date(2026, 8, 1, 9, 5), now)
  assert.match(antiga, /01\/09\/2026/)
})

test('picker de emoji devolve vários itens da categoria', () => {
  const items = filterEmojis('', 'smileys')
  assert.ok(items.length > 40)
  assert.equal(filterEmojis('bandeira', 'flags').length > 0, true)
})

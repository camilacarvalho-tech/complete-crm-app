import assert from 'node:assert/strict'
import test from 'node:test'
import { etapaDe, leticiaReply, LETICIA_WELCOME, processarSequencia } from './leticiaReception.ts'
import { formatMessageClock } from '../../lib/messageClock.ts'
import { filterEmojis } from '../../components/chat/emojiData.ts'

test('nova mensagem recebe o menu e não repete depois', () => {
  const first = leticiaReply({ paused: false, welcomed: false, step: 'menu', text: 'oi' })
  assert.equal(first.reply, LETICIA_WELCOME)
  assert.equal(first.welcomed, true)
  const again = leticiaReply({ paused: true, welcomed: true, step: 'menu', text: 'oi' })
  assert.equal(again.reply, undefined)
  assert.equal(again.pause, true)
})

test('cliente escolhe 1 e entra no CLT sem inventar valor', () => {
  const turn = leticiaReply({ paused: false, welcomed: true, step: 'menu', text: '1' })
  assert.equal(turn.step, 'clt_name')
  assert.match(turn.reply || '', /nome completo/)
  assert.doesNotMatch(turn.reply || '', /CPF/)
  assert.doesNotMatch(turn.reply || '', /R\$/)
  const nome = leticiaReply({ paused: false, welcomed: true, step: 'clt_name', text: 'Camila Carvalho' })
  assert.equal(nome.step, 'clt_cpf')
  assert.match(nome.reply || '', /Camila/)
  assert.match(nome.reply || '', /CPF/)
  const cpf = leticiaReply({ paused: false, welcomed: true, step: 'clt_cpf', text: '12345678901' })
  assert.equal(cpf.step, 'clt_analysis')
  assert.doesNotMatch(cpf.reply || '', /12345678901/)
  assert.doesNotMatch(cpf.reply || '', /R\$/)
})

test('cliente escolhe FGTS por texto', () => {
  const primeiro = leticiaReply({ paused: false, welcomed: false, step: 'menu', text: 'saque FGTS' })
  assert.equal(primeiro.reply, LETICIA_WELCOME)
  const turn = leticiaReply({ paused: false, welcomed: true, step: 'menu', text: 'quero fgts' })
  assert.equal(turn.step, 'fgts_name')
  assert.match(turn.reply || '', /Saque-Aniversário/)
  assert.doesNotMatch(turn.reply || '', /CPF/)
})

test('INSS e servidor perguntam um dado por vez', () => {
  const inss = leticiaReply({ paused: false, welcomed: true, step: 'menu', text: '6' })
  assert.equal(inss.step, 'inss_name')
  assert.doesNotMatch(inss.reply || '', /CPF/)
  const servidor = leticiaReply({ paused: false, welcomed: true, step: 'menu', text: 'prefeitura' })
  assert.equal(servidor.step, 'servidor_orgao')
  assert.match(servidor.reply || '', /órgão/)
  const nome = leticiaReply({ paused: false, welcomed: true, step: 'servidor_orgao', text: 'Prefeitura' })
  assert.equal(nome.step, 'servidor_name')
})

test('CPF encaminha análise sem devolver o número', () => {
  const turn = leticiaReply({ paused: false, welcomed: true, step: 'clt_cpf', text: '12345678901' })
  assert.equal(turn.step, 'clt_analysis')
  assert.doesNotMatch(turn.reply || '', /12345678901/)
  assert.doesNotMatch(turn.reply || '', /R\$/)
  const depois = leticiaReply({ paused: false, welcomed: true, step: 'clt_analysis', text: 'e o valor?' })
  assert.equal(depois.step, 'clt_analysis')
  assert.doesNotMatch(depois.reply || '', /R\$/)
})

test('oi, 1, nome e cpf avançam um estado por mensagem', () => {
  const fluxo = processarSequencia(
    { paused: false, welcomed: false, step: 'menu' },
    ['oi', '1', 'Camila Carvalho', '12345678901'],
  )
  assert.equal(fluxo.respostas.length, 4)
  assert.equal(fluxo.respostas[0], LETICIA_WELCOME)
  assert.match(fluxo.respostas[1], /Crédito CLT/)
  assert.match(fluxo.respostas[1], /Me informe seu nome completo/)
  assert.doesNotMatch(fluxo.respostas[1], /Digite o número/)
  assert.match(fluxo.respostas[2], /Obrigada, Camila/)
  assert.match(fluxo.respostas[2], /CPF/)
  assert.match(fluxo.respostas[3], /Vou verificar as informações/)
  assert.equal(fluxo.estado.step, 'clt_analysis')
  assert.equal(etapaDe(fluxo.estado.step), 'CLT_ANALISE')
})

test('bom dia não repete o menu e o 1 entra no CLT', () => {
  const fluxo = processarSequencia(
    { paused: false, welcomed: true, step: 'menu' },
    ['bom dia', '1'],
  )
  assert.equal(fluxo.respostas.length, 2)
  assert.match(fluxo.respostas[0], /Digite o número ou escreva a opção desejada/)
  assert.doesNotMatch(fluxo.respostas[0], /Seja bem-vindo/)
  assert.match(fluxo.respostas[1], /Crédito CLT/)
  assert.equal(fluxo.estado.step, 'clt_name')
  const tecla = leticiaReply({ paused: false, welcomed: true, step: 'menu', text: '1️⃣' })
  assert.equal(tecla.step, 'clt_name')
})

test('welcome sai uma vez e Laiane impede a próxima resposta', () => {
  const fluxo = processarSequencia(
    { paused: false, welcomed: false, step: 'menu' },
    ['oi', 'bom dia', 'quero falar com a Laiane', '1'],
  )
  assert.equal(fluxo.respostas[0], LETICIA_WELCOME)
  assert.notEqual(fluxo.respostas[1], LETICIA_WELCOME)
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
  assert.equal(formatMessageClock(new Date(2026, 8, 27, 18, 42), now), 'Ontem 18:42')
  const antiga = formatMessageClock(new Date(2026, 8, 26, 9, 5), now)
  assert.match(antiga, /26\/09\/2026/)
  assert.match(antiga, /09:05/)
})

test('picker de emoji devolve vários itens da categoria', () => {
  const items = filterEmojis('', 'smileys')
  assert.ok(items.length > 40)
  assert.equal(filterEmojis('bandeira', 'flags').length > 0, true)
})

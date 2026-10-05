import assert from 'node:assert/strict'
import test from 'node:test'
import { conversaFinalizada, filaChat, instanteChat, naoLidasDe, ordemEstavel, ordenarConversas, teclaEnviaMensagem } from './chatLista.ts'

test('conversa mais recente fica primeiro mesmo com timestamp do Firestore', () => {
  const lista = ordenarConversas([
    { id: 'velha', atualizadoEm: { seconds: 1_700_000_000 } },
    { id: 'nova', atualizadoEm: '2026-09-28T18:00:00.000Z' },
  ])
  assert.equal(lista[0].id, 'nova')
  assert.ok(instanteChat({ seconds: 10 }) === 10000)
})

test('não lidas usam o maior contador real e não inventam', () => {
  assert.equal(naoLidasDe({ naoLidas: 2, unreadCount: 0 }), 2)
  assert.equal(naoLidasDe({ unreadCount: 4 }), 4)
  assert.equal(naoLidasDe({}), 0)
})

test('só atendimento finalizado sai da lista principal', () => {
  assert.equal(conversaFinalizada({ status: 'aguardando_cliente' }), false)
  assert.equal(conversaFinalizada({ status: 'em_atendimento' }), false)
  assert.equal(conversaFinalizada({ status: 'finalizado' }), true)
  assert.equal(conversaFinalizada({ statusAtendimento: 'FINALIZADO' }), true)
})

test('fila do meio é o atendimento humano', () => {
  assert.equal(filaChat({ status: 'aguardando_triagem' }), 'conversas')
  assert.equal(filaChat({ status: 'em_atendimento' }), 'atendimento')
  assert.equal(filaChat({ status: 'aguardando_cliente', atendimentoHumano: true }), 'atendimento')
  assert.equal(filaChat({ status: 'finalizado', atendimentoHumano: true }), 'finalizados')
})

test('mensagem nova não desce a conversa que já está na fila', () => {
  const parado = ordemEstavel(
    [{ id: 'b' }, { id: 'a' }],
    ['a', 'b'],
  )
  assert.deepEqual(parado.ids, ['a', 'b'])
  const chegou = ordemEstavel(
    [{ id: 'c' }, { id: 'b' }, { id: 'a' }],
    ['a', 'b'],
  )
  assert.deepEqual(chegou.ids, ['c', 'a', 'b'])
  const noFim = ordemEstavel(
    [{ id: 'c' }, { id: 'b' }, { id: 'a' }],
    ['a', 'b'],
    true,
  )
  assert.deepEqual(noFim.ids, ['a', 'b', 'c'])
})

test('Enter envia e Shift+Enter quebra a linha', () => {
  assert.equal(teclaEnviaMensagem('Enter', false), 'enviar')
  assert.equal(teclaEnviaMensagem('Enter', true), 'linha')
  assert.equal(teclaEnviaMensagem('a', false), 'ignorar')
})

test('ordenação usa a última mensagem quando a conversa não tem data', () => {
  const lista = ordenarConversas(
    [{ id: 'a' }, { id: 'b' }],
    (id) => (id === 'b' ? 50 : 10),
  )
  assert.deepEqual(lista.map((c) => c.id), ['b', 'a'])
})

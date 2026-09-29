import assert from 'node:assert/strict'
import test from 'node:test'
import { conversaFinalizada, instanteChat, naoLidasDe, ordenarConversas, teclaEnviaMensagem } from './chatLista.ts'

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

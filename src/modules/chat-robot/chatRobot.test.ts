import assert from 'node:assert/strict'
import test from 'node:test'
import { isHumanHandoffText, tickChatRobot } from './chatRobot.ts'
import { detectProductOperation, requirementsFor } from './productRequirements.ts'

test('handoff 1 e quero falar com atendente pausam o robô', () => {
  assert.equal(isHumanHandoffText('1'), true)
  assert.equal(isHumanHandoffText('quero falar com atendente'), true)
  const t = tickChatRobot({ state: 'PRODUCT_SELECTION', inboundText: '1', channelConnected: false, robotEnabled: false })
  assert.equal(t.nextState, 'HUMAN_REQUEST')
  assert.equal(t.pauseRobot, true)
  assert.equal(t.sendNow, false)
})

test('matriz INSS portabilidade pede só documentos cadastrados', () => {
  const r = requirementsFor('INSS', 'PORTABILIDADE')
  assert.equal(r.pendingConfig, false)
  assert.ok(r.documents.includes('Extrato'))
  assert.ok(r.documents.includes('Documentos de portabilidade'))
})

test('FGTS sem operação marcada fica pendente de configuração', () => {
  const r = requirementsFor('FGTS', '')
  assert.equal(r.pendingConfig, true)
})

test('robô pede documentos da matriz após produto/operação', () => {
  const t = tickChatRobot({
    state: 'PRODUCT_SELECTION',
    inboundText: 'INSS portabilidade',
    channelConnected: false,
    robotEnabled: false,
  })
  assert.equal(t.nextState, 'DOCUMENT_REQUEST')
  assert.equal(t.produto, 'INSS')
  assert.equal(t.operacao, 'PORTABILIDADE')
  assert.ok(t.draftReply?.includes('Documentos de portabilidade'))
  assert.equal(t.pendingConfig, false)
})

test('produto/operação desconhecidos não inventam exigência', () => {
  const d = detectProductOperation('quero um cartão misterioso')
  assert.equal(d.produto, '')
  const r = requirementsFor('CARTAO', 'XPTO')
  assert.equal(r.pendingConfig, true)
})

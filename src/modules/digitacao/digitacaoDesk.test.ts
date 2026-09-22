import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildPendencias,
  displayOperationalStatus,
  findExactCliente,
  formatCpfDisplay,
  matchClientes,
  proposalsForCliente,
  sourcedField,
} from './digitacaoDesk.ts'

test('sugestão por parte do CPF', () => {
  const list = [
    { id: '1', nome: 'Maria da Silva', cpf: '39600000000' },
    { id: '2', nome: 'João da Silva', cpf: '11111111111' },
  ]
  const r = matchClientes(list, '396')
  assert.equal(r.length, 1)
  assert.equal(r[0].nome, 'Maria da Silva')
})

test('CPF completo encontra cliente existente', () => {
  const list = [{ id: '1', nome: 'Maria', cpf: '000.000.000-00' }]
  const hit = findExactCliente(list, '00000000000')
  assert.equal(hit?.id, '1')
  assert.equal(formatCpfDisplay('00000000000'), '000.000.000-00')
})

test('status do CRM usa capitalização normal', () => {
  assert.equal(displayOperationalStatus({ id: 'a', status: 'em_digitacao' }), 'Em digitação')
  assert.equal(displayOperationalStatus({ id: 'a', status: 'aguardando_assinatura' }), 'Aguardando assinatura')
  assert.equal(displayOperationalStatus({ id: 'a', statusInstituicao: 'INTENÇÃO ENVIADA' }), 'INTENÇÃO ENVIADA')
})

test('campo vazio da instituição não inventa valor', () => {
  const f = sourcedField({ value: '', fromInstitution: true, waitingInstitution: true })
  assert.equal(f.missing, true)
  assert.match(f.value, /Não retornado/)
})

test('propostas do cliente reutilizam registros existentes', () => {
  const cli = { id: 'cli-1', cpf: '12345678901' }
  const dig = [{ id: 'd1', clienteId: 'cli-1', banco: 'FACTA', produto: 'INSS', operacao: 'PORTABILIDADE' }]
  const prop = [{ id: 'p1', clienteId: 'cli-1', banco: 'FACTA', produto: 'INSS', operacao: 'PORTABILIDADE' }]
  const rows = proposalsForCliente(dig, prop, cli)
  assert.equal(rows.length, 1)
  assert.equal(rows[0].id, 'd1')
})

test('pendência aguardando API sem inventar documento', () => {
  const p = buildPendencias({
    rec: { id: 'x', mensagemSimulacao: 'Aguardando API', parcela: '' },
    docs: [],
  })
  assert.ok(p.includes('Aguardando API'))
  assert.ok(p.includes('Campo não retornado pela instituição'))
})

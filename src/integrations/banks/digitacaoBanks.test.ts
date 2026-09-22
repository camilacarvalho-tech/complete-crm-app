import assert from 'node:assert/strict'
import test from 'node:test'
import { factaAdapter } from './factaAdapter.ts'
import { novoSaqueAdapter } from './novoSaqueAdapter.ts'
import { icredAdapter } from './icredAdapter.ts'
import { tokeRealAdapter } from './tokeRealAdapter.ts'
import { INSTITUTION_ADAPTERS, simulateAdapters, simulateAllInstitutions } from './registry.ts'
import { emptyOffer } from './types.ts'
import { fillDigitacaoFromOffer, ingestSimulationResult } from '../../modules/digitacao/simulationToDigitacao.ts'

const input = { produto: 'INSS', operacao: 'PORTABILIDADE', clienteId: 'cli-1', clienteNome: 'Teste', cpf: '00000000000', origem: 'chat' }

test('simulação Facta sem API não inventa valores', async () => {
  const r = await factaAdapter.simulate(input)
  assert.equal(r.banco, 'FACTA')
  assert.equal(r.status, 'Aguardando API')
  assert.equal(r.valorLiberado, null)
  assert.equal(r.parcela, null)
})

test('simulação Novo Saque sem API', async () => {
  const r = await novoSaqueAdapter.simulate(input)
  assert.equal(r.banco, 'NOVO SAQUE')
  assert.equal(r.prazo, null)
})

test('simulação ICRED sem API', async () => {
  const r = await icredAdapter.simulate(input)
  assert.equal(r.banco, 'ICRED')
  assert.equal(r.taxaMensal, null)
})

test('Toke Real permanece preparado sem endpoint', async () => {
  const r = await tokeRealAdapter.simulate(input)
  assert.equal(r.banco, 'TOKE REAL')
  assert.equal(r.status, 'Aguardando API')
  assert.match(r.message, /preparado|Aguardando/i)
})

test('produto INSS não é adapter de banco', () => {
  assert.equal(INSTITUTION_ADAPTERS.some((a) => a.id === 'inss' || a.name === 'INSS'), false)
  assert.equal(INSTITUTION_ADAPTERS.length, 4)
})

test('entrada automática na Digitação', () => {
  const offer = emptyOffer(factaAdapter, input, {
    status: 'Dados retornados pela instituição',
    valorLiberado: 12000,
    parcela: 55.42,
    prazo: 96,
    taxaMensal: 1.8,
    message: 'Dados retornados pela instituição',
  })
  const r = ingestSimulationResult({ offer, clienteId: 'cli-1', clienteNome: 'Maria', cpf: '123' })
  assert.equal(r.created, true)
  assert.equal(r.digitacao.produto, 'INSS')
  assert.equal(r.digitacao.operacao, 'PORTABILIDADE')
  assert.equal(r.digitacao.banco, 'FACTA')
  assert.equal(r.digitacao.parcela, '55.42')
  assert.equal(r.digitacao.prazo, '96')
  assert.equal(r.digitacao.valorLiberado, '12000')
  assert.equal(r.digitacao.contratacaoAutomatica, false)
  assert.equal(r.proposta.status, 'em_digitacao')
})

test('preenchimento automático e campos ausentes vazios', () => {
  const offer = emptyOffer(icredAdapter, input)
  const d = fillDigitacaoFromOffer({ offer, clienteNome: 'João' })
  assert.equal(d.clienteNome, 'João')
  assert.equal(d.saldoDevedor, '')
  assert.equal(d.troco, '')
  assert.equal(d.margem, '')
  assert.equal(d.preenchidoPorRobo, true)
})

test('erro de API não inventa números', () => {
  const offer = emptyOffer(factaAdapter, input, { status: 'Erro de API', message: 'timeout' })
  const d = fillDigitacaoFromOffer({ offer })
  assert.equal(d.valorLiberado, '')
  assert.equal(d.mensagemSimulacao, 'timeout')
})

test('instituição com erro não impede as demais', async () => {
  const boom = {
    ...factaAdapter,
    async simulate() {
      throw new Error('offline')
    },
  }
  const all = await simulateAdapters([boom, icredAdapter], input)
  assert.equal(all.length, 2)
  assert.equal(all[0].status, 'Erro de API')
  assert.equal(all[0].valorLiberado, null)
  assert.equal(all[1].banco, 'ICRED')
  assert.equal(all[1].status, 'Aguardando API')
})

test('idempotência da digitação', () => {
  const offer = emptyOffer(novoSaqueAdapter, input)
  const a = ingestSimulationResult({ offer, clienteId: 'cli-1' })
  const b = ingestSimulationResult({ offer, clienteId: 'cli-1', existingDigitacaoKey: a.key })
  assert.equal(b.reused, true)
  assert.equal(b.created, false)
})

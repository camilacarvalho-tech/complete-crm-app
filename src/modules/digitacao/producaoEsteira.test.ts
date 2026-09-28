import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { BANK_ADAPTER_IDS } from '../../integrations/banks/types.ts'
import { PRODUCT_CATALOG } from '../../catalog/productCatalog.ts'
import {
  BANCOS_DIGITACAO,
  assumirProposta,
  abrirPendencia,
  anexarDocumento,
  checklistDocumentos,
  contarCards,
  contarMinhaDigitacao,
  cpfMascarado,
  filtrarPropostas,
  filaDigitacao,
  filaOperacional,
  indiceTimeline,
  minhaProducao,
  NAO_INFORMADO,
  ORIGENS_LEAD,
  SIMULACAO_INDISPONIVEL,
  aplicarEnderecoCep,
  informarContrato,
  mascaraCep,
  mascaraCpf,
  mascaraTelefone,
  moedaBr,
  montarNovaDigitacao,
  mudarStatus,
  prepararBanco,
  produtoDigitacao,
  registroVisivel,
  rotuloOrigem,
  registrarSimulacao,
  resolverPendencia,
  statusEsteira,
  type PropostaProd,
} from './producaoEsteira.ts'

const base = (extra: Partial<PropostaProd> = {}): PropostaProd => ({
  id: 'p1',
  clienteNome: 'João Silva',
  cpf: '12345678901',
  telefone: '11999998888',
  produto: 'INSS',
  banco: 'FACTA',
  status: 'NOVO',
  cidade: 'São Paulo',
  origem: 'whatsapp',
  numeroProposta: '000123',
  criadoEm: '2026-09-28T18:00:00.000Z',
  atualizadoEm: '2026-09-28T18:40:00.000Z',
  historicoEsteira: [],
  pendencias: [],
  simulacoes: [],
  documentosProposta: [],
  ...extra,
})

test('criar proposta começa em NOVO e mascara o CPF', () => {
  const rec = base()
  assert.equal(statusEsteira(rec.status), 'NOVO')
  assert.equal(cpfMascarado(rec.cpf), '***.***.***-**')
  assert.equal(cpfMascarado('123'), '—')
})

test('editar proposta altera campo sem apagar o histórico', () => {
  const rec = base({ historicoEsteira: [{ propostaId: 'p1', statusAnterior: '', statusNovo: 'NOVO', dataHora: '2026-09-28T18:00:00.000Z', usuario: 'Camila', observacao: 'Criada' }] })
  const editada = { ...rec, banco: 'ICRED' }
  assert.equal(editada.banco, 'ICRED')
  assert.equal(editada.historicoEsteira?.length, 1)
})

test('alterar status registra anterior, novo, data e usuário', () => {
  const r = mudarStatus(base(), 'EM_ANALISE', 'Camila', 'Encaminhada', '2026-09-28T18:42:00.000Z')
  assert.equal(r.ok, true)
  assert.equal(r.status, 'EM_ANALISE')
  assert.equal(r.historico.length, 1)
  assert.equal(r.historico[0].statusAnterior, 'NOVO')
  assert.equal(r.historico[0].statusNovo, 'EM_ANALISE')
  assert.equal(r.historico[0].usuario, 'Camila')
  const deNovo = mudarStatus({ ...base(), status: 'EM_ANALISE', historicoEsteira: r.historico }, 'PENDENCIA', 'Camila', 'Banco solicitou comprovante de residência.', '2026-09-28T18:50:00.000Z')
  assert.equal(deNovo.historico.length, 2)
  assert.equal(deNovo.historico[0].statusNovo, 'EM_ANALISE')
})

test('estado fora da esteira é recusado', () => {
  const r = mudarStatus(base(), 'INVENTADO', 'Camila', '', '2026-09-28T18:42:00.000Z')
  assert.equal(r.ok, false)
  assert.equal(r.historico.length, 0)
})

test('pendência abre e resolve sem apagar o registro', () => {
  const rec = base({ status: 'PENDENCIA' })
  const pendencias = abrirPendencia(rec, {
    id: 'pen-1',
    tipo: 'Documento faltante',
    descricao: 'Comprovante de residência',
    responsavel: 'Camila',
    prazo: '2026-09-30',
    criadoEm: '2026-09-28T18:42:00.000Z',
  })
  assert.equal(pendencias[0].status, 'ABERTA')
  const resolvida = resolverPendencia({ ...rec, pendencias }, 'pen-1', 'Camila', '2026-09-28T19:00:00.000Z')
  assert.equal(resolvida.ok, true)
  assert.equal(resolvida.pendencias.length, 1)
  assert.equal(resolvida.pendencias[0].status, 'RESOLVIDA')
  assert.match(resolvida.historico.at(-1)?.observacao || '', /PENDÊNCIA RESOLVIDA/)
})

test('assumir proposta e impedir dupla atribuição', () => {
  const livre = assumirProposta(base({ status: 'AGUARDANDO_DIGITACAO' }), 'op-1', 'Camila', '2026-09-28T18:10:00.000Z')
  assert.equal(livre.ok, true)
  assert.equal(livre.patch?.status, 'EM_DIGITACAO')
  const ocupada = assumirProposta(base({ status: 'EM_DIGITACAO', operadorId: 'op-1', operadorNome: 'Camila' }), 'op-2', 'Laiane', '2026-09-28T18:20:00.000Z')
  assert.equal(ocupada.ok, false)
  const mesma = assumirProposta(base({ status: 'EM_DIGITACAO', operadorId: 'op-1' }), 'op-1', 'Camila', '2026-09-28T18:20:00.000Z')
  assert.equal(mesma.ok, true)
})

test('simulação guarda taxa só quando ela existe', () => {
  const semTaxa = registrarSimulacao(base(), {
    id: 's1',
    produto: 'INSS',
    banco: 'FACTA',
    valor: 8500,
    prazo: 84,
    parcela: 180,
    criadoEm: '2026-09-28T18:15:00.000Z',
  })
  assert.equal(semTaxa[0].taxa, null)
  assert.equal(semTaxa[0].valor, 8500)
  const comTaxa = registrarSimulacao(base(), {
    id: 's2',
    produto: 'INSS',
    banco: 'FACTA',
    valor: 8500,
    prazo: 84,
    parcela: 180,
    taxa: 1.8,
    criadoEm: '2026-09-28T18:16:00.000Z',
  })
  assert.equal(comTaxa[0].taxa, 1.8)
})

test('vincular cliente, lead, conversa e documento', () => {
  const rec = base({ clienteId: 'cli-1', leadId: 'lead-1', conversaId: 'conv-1' })
  assert.equal(rec.clienteId, 'cli-1')
  assert.equal(rec.leadId, 'lead-1')
  assert.equal(rec.conversaId, 'conv-1')
  const docs = anexarDocumento(rec, { id: 'd1', nome: 'RG', tipo: 'RG', tamanho: 1200, status: 'anexado', criadoEm: '2026-09-28T18:30:00.000Z' })
  assert.equal(docs.length, 1)
  assert.equal(docs[0].nome, 'RG')
})

test('filtrar, pesquisar e separar Minha Produção sem inventar taxa', () => {
  const items = [
    base(),
    base({ id: 'p2', clienteNome: 'Maria', status: 'EM_ANALISE', operadorId: 'op-1', cidade: 'Campinas', numeroProposta: '000200' }),
    base({ id: 'p3', status: 'APROVADA', operadorId: 'op-1', banco: 'ICRED' }),
  ]
  assert.equal(filtrarPropostas(items, { banco: 'FACTA' }).length, 2)
  assert.equal(filtrarPropostas(items, { busca: 'Maria' }).length, 1)
  assert.equal(filtrarPropostas(items, { busca: '12345678901' }).length, 3)
  assert.equal(filtrarPropostas(items, { visao: 'minhas', operadorAtualId: 'op-1' }).length, 2)
  assert.equal(filtrarPropostas(items, { card: 'analise' }).length, 1)
  const prod = minhaProducao(items, 'op-9', '2026-09-28')
  assert.equal(prod.propostasHoje, 0)
  assert.equal(prod.taxaAprovacao, null)
  assert.equal(prod.tempoMedioAnaliseHoras, null)
  const comDecisao = minhaProducao(
    [base({ id: 'a', operadorId: 'op-1', status: 'APROVADA', criadoEm: '2026-09-28T10:00:00.000Z' }), base({ id: 'b', operadorId: 'op-1', status: 'REPROVADA' })],
    'op-1',
    '2026-09-28',
  )
  assert.equal(comDecisao.taxaAprovacao, 0.5)
})

test('fila de digitação mostra as mais antigas primeiro', () => {
  const fila = filaDigitacao([
    base({ id: 'nova', status: 'AGUARDANDO_DIGITACAO', criadoEm: '2026-09-28T12:00:00.000Z' }),
    base({ id: 'velha', status: 'DIGITACAO', criadoEm: '2026-09-28T08:00:00.000Z' }),
    base({ id: 'fora', status: 'EM_ANALISE', criadoEm: '2026-09-28T01:00:00.000Z' }),
  ])
  assert.deepEqual(fila.map((f) => f.id), ['velha', 'nova'])
})

test('cards contam só status reais da esteira', () => {
  const n = contarCards([base(), base({ id: 'x', status: 'EM_ANALISE' }), base({ id: 'y', status: 'status_que_nao_existe' })])
  assert.equal(n.novas, 1)
  assert.equal(n.analise, 1)
  assert.equal(n.pagas, 0)
})

test('timeline destaca a etapa atual e INSS não é banco', () => {
  assert.equal(indiceTimeline('EM_ANALISE') > indiceTimeline('NOVO'), true)
  assert.equal(PRODUCT_CATALOG.some((p) => p.code === 'INSS'), true)
  assert.equal(BANK_ADAPTER_IDS.includes('INSS' as never), false)
})

test('preparar banco não chama envio real', () => {
  const r = prepararBanco({})
  assert.equal(r.status, 'NOT_IMPLEMENTED')
  const pronto = prepararBanco({ sendProposal() { throw new Error('não pode chamar') } })
  assert.equal(pronto.status, 'NOT_IMPLEMENTED')
})

test('nova digitação escolhe produto e banco e entra na fila sem chamar API', () => {
  assert.equal(produtoDigitacao('INSS')?.code, 'INSS')
  assert.equal(produtoDigitacao('CLT')?.label, 'Crédito CLT')
  assert.deepEqual([...BANCOS_DIGITACAO], ['FACTA', 'NOVO SAQUE', 'ICRED', 'TOKE REAL'])
  assert.equal(BANK_ADAPTER_IDS.includes('INSS' as never), false)
  const vazia = montarNovaDigitacao({
    clienteNome: '',
    cpf: '',
    telefone: '',
    cidade: '',
    uf: '',
    leadId: '',
    clienteId: '',
    conversaId: '',
    produto: 'INSS',
    banco: 'FACTA',
    tipoOperacao: '',
    origem: '',
    observacoes: '',
    valorSolicitado: null,
    valorLiberado: null,
    prazo: null,
    parcela: null,
    margem: null,
    documentos: [],
    usuario: 'Camila',
    dataHora: '2026-09-28T18:00:00.000Z',
    numeroProposta: 'P1',
  })
  assert.equal(vazia.ok, false)
  const doChat = montarNovaDigitacao({
    clienteNome: 'Camila',
    cpf: '12345678901',
    telefone: '11999998888',
    cidade: 'São Paulo',
    uf: 'SP',
    leadId: '',
    clienteId: 'cli-1',
    conversaId: 'conv-1',
    produto: 'CLT',
    banco: 'FACTA',
    tipoOperacao: 'Nova contratação',
    origem: 'whatsapp',
    observacoes: '',
    valorSolicitado: null,
    valorLiberado: null,
    prazo: null,
    parcela: null,
    margem: null,
    documentos: [],
    usuario: 'Camila',
    dataHora: '2026-09-28T18:00:00.000Z',
    numeroProposta: 'P2',
  })
  assert.equal(doChat.ok, true)
  assert.equal(doChat.registro?.status, 'DIGITACAO')
  assert.equal(doChat.registro?.produto, 'CLT')
  assert.equal(doChat.registro?.banco, 'FACTA')
  assert.equal(doChat.registro?.conversaId, 'conv-1')
  assert.equal(doChat.registro?.margem, null)
  assert.equal(doChat.registro?.historicoEsteira?.length, 1)
  const doLead = montarNovaDigitacao({
    ...doChat.registro,
    clienteNome: 'João',
    clienteId: 'cli-2',
    leadId: 'lead-2',
    conversaId: '',
    produto: 'INSS',
    banco: 'NOVO SAQUE',
    origem: 'leads_monitor',
    usuario: 'Camila',
    dataHora: '2026-09-28T18:05:00.000Z',
    numeroProposta: 'P3',
    tipoOperacao: '',
    observacoes: '',
    valorSolicitado: null,
    valorLiberado: null,
    prazo: null,
    parcela: null,
    margem: null,
    documentos: [],
    cpf: '12345678901',
    telefone: '',
    cidade: '',
    uf: '',
  })
  assert.equal(doLead.registro?.banco, 'NOVO SAQUE')
  assert.equal(doLead.registro?.leadId, 'lead-2')
  assert.equal(doLead.registro?.produto, 'INSS')
  const icred = montarNovaDigitacao({ ...doChat.registro!, clienteNome: 'Ana', clienteId: 'c', banco: 'ICRED', produto: 'FGTS', usuario: 'Camila', dataHora: '2026-09-28T19:00:00.000Z', numeroProposta: 'P4', tipoOperacao: '', observacoes: '', valorSolicitado: null, valorLiberado: null, prazo: null, parcela: null, margem: null, documentos: [], cpf: '', telefone: '', cidade: '', uf: '', leadId: '', conversaId: '', origem: '' })
  const toke = montarNovaDigitacao({ ...icred.registro!, clienteNome: 'Ana', banco: 'TOKE REAL', usuario: 'Camila', dataHora: '2026-09-28T19:01:00.000Z', numeroProposta: 'P5', tipoOperacao: '', observacoes: '', valorSolicitado: null, valorLiberado: null, prazo: null, parcela: null, margem: null, documentos: [], cpf: '', telefone: '', cidade: '', uf: '', leadId: '', clienteId: 'c', conversaId: '', origem: '', produto: 'INSS' })
  assert.equal(icred.registro?.banco, 'ICRED')
  assert.equal(toke.registro?.banco, 'TOKE REAL')
  const fila = filaOperacional([
    { ...doChat.registro!, id: 'nova', criadoEm: '2026-09-28T12:00:00.000Z' },
    { ...doLead.registro!, id: 'velha', criadoEm: '2026-09-28T08:00:00.000Z' },
  ])
  assert.deepEqual(fila.map((f) => f.id), ['velha', 'nova'])
  const ocupada = assumirProposta({ ...doChat.registro!, status: 'EM_DIGITACAO', operadorId: 'op-1' }, 'op-2', 'Laiane', '2026-09-28T20:00:00.000Z')
  assert.equal(ocupada.ok, false)
  assert.equal(ocupada.motivo, 'Esta digitação já foi atribuída a outro operador.')
  const docs = checklistDocumentos([])
  assert.equal(docs.find((d) => d.tipo === 'RG')?.status, 'Pendente')
  const comRg = checklistDocumentos([{ id: 'd', nome: 'RG.pdf', tipo: 'RG', tamanho: 1200, status: 'anexado', criadoEm: '2026-09-28T18:00:00.000Z' }])
  assert.equal(comRg.find((d) => d.tipo === 'RG')?.status, 'OK')
  const antes = doChat.registro!.historicoEsteira || []
  const depois = mudarStatus(doChat.registro!, 'ENVIADA', 'Camila', 'Pronta na operação local', '2026-09-28T21:00:00.000Z')
  assert.equal(depois.historico.length, antes.length + 1)
  assert.equal(depois.historico[0].observacao, antes[0].observacao)
  const minhas = contarMinhaDigitacao([{ ...doChat.registro!, operadorId: 'op-1', status: 'DIGITACAO' }], 'op-1')
  assert.equal(minhas.fazer, 1)
  const banco = prepararBanco({ sendProposal() { throw new Error('api') } })
  assert.equal(banco.status, 'NOT_IMPLEMENTED')
})

test('Lead e Chat só pré-preenchem a proposta, não contratam', () => {
  const doLead = base({ leadId: 'lead-9', clienteId: 'cli-9', origem: 'leads_monitor', status: 'NOVO' })
  const doChat = base({ conversaId: 'conv-9', clienteId: 'cli-9', origem: 'whatsapp', status: 'NOVO' })
  assert.equal(doLead.status, 'NOVO')
  assert.equal(doChat.conversaId, 'conv-9')
  assert.equal(statusEsteira('ENVIADA'), 'ENVIADA')
  assert.notEqual(doLead.status, 'ENVIADA')
})

test('ajustes operacionais de máscara, origem, CEP, moeda e contrato', () => {
  assert.equal(mascaraCpf('12345678901'), '123.456.789-01')
  assert.equal(cpfMascarado('12345678901'), '***.***.***-**')
  assert.equal(mascaraTelefone('14999998888'), '(14) 99999-8888')
  assert.equal(mascaraCep('19900000'), '19900-000')
  assert.equal(moedaBr(null), NAO_INFORMADO)
  assert.equal(moedaBr(5000), (5000).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }))
  assert.equal(moedaBr(850.5), (850.5).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }))
  const cep = aplicarEnderecoCep({ cidade: '', uf: '', logradouro: '', bairro: '' }, { ok: true, cidade: 'Ourinhos', uf: 'SP', logradouro: 'Rua', bairro: 'Centro' })
  assert.equal(cep.endereco.cidade, 'Ourinhos')
  assert.equal(cep.endereco.uf, 'SP')
  const ausente = aplicarEnderecoCep({ cidade: 'Manual', uf: 'SP' }, { ok: false })
  assert.equal(ausente.ok, false)
  assert.equal(ausente.mensagem, 'CEP não encontrado.')
  assert.equal(ausente.endereco.cidade, 'Manual')
  for (const origem of ORIGENS_LEAD) {
    if (origem === 'Facebook' || origem === 'Instagram') continue
    assert.equal(rotuloOrigem({ origem }), origem)
  }
  assert.equal(rotuloOrigem({ metaSource: 'facebook' }), 'Facebook')
  assert.equal(rotuloOrigem({ metaSource: 'ig', metaMedium: 'instagram' }), 'Instagram')
  assert.equal(rotuloOrigem({ metaCampaign: 'Campanha Real' }), 'Campanha Real')
  assert.equal(rotuloOrigem({}), NAO_INFORMADO)
  const contrato = informarContrato(base(), { numeroContrato: 'CTR-10' }, 'Camila', '2026-09-28T22:00:00.000Z')
  assert.equal(contrato.ok, true)
  assert.equal(contrato.registro?.numeroContrato, 'CTR-10')
  assert.equal(contrato.registro?.historicoEsteira?.length, 1)
  const deNovo = informarContrato(contrato.registro!, { numeroContrato: 'CTR-10', numeroOperacao: 'OP-2' }, 'Camila', '2026-09-28T22:10:00.000Z')
  assert.equal(deNovo.registro?.historicoEsteira?.length, 2)
  assert.equal(deNovo.registro?.historicoEsteira?.[0].evento, 'Contrato informado')
  assert.equal(informarContrato(base(), {}, 'Camila', '2026-09-28T22:00:00.000Z').ok, false)
  assert.equal(SIMULACAO_INDISPONIVEL, 'Simulação indisponível para este produto/banco.')
  assert.equal(registroVisivel({ clienteNome: 'Lead Homolog' }), false)
  assert.equal(registroVisivel({ clienteNome: 'Camila Carvalho' }), true)
  assert.equal(produtoDigitacao('INSS')?.code, 'INSS')
  assert.equal(BANK_ADAPTER_IDS.includes('facta' as never), true)
  assert.equal(BANK_ADAPTER_IDS.includes('novo_saque' as never), true)
  assert.equal(BANK_ADAPTER_IDS.includes('icred' as never), true)
  assert.equal(BANK_ADAPTER_IDS.includes('toke_real' as never), true)
  const menu = readFileSync(new URL('../../config/menuConfig.ts', import.meta.url), 'utf8')
  const app = readFileSync(new URL('../../App.tsx', import.meta.url), 'utf8')
  const icred = readFileSync(new URL('../../integrations/banks/icredAdapter.ts', import.meta.url), 'utf8')
  const central = readFileSync(new URL('../../pages/CentralProducao.tsx', import.meta.url), 'utf8')
  const chat = readFileSync(new URL('../../pages/ChatCenter.tsx', import.meta.url), 'utf8')
  const leads = readFileSync(new URL('../leads-monitor/components/LeadResults.tsx', import.meta.url), 'utf8')
  assert.equal(menu.includes("label: 'Propostas'"), false)
  assert.match(menu, /label: 'Digitação'/)
  assert.match(app, /path="propostas"/)
  assert.match(app, /path="digitacao"/)
  assert.match(icred, /export const icredAdapter/)
  assert.equal(central.includes('Cliente relacionado'), false)
  assert.equal(central.includes('Conversa relacionada'), false)
  assert.equal(central.includes('+ Nova digitação'), false)
  assert.match(central, /\+ Nova proposta/)
  assert.equal(central.includes('Abrir pendência'), false)
  assert.match(central, /\+ Nova pendência/)
  assert.match(chat, /Criar proposta/)
  assert.match(chat, /Criar digitação/)
  assert.match(leads, />\s*Proposta\s*</)
  assert.match(leads, />\s*Digitação\s*</)
  assert.equal(prepararBanco({ sendProposal() { throw new Error('banco') } }).status, 'NOT_IMPLEMENTED')
})

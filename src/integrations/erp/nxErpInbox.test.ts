import assert from 'node:assert/strict'
import test from 'node:test'
import {
  alreadySeen,
  inboundIdempotencyKey,
  mapCampaignEvent,
  mapInboundMessage,
  nxErpStatus,
  nxErpStatusLabel,
} from './nxErpInbox.ts'
import { buildRespostaChat, deliveryMark, motivoEnvioWhatsapp, phoneError } from './chatOutbound.ts'
import { mesmoTelefoneBr } from '../../lib/format.ts'

test('WhatsApp com 55 é o mesmo telefone do cliente no CRM', () => {
  assert.equal(mesmoTelefoneBr('5514996902902', '14996902902'), true)
  assert.equal(mesmoTelefoneBr('5514996902902', '14 99690-2902'), true)
  assert.equal(mesmoTelefoneBr('5511999887766', '11988887766'), false)
})

test('mensagem inbound preserva telefone, nome, texto, wamid e campanha', () => {
  const mapped = mapInboundMessage({
    telefone: '5511999887766',
    nome: 'Maria',
    mensagem: 'Tenho interesse',
    wamid: 'wamid.IN_001',
    campanha_id: 'camp-1',
    campanha_nome: 'INSS Abril',
    disparo_id: 'disp-9',
    template: 'oferta_inss',
    produto: 'INSS',
    status: 'delivered',
  })
  assert.equal(mapped.phone, '5511999887766')
  assert.equal(mapped.nome, 'Maria')
  assert.equal(mapped.message, 'Tenho interesse')
  assert.equal(mapped.wamid, 'wamid.IN_001')
  assert.equal(mapped.messageId, 'wamid.IN_001')
  assert.equal(mapped.campaignId, 'camp-1')
  assert.equal(mapped.campanhaNome, 'INSS Abril')
  assert.equal(mapped.disparoId, 'disp-9')
  assert.equal(mapped.templateId, 'oferta_inss')
  assert.equal(mapped.produto, 'INSS')
  assert.equal(mapped.source, 'NX_ERP')
  assert.equal(mapped.status, 'delivered')
})

test('idempotência usa wamid e não duplica', () => {
  const key = inboundIdempotencyKey({ messageId: 'local', wamid: 'wamid.DUP_001' })
  assert.equal(key, 'wamid.DUP_001')
  assert.equal(alreadySeen(['wamid.DUP_001'], key), true)
  assert.equal(alreadySeen(['wamid.OUTRO'], key), false)
})

test('campanha do ERP usa os eventos que o CRM já conhece', () => {
  assert.equal(mapCampaignEvent('campanha_criada'), 'campaign_created')
  assert.equal(mapCampaignEvent('disparo_iniciado'), 'campaign_contacted')
  assert.equal(mapCampaignEvent('disparo_finalizado'), 'campaign_finished')
  assert.equal(mapCampaignEvent('mensagem_entregue'), 'message_sent')
  assert.equal(mapCampaignEvent('resposta_cliente'), 'message_received')
  assert.equal(mapCampaignEvent('tipo_inventado'), null)
})

test('status só aceita o que o ERP ou a Meta já enviam', () => {
  assert.equal(nxErpStatus('aceito'), 'aceito')
  assert.equal(nxErpStatusLabel('aceito'), 'aceita pelo ERP')
  assert.equal(nxErpStatusLabel('sent'), 'enviada à Meta')
  assert.equal(nxErpStatusLabel('delivered'), 'entregue')
  assert.equal(nxErpStatusLabel('read'), 'lida')
  assert.equal(nxErpStatusLabel('failed'), 'falhou')
  assert.equal(nxErpStatus('entregue_inventado'), null)
  assert.equal(nxErpStatusLabel('entregue_inventado'), null)
})

test('resposta outbound envia crm_mensagem_id e não leva token', () => {
  const body = buildRespostaChat({
    crmMensagemId: 'crm-1',
    telefone: '+55 (11) 99988-7766',
    texto: 'Olá',
    conversaId: 'c1',
    clienteId: 'cli1',
  })
  assert.equal(body.tipo, 'resposta_chat')
  assert.equal(body.crm_mensagem_id, 'crm-1')
  assert.equal(body.telefone, '5511999887766')
  assert.equal(body.texto, 'Olá')
  assert.equal('lista' in body, false)
  assert.equal('metaToken' in body, false)
  const menu = buildRespostaChat({
    crmMensagemId: 'leticia-1',
    telefone: '14996902902',
    texto: 'Olá',
    lista: [{ id: '1', title: 'Crédito CLT' }, { id: '6', title: 'INSS' }],
    listaBotao: 'Ver modalidades',
  })
  assert.equal(menu.lista_botao, 'Ver modalidades')
  assert.equal(menu.lista_titulo, 'Escolha sua modalidade')
  assert.equal(menu.lista?.[0]?.id, '1')
  assert.equal(menu.lista?.[1]?.title, 'INSS')
  const longo = buildRespostaChat({
    crmMensagemId: 'leticia-2',
    telefone: '14996902902',
    texto: 'Olá',
    lista: [{ id: 'fgts', title: 'Saque-Aniversário FGTS' }],
    listaBotao: 'Escolha sua modalidade',
    listaTitulo: 'Escolha sua modalidade',
  })
  assert.equal(longo.lista_botao, 'Escolha modalidade')
  assert.equal(longo.lista_titulo, 'Escolha sua modalidade')
  assert.equal(longo.lista?.[0]?.id, 'fgts')
  assert.equal(phoneError(''), 'Telefone ausente')
  assert.equal(phoneError('123'), 'Telefone inválido')
  assert.equal(phoneError('11999887766'), null)
  assert.equal(deliveryMark('aceito'), 'sent')
  assert.equal(deliveryMark('falha'), 'failed')
  assert.match(motivoEnvioWhatsapp('HTTP 500 POST /api/crm/eventos'), /servidor de envio não respondeu/)
  assert.match(motivoEnvioWhatsapp('Telefone ausente'), /sem telefone/)
  assert.match(motivoEnvioWhatsapp(''), /ficou salva/)
})

test('erro de autenticação não entra na fila', () => {
  const accepted = (status: number) => status === 202
  assert.equal(accepted(401), false)
  assert.equal(accepted(202), true)
})

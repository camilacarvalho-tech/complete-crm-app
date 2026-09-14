const { onRequest } = require('firebase-functions/v2/https')
const { onDocumentCreated } = require('firebase-functions/v2/firestore')
const { onSchedule } = require('firebase-functions/v2/scheduler')
const admin = require('firebase-admin')
const { logger } = require('firebase-functions')
const { handler: placesSearchHandler } = require('./placesSearch')

admin.initializeApp()

const db = admin.firestore()

/**
 * Webhook para receber leads de fontes externas
 * POST /webhook/leads/{empresaId}
 * 
 * Headers:
 * - Authorization: Bearer {API_KEY}
 * - Content-Type: application/json
 * 
 * Body:
 * {
 *   "source": "external_source_name",
 *   "leads": [
 *     {
 *       "nome": "Nome do Lead",
 *       "telefone": "+55 11 99999-9999",
 *       "email": "email@exemplo.com",
 *       "cidade": "São Paulo",
 *       "estado": "SP",
 *       "segmento": "Alimentação",
 *       "metadados": { ... }
 *     }
 *   ]
 * }
 */
exports.webhookLeads = onRequest({
  cors: true,
  region: 'southamerica-east1',
}, async (req, res) => {
  logger.info('Webhook lead recebido', { method: req.method })

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const empresaId = req.params.empresaId
    const authHeader = req.headers.authorization

    // Validar API key (em produção, usar serviço de secrets)
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('Webhook sem autorização', { empresaId })
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const apiKey = authHeader.replace('Bearer ', '')
    
    // Validar API key (simulado - em produção usar Firestore ou Secret Manager)
    const validKey = await validateApiKey(empresaId, apiKey)
    if (!validKey) {
      logger.warn('API key inválida', { empresaId })
      return res.status(401).json({ error: 'Invalid API key' })
    }

    const { source, leads } = req.body

    if (!leads || !Array.isArray(leads)) {
      return res.status(400).json({ error: 'Invalid leads array' })
    }

    if (leads.length === 0) {
      return res.status(400).json({ error: 'Empty leads array' })
    }

    if (leads.length > 100) {
      return res.status(400).json({ error: 'Too many leads (max 100 per request)' })
    }

    // Processar leads
    const batch = db.batch()
    const oportunidadesRef = db.collection('empresas').doc(empresaId).collection('leadsMonitorOportunidades')
    const inboxRef = db.collection('empresas').doc(empresaId).collection('leadsMonitorInbox')

    let processados = 0
    const duplicados = []

    for (const lead of leads) {
      // Validar campos obrigatórios
      if (!lead.nome || !lead.telefone) {
        logger.warn('Lead sem campos obrigatórios', { lead })
        continue
      }

      // Gerar dedupe key
      const dedupeKey = generateDedupeKey(lead)

      // Verificar duplicidade
      const existing = await oportunidadesRef
        .where('dedupeKey', '==', dedupeKey)
        .limit(1)
        .get()

      if (!existing.empty) {
        duplicados.push(lead.nome)
        continue
      }

      // Criar documento de oportunidade
      const docRef = oportunidadesRef.doc()
      batch.set(docRef, {
        connectorId: 'webhook',
        origemLabel: source || 'Webhook Externo',
        dedupeKey,
        tipo: lead.tipo || 'empresa',
        nome: lead.nome,
        telefone: lead.telefone,
        email: lead.email || null,
        cidade: lead.cidade || '',
        estado: lead.estado || '',
        segmento: lead.segmento || '',
        consentimentoLgpd: lead.consentimentoLgpd || false,
        baseLegal: lead.baseLegal || 'webhook_consent',
        observacoes: lead.observacoes || null,
        metadados: lead.metadados || {},
        externalId: lead.externalId || null,
        status: 'novo',
        score: 50,
        temperatura: 'Morno',
        classificacao: 'qualificar',
        motivosScore: ['recebido via webhook'],
        origemScore: 'nexus_ai_heuristica',
        pesquisaId: null,
        searchRunId: null,
        fonteId: null,
        empresaId,
        encontradoEm: admin.firestore.FieldValue.serverTimestamp(),
        criadoEm: admin.firestore.FieldValue.serverTimestamp(),
        atualizadoEm: admin.firestore.FieldValue.serverTimestamp(),
      })

      // Adicionar ao inbox para processamento
      const inboxDocRef = inboxRef.doc()
      batch.set(inboxDocRef, {
        leadId: docRef.id,
        leadData: lead,
        source: source || 'Webhook Externo',
        status: 'pending',
        criadoEm: admin.firestore.FieldValue.serverTimestamp(),
      })

      processados++
    }

    await batch.commit()

    logger.info('Webhook processado com sucesso', {
      empresaId,
      processados,
      duplicados: duplicados.length,
    })

    return res.status(200).json({
      success: true,
      processados,
      duplicados: duplicados.length,
      duplicadosNomes: duplicados,
    })
  } catch (error) {
    logger.error('Erro no webhook', { error: error.message })
    return res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Valida API key de uma empresa
 */
async function validateApiKey(empresaId, apiKey) {
  try {
    const doc = await db
      .collection('empresas')
      .doc(empresaId)
      .collection('leadsMonitorFontes')
      .where('tipo', '==', 'webhook')
      .where('secretRef', '==', apiKey)
      .limit(1)
      .get()

    return !doc.empty
  } catch (error) {
    logger.error('Erro validando API key', { error: error.message })
    return false
  }
}

/**
 * Gera chave de deduplicação para lead
 */
function generateDedupeKey(lead) {
  const base = [
    lead.nome?.toLowerCase().trim() || '',
    lead.telefone?.replace(/\D/g, '') || '',
    lead.email?.toLowerCase().trim() || '',
  ].join('|')
  
  // Hash simples (em produção usar crypto)
  let hash = 0
  for (let i = 0; i < base.length; i++) {
    const char = base.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(36)
}

/**
 * Cloud Function para processar inbox automaticamente
 * Executa a cada 5 minutos
 */
exports.processInbox = onSchedule('every 5 minutes', async (event) => {
  logger.info('Processando inbox')

  try {
    // Buscar todas as empresas
    const empresas = await db.collection('empresas').get()

    for (const empresaDoc of empresas.docs) {
      const empresaId = empresaDoc.id

      // Buscar itens pendentes no inbox
      const inbox = await db
        .collection('empresas')
        .doc(empresaId)
        .collection('leadsMonitorInbox')
        .where('status', '==', 'pending')
        .limit(50)
        .get()

      if (inbox.empty) continue

      const batch = db.batch()

      for (const doc of inbox.docs) {
        const data = doc.data()

        // Marcar como processado
        batch.update(doc.ref, {
          status: 'processed',
          processadoEm: admin.firestore.FieldValue.serverTimestamp(),
        })

        // Aqui você pode adicionar lógica adicional de processamento
        // como enriquecimento, classificação, etc.
      }

      await batch.commit()

      logger.info('Inbox processado', {
        empresaId,
        processados: inbox.size,
      })
    }

    logger.info('Processamento do inbox concluído')
  } catch (error) {
    logger.error('Erro processando inbox', { error: error.message })
  }
})

/**
 * Cloud Function para limpar oportunidades antigas
 * Executa diariamente à meia-noite
 */
exports.cleanupOldOportunidades = onSchedule('every day 00:00', async (event) => {
  logger.info('Iniciando limpeza de oportunidades antigas')

  try {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - 90) // 90 dias

    const empresas = await db.collection('empresas').get()

    let totalDeletados = 0

    for (const empresaDoc of empresas.docs) {
      const empresaId = empresaDoc.id

      // Buscar oportunidades antigas com status rejeitado
      const antigas = await db
        .collection('empresas')
        .doc(empresaId)
        .collection('leadsMonitorOportunidades')
        .where('status', '==', 'rejeitado')
        .where('atualizadoEm', '<', cutoffDate)
        .limit(100)
        .get()

      if (antigas.empty) continue

      const batch = db.batch()

      for (const doc of antigas.docs) {
        batch.delete(doc.ref)
        totalDeletados++
      }

      await batch.commit()
    }

    logger.info('Limpeza concluída', { totalDeletados })
  } catch (error) {
    logger.error('Erro na limpeza', { error: error.message })
  }
})

/**
 * Trigger quando uma nova oportunidade é criada
 * Executa enriquecimento e classificação automática
 */
exports.onOportunidadeCreated = onDocumentCreated(
  'empresas/{empresaId}/leadsMonitorOportunidades/{opId}',
  async (event) => {
    const snapshot = event.data
    if (!snapshot) return

    const data = snapshot.data()
    const { empresaId, opId } = event.params

    logger.info('Nova oportunidade criada', { empresaId, opId })

    // Se já tiver dados enriquecidos, não fazer nada
    if (data.dadosEnriquecidos) {
      return
    }

    try {
      // Aqui você pode adicionar lógica de enriquecimento automático
      // chamando APIs externas ou o Nexus AI
      
      logger.info('Enriquecimento automático iniciado', { empresaId, opId })

      // Exemplo de enriquecimento básico
      const dadosEnriquecidos = {
        telefoneFormatado: formatarTelefone(data.telefone),
        segmentoInferido: inferirSegmento(data.nome, data.segmento),
        porteEmpresa: classificarPorte(data.nome),
        scoreEnriquecimento: 50,
        fonteEnriquecimento: ['trigger_automatico'],
      }

      await snapshot.ref.update({
        dadosEnriquecidos,
        atualizadoEm: admin.firestore.FieldValue.serverTimestamp(),
      })

      logger.info('Enriquecimento concluído', { empresaId, opId })
    } catch (error) {
      logger.error('Erro no enriquecimento', { error: error.message })
    }
  }
)

/**
 * Formata telefone brasileiro
 */
function formatarTelefone(telefone) {
  if (!telefone) return null
  
  const numeros = telefone.replace(/\D/g, '')
  
  if (numeros.length === 10) {
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 6)}-${numeros.slice(6)}`
  }
  if (numeros.length === 11) {
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`
  }
  
  return null
}

/**
 * Infere segmento
 */
function inferirSegmento(nome, segmentoExistente) {
  if (segmentoExistente) return segmentoExistente
  
  const n = nome.toLowerCase()
  
  const segmentos = [
    { palavras: ['restaurante', 'comida', 'lanchonete'], segmento: 'Alimentação' },
    { palavras: ['varejo', 'loja', 'mercearia'], segmento: 'Varejo' },
    { palavras: ['serviço', 'consultoria'], segmento: 'Serviços' },
    { palavras: ['construção', 'obra'], segmento: 'Construção Civil' },
  ]
  
  for (const seg of segmentos) {
    if (seg.palavras.some(p => n.includes(p))) {
      return seg.segmento
    }
  }
  
  return 'Outros'
}

/**
 * Classifica porte da empresa
 */
function classificarPorte(nome) {
  const n = nome.toLowerCase()
  
  if (n.includes('grande') || n.includes('group') || n.includes('holding')) {
    return 'grande'
  }
  if (n.includes('ltda') || n.includes('limitada')) {
    return 'media'
  }
  
  return 'pequena'
}

/**
 * Busca real Google Places (API oficial).
 * POST { empresaId, filtros, limite }  Authorization: Bearer <Firebase ID token>
 * action=health para checagem sem gastar cota.
 * Chave: GOOGLE_MAPS_API_KEY (env da Function / Secret Manager) — nunca no frontend.
 */
exports.leadsMonitorPlacesSearch = onRequest({
  cors: true,
  region: 'southamerica-east1',
  timeoutSeconds: 120,
  invoker: 'public',
}, placesSearchHandler)

/**
 * Webhook oficial Meta WhatsApp Cloud API.
 * GET: verificação (META_WHATSAPP_VERIFY_TOKEN no env da Function).
 * POST: persiste WAMID/wa_id/texto. Não envia mensagem e não inventa atendimento.
 */
exports.metaWhatsAppWebhook = onRequest({
  cors: true,
  region: 'southamerica-east1',
}, async (req, res) => {
  const verifyToken = process.env.META_WHATSAPP_VERIFY_TOKEN || ''
  if (req.method === 'GET') {
    const mode = String(req.query['hub.mode'] || '')
    const token = String(req.query['hub.verify_token'] || '')
    const challenge = String(req.query['hub.challenge'] || '')
    if (mode === 'subscribe' && verifyToken && token === verifyToken) {
      res.status(200).send(challenge)
      return
    }
    res.status(403).json({ error: 'verify_token_mismatch_or_missing' })
    return
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' })
    return
  }
  const empresaId = String(req.query.empresaId || req.header('x-empresa-id') || '')
  if (!empresaId) {
    res.status(400).json({ error: 'empresaId_required' })
    return
  }
  const body = req.body || {}
  const msg = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]
  const contact = body?.entry?.[0]?.changes?.[0]?.value?.contacts?.[0]
  const wamid = msg?.id || null
  const waId = contact?.wa_id || null
  const text = msg?.text?.body || null
  await db.collection(`empresas/${empresaId}/mensagens`).add({
    empresaId,
    canal: 'whatsapp',
    wamid,
    wa_id: waId,
    texto: text,
    status: 'recebida',
    criadoEm: admin.firestore.FieldValue.serverTimestamp(),
  })
  await db.collection(`empresas/${empresaId}/automacaoEventos`).add({
    empresaId,
    gatilho: 'nova_mensagem',
    entidade: 'mensagens',
    record: { wa_id: waId, wamid, texto: text, canal: 'whatsapp' },
    status: 'pendente',
    criadoEm: admin.firestore.FieldValue.serverTimestamp(),
  })
  res.status(200).json({ ok: true, wamid, wa_id: waId })
})


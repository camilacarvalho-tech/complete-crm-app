/**
 * Campanha do Monitor → coleção CRM `campanhas` + Excel/CSV + tentativa NX ERP.
 * Reutiliza export existente. Não dispara WhatsApp daqui.
 */
import { addDoc, collection, doc, getDocs, query, serverTimestamp, updateDoc, where } from 'firebase/firestore'
import { db } from '../../../firebase'
import { getNxErpCampaignAdapter, type NxErpSyncStatus } from '../../../integrations/nxErpCampaign'
import { produtoPorOperacao, qualificationFromScore } from '../catalog/produtosMonitor'
import type { OportunidadeMonitor, PesquisaSalva } from '../types'
import { downloadDelimited, downloadSpreadsheetMl, type MonitorExportRow } from '../pipeline/exportMonitorRows'
import { digitsOnly } from '../pipeline/normalizeFields'
import { formatMonitorDateTime } from '../utils/datetime'
import type { CompanyPeopleResearch } from '../types/peopleResearch'
import { PERSON_LEAD_EXPORT_COLUMNS } from '../types/personLead'
import { personLeadExportRow, personLeadToNxErpContact, toPersonLead } from '../pipeline/personLead'

export const CAMPANHA_LEAD_COLUMNS = [
  'Nome',
  'Telefone',
  'WhatsApp',
  'CPF',
  'Email',
  'Endereço',
  'Número',
  'Complemento',
  'Bairro',
  'CEP',
  'Cidade',
  'Estado',
  'Empresa',
  'Cargo',
  'Segmento',
  'Produto',
  'Operação',
  'Campanha',
  'Origem',
  'Fonte',
  'Score',
  'Classificação',
  'Status',
  'Contexto INSS',
  'Contexto CLT',
  'Data de captura',
] as const

function text(v: unknown) {
  if (v == null) return ''
  return String(v)
}

export function rowsCampanhaLeads(
  ops: OportunidadeMonitor[],
  pesquisa?: Pick<PesquisaSalva, 'nome' | 'operacao' | 'segmento'>
): MonitorExportRow[] {
  const operacao = pesquisa?.operacao || ''
  return ops.map((o) => {
    const tel = digitsOnly(o.telefone)
    const isPessoa = o.tipo === 'pessoa'
    const whatsField = text(o.metadados?.whatsapp)
    const whats = digitsOnly(whatsField)
    return {
      Nome: isPessoa ? text(o.nome) : text(o.empresaNome || o.nome),
      Telefone: tel,
      WhatsApp: whats,
      CPF: text(o.metadados?.cpf),
      Email: text(o.email),
      Endereço: text(o.endereco),
      Número: text(o.metadados?.numero),
      Complemento: text(o.metadados?.complemento),
      Bairro: text(o.bairro),
      CEP: text(o.cep),
      Cidade: text(o.cidade),
      Estado: text(o.estado),
      Empresa: text(o.empresaNome || (isPessoa ? '' : o.nome)),
      Cargo: text(o.metadados?.cargo),
      Segmento: text(o.segmento || pesquisa?.segmento),
      Produto: produtoPorOperacao(text(o.metadados?.produto) || pesquisa?.operacao)?.name || text(o.metadados?.produto) || text(pesquisa?.operacao),
      Operação: text(o.metadados?.operacao || pesquisa?.operacao || operacao),
      Campanha: text(pesquisa?.nome),
      Origem: 'LEADS MONITOR',
      Fonte: text(o.origemLabel || o.connectorId),
      Score: Math.min(100, Math.max(0, Number(o.score) || 0)),
      Classificação: qualificationFromScore(Math.min(100, Math.max(0, Number(o.score) || 0))),
      Status: text(o.status),
      'Contexto INSS': text(o.metadados?.tipoBeneficiario || o.metadados?.tipoBeneficio),
      'Contexto CLT': text(o.metadados?.cargo),
      'Data de captura': formatMonitorDateTime(o.encontradoEm || o.criadoEm),
    }
  })
}

export function contarBaseCampanha(ops: OportunidadeMonitor[]) {
  const pessoas = ops.filter((o) => o.tipo === 'pessoa')
  const empresas = ops.filter((o) => o.tipo !== 'pessoa')
  const comTel = ops.filter((o) => digitsOnly(o.telefone).length >= 10).length
  const comWhats = ops.filter((o) => digitsOnly(String(o.metadados?.whatsapp || '')).length >= 10).length
  const comEmail = ops.filter((o) => Boolean(o.email)).length
  const hot = ops.filter((o) => qualificationFromScore(Number(o.score) || 0) === 'HOT').length
  const qualified = ops.filter((o) => {
    const q = qualificationFromScore(Number(o.score) || 0)
    return q === 'HOT' || q === 'QUALIFIED'
  }).length
  return {
    encontrados: ops.length,
    empresas: empresas.length,
    pessoas: pessoas.length,
    qualificados: qualified,
    hot,
    comWhatsApp: comWhats,
    comTelefone: comTel,
    comEmail,
    naoEncontrados: 0,
  }
}

export function exportarCampanhaExcel(
  ops: OportunidadeMonitor[],
  pesquisa?: PesquisaSalva,
  people: CompanyPeopleResearch[] = []
) {
  const rows = rowsCampanhaLeads(ops, pesquisa)
  const personRows = people.map((p) => {
    const company = ops.find((o) => o.id === p.opportunityId)
    const lead = toPersonLead(p, company)
    const row = personLeadExportRow(lead)
    row['Data de captura'] = formatMonitorDateTime(lead.collectedAt)
    return row
  })
  downloadSpreadsheetMl(`${(pesquisa?.nome || 'campanha').replace(/\s+/g, '-')}.xls`, [
    { name: 'LEADS', columns: CAMPANHA_LEAD_COLUMNS, rows },
    { name: 'PESSOAS', columns: PERSON_LEAD_EXPORT_COLUMNS, rows: personRows },
  ])
}

export function exportarCampanhaCsv(
  ops: OportunidadeMonitor[],
  pesquisa?: PesquisaSalva,
  people: CompanyPeopleResearch[] = []
) {
  const rows = rowsCampanhaLeads(ops, pesquisa)
  downloadDelimited(`${(pesquisa?.nome || 'campanha').replace(/\s+/g, '-')}.csv`, rows, 'csv', CAMPANHA_LEAD_COLUMNS)
  const personRows = people.map((p) => {
    const company = ops.find((o) => o.id === p.opportunityId)
    const lead = toPersonLead(p, company)
    const row = personLeadExportRow(lead)
    row['Data de captura'] = formatMonitorDateTime(lead.collectedAt)
    return row
  })
  if (personRows.length) {
    downloadDelimited(`${(pesquisa?.nome || 'campanha').replace(/\s+/g, '-')}-pessoas.csv`, personRows, 'csv', PERSON_LEAD_EXPORT_COLUMNS)
  }
}

function leadsDaPesquisa(ops: OportunidadeMonitor[], pesquisa: PesquisaSalva) {
  const tagged = ops.filter((o) => o.pesquisaId && o.pesquisaId === pesquisa.id)
  return tagged.length ? tagged : ops
}

export async function salvarCampanhaNoCrm(opts: {
  empresaId: string
  pesquisa: PesquisaSalva
  oportunidades: OportunidadeMonitor[]
}): Promise<{ campaignId: string; counts: ReturnType<typeof contarBaseCampanha>; erpSyncStatus: NxErpSyncStatus; erpMessage: string }> {
  const ops = leadsDaPesquisa(opts.oportunidades, opts.pesquisa)
  const counts = contarBaseCampanha(ops)
  const produto = produtoPorOperacao(opts.pesquisa.operacao || (opts.pesquisa.produtos || [])[0])
  const produtoId = produto?.id || opts.pesquisa.operacao || ''
  const adapter = getNxErpCampaignAdapter()
  const health = await adapter.healthCheck()
  const erpStatus = health.status === 'not_configured' ? 'NOT_CONFIGURED' : 'ERROR'
  const erpSyncStatus: NxErpSyncStatus = health.status === 'not_configured' ? 'NOT_SYNCED' : 'ERROR'
  const limite = opts.pesquisa.maxResultsPerCycle || opts.pesquisa.limitePorCiclo || 100
  const payload = {
    nome: opts.pesquisa.nome,
    campaignId: opts.pesquisa.id,
    produto: produtoId,
    product: produtoId,
    operacao: opts.pesquisa.operacao || produtoId,
    operation: opts.pesquisa.operacao || produtoId,
    segmento: opts.pesquisa.segmento || '',
    segment: opts.pesquisa.segmento || '',
    fontes: opts.pesquisa.fontesHabilitadas || [],
    sources: opts.pesquisa.fontesHabilitadas || [],
    filtros: {
      estado: opts.pesquisa.estado,
      cidade: opts.pesquisa.cidade,
      bairro: opts.pesquisa.bairro,
      cep: opts.pesquisa.cep,
      palavraChave: opts.pesquisa.palavraChave,
      faixaFuncionarios: opts.pesquisa.faixaFuncionarios,
      scoreMinimo: opts.pesquisa.scoreMinimo,
      fontesHabilitadas: opts.pesquisa.fontesHabilitadas || [],
      produtos: opts.pesquisa.produtos || [],
      contextosSegmento: opts.pesquisa.contextosSegmento || [],
      personFieldsRequested: opts.pesquisa.personFieldsRequested || [],
      contactFieldsRequested: opts.pesquisa.contactFieldsRequested || [],
      tipoBusca: opts.pesquisa.tipoBusca || 'empresa',
      personSourcesHabilitadas: opts.pesquisa.personSourcesHabilitadas || [],
      campaignContext: opts.pesquisa.campaignContext || '',
      subsegment: opts.pesquisa.subsegment || '',
    },
    searchConfig: {
      estado: opts.pesquisa.estado,
      cidade: opts.pesquisa.cidade,
      maxResultsPerCycle: limite,
    },
    limite,
    encontrados: counts.encontrados,
    qualificados: counts.qualificados,
    hot: counts.hot,
    whatsapp: counts.comWhatsApp,
    telefone: counts.comTelefone,
    companyCount: counts.empresas,
    personCount: counts.pessoas,
    qualifiedCount: counts.qualificados,
    hotCount: counts.hot,
    whatsappCount: counts.comWhatsApp,
    phoneCount: counts.comTelefone,
    emailCount: counts.comEmail,
    exportCount: counts.encontrados,
    chatCount: 0,
    status: 'rascunho',
    origem: 'leads_monitor',
    campaignContext: opts.pesquisa.campaignContext || '',
    subsegment: opts.pesquisa.subsegment || '',
    canal: 'whatsapp',
    leadIds: ops.map((o) => o.id).filter(Boolean),
    erpCampaignId: null as string | null,
    templateId: null as string | null,
    erpStatus,
    erpSyncStatus,
    automationStatus: 'idle',
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  const col = collection(db, 'empresas', opts.empresaId, 'campanhas')
  let existingId = ''
  try {
    const snap = await getDocs(query(col, where('campaignId', '==', opts.pesquisa.id)))
    existingId = snap.docs[0]?.id || ''
  } catch {
    existingId = ''
  }

  if (existingId) {
    const { criadoEm: _c, createdAt: _a, ...rest } = payload
    await updateDoc(doc(db, 'empresas', opts.empresaId, 'campanhas', existingId), rest)
    await adapter.createCampaign({
      campaignId: existingId,
      campaignName: opts.pesquisa.nome,
      product: produtoId,
      operation: opts.pesquisa.operacao || produtoId,
      segment: opts.pesquisa.segmento || '',
      subsegment: opts.pesquisa.subsegment,
      origin: 'leads_monitor',
      source: 'leads_monitor',
      leads: [],
      contacts: [],
    })
    return { campaignId: existingId, counts, erpSyncStatus, erpMessage: health.message }
  }
  const ref = await addDoc(col, payload)
  await adapter.createCampaign({
    campaignId: ref.id,
    campaignName: opts.pesquisa.nome,
    product: produtoId,
    operation: opts.pesquisa.operacao || produtoId,
    segment: opts.pesquisa.segmento || '',
    subsegment: opts.pesquisa.subsegment,
    origin: 'leads_monitor',
    source: 'leads_monitor',
    leads: [],
    contacts: [],
  })
  return {
    campaignId: ref.id,
    counts,
    erpSyncStatus,
    erpMessage: health.message,
  }
}

export async function sincronizarCampanhaNxErp(opts: {
  empresaId: string
  campaignDocId: string
  pesquisa: PesquisaSalva
  oportunidades: OportunidadeMonitor[]
  people?: CompanyPeopleResearch[]
}): Promise<{ status: NxErpSyncStatus; message: string }> {
  const adapter = getNxErpCampaignAdapter()
  const health = await adapter.healthCheck()
  if (health.status === 'not_configured') {
    await updateDoc(doc(db, 'empresas', opts.empresaId, 'campanhas', opts.campaignDocId), {
      erpSyncStatus: 'NOT_SYNCED',
      erpStatus: 'NOT_CONFIGURED',
      erpSyncErro: health.message,
      atualizadoEm: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    return { status: 'NOT_SYNCED', message: health.message }
  }
  const people = opts.people || []
  await updateDoc(doc(db, 'empresas', opts.empresaId, 'campanhas', opts.campaignDocId), {
    erpSyncStatus: 'SYNCING',
    erpStatus: 'SYNCING',
    atualizadoEm: serverTimestamp(),
  })
  const result = await adapter.createCampaign({
    campaignId: opts.campaignDocId,
    campaignName: opts.pesquisa.nome,
    product: produtoPorOperacao(opts.pesquisa.operacao)?.id,
    operation: opts.pesquisa.operacao,
    segment: opts.pesquisa.segmento,
    subsegment: opts.pesquisa.subsegment,
    origin: 'leads_monitor',
    source: 'leads_monitor',
    templateId: undefined,
    contacts: people.map((p) =>
      personLeadToNxErpContact(toPersonLead(p, opts.oportunidades.find((o) => o.id === p.opportunityId)))
    ),
    leads: people.length
      ? people.map((p) =>
          personLeadToNxErpContact(toPersonLead(p, opts.oportunidades.find((o) => o.id === p.opportunityId)))
        )
      : rowsCampanhaLeads(opts.oportunidades, opts.pesquisa),
  })
  await updateDoc(doc(db, 'empresas', opts.empresaId, 'campanhas', opts.campaignDocId), {
    erpSyncStatus: result.status,
    erpStatus: result.status,
    erpCampaignId: result.erpCampaignId || null,
    erpSyncErro: result.message,
    atualizadoEm: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return { status: result.status, message: result.message }
}

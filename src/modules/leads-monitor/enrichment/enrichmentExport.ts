import { downloadDelimited, downloadSpreadsheetMl } from '../pipeline/exportMonitorRows'
import { toPersonLead } from '../pipeline/personLead'
import type { CompanyPeopleResearch } from '../types/peopleResearch'
import type { OportunidadeMonitor } from '../types'
import type { PersonLead } from '../types/personLead'

export type EnrichmentExportMode = 'original' | 'enriched' | 'both'

export const PERSON_ENRICHMENT_EXPORT_COLUMNS = [
  'Nome',
  'CPF',
  'Telefone',
  'WhatsApp',
  'Email',
  'Endereço',
  'Número',
  'Complemento',
  'Bairro',
  'CEP',
  'Cidade',
  'Estado',
  'Empresa',
  'CNPJ',
  'Cargo',
  'Vínculo',
  'Produto',
  'Operação',
  'Campanha',
  'Origem',
  'Fonte',
  'Score',
  'Classificação',
  'Enrichment Status',
  'Enrichment Source',
  'Data da captura',
  'Data do enriquecimento',
] as const

function capture(v: unknown): string {
  if (!v) return ''
  if (typeof v === 'string') return v
  if (v instanceof Date) return v.toISOString()
  return ''
}

function rowFromLead(lead: PersonLead, mode: EnrichmentExportMode): Record<string, string | number> {
  const orig = lead.originalData
  const enr = lead.enrichedData
  const pick = (field: string, current: string) => {
    if (mode === 'original') return orig?.[field] ?? ''
    if (mode === 'enriched') return enr?.[field] || current
    return current || enr?.[field] || orig?.[field] || ''
  }
  return {
    Nome: pick('nome', lead.nome),
    CPF: pick('cpf', lead.cpf),
    Telefone: pick('telefone', lead.telefone),
    WhatsApp: pick('whatsapp', lead.whatsapp),
    Email: pick('email', lead.email),
    Endereço: pick('endereco', lead.endereco),
    Número: pick('numero', lead.numero),
    Complemento: pick('complemento', lead.complemento),
    Bairro: pick('bairro', lead.bairro),
    CEP: pick('cep', lead.cep),
    Cidade: pick('cidade', lead.cidade),
    Estado: pick('estado', lead.estado),
    Empresa: pick('empresa', lead.empresa),
    CNPJ: pick('cnpj', lead.cnpj),
    Cargo: pick('cargo', lead.cargo),
    Vínculo: pick('vinculo', lead.vinculo),
    Produto: lead.produto,
    Operação: lead.operacao,
    Campanha: lead.campanha,
    Origem: lead.origem || '',
    Fonte: lead.fonte,
    Score: lead.score || '',
    Classificação: lead.classification,
    'Enrichment Status': lead.enrichmentStatus || '',
    'Enrichment Source': (lead.enrichmentSources || []).join(' | '),
    'Data da captura': capture(lead.collectedAt),
    'Data do enriquecimento': capture(lead.enrichmentUpdatedAt),
  }
}

export function downloadPeopleEnrichmentExport(opts: {
  people: CompanyPeopleResearch[]
  companies: OportunidadeMonitor[]
  mode: EnrichmentExportMode
  format: 'csv' | 'xlsx'
}) {
  const byId = new Map(opts.companies.map((c) => [c.id, c]))
  const rows = opts.people.map((p) => rowFromLead(toPersonLead(p, byId.get(p.opportunityId) || null), opts.mode))
  const name = `pessoas-${opts.mode}`
  if (opts.format === 'csv') {
    downloadDelimited(`${name}.csv`, rows, 'csv', PERSON_ENRICHMENT_EXPORT_COLUMNS)
    return
  }
  downloadSpreadsheetMl(`${name}.xls`, [{ name: 'PESSOAS', columns: PERSON_ENRICHMENT_EXPORT_COLUMNS, rows }])
}

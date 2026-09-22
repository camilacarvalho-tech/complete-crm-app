import { originCode, originLabel } from '../../../catalog/crmCatalog'
import { formatMonitorDateTime } from '../utils/datetime'
import type { OportunidadeMonitor } from '../types'
import type { CompanyPeopleResearch } from '../types/peopleResearch'
import type { NexusCliente } from '../../../types/nexus'

export type MonitorExportRow = Record<string, string | number>

function text(v: unknown): string {
  if (v == null) return ''
  return String(v)
}

export const MONITOR_EXPORT_COLUMNS = [
  'Empresa',
  'CNPJ',
  'Pessoa',
  'Cargo',
  'Relação',
  'Cidade',
  'UF',
  'Telefone comercial',
  'WhatsApp comercial',
  'E-mail profissional/comercial',
  'LinkedIn',
  'Instagram',
  'Facebook',
  'YouTube',
  'TikTok',
  'X/Twitter',
  'Fonte',
  'URL',
  'Score',
  'Origem',
  'Status',
  'Data da pesquisa',
  'Data da aprovação',
  'Data de inclusão no CRM',
] as const

export function exportRowsFromOportunidades(ops: OportunidadeMonitor[]): MonitorExportRow[] {
  return ops.map((op) => ({
    Empresa: text(op.empresaNome || op.nome),
    CNPJ: text(op.cnpj),
    Pessoa: op.tipo === 'pessoa' ? text(op.nome) : '',
    Cargo: '',
    Relação: '',
    Cidade: text(op.cidade),
    UF: text(op.estado),
    'Telefone comercial': text(op.telefone),
    'WhatsApp comercial': text(op.telefone),
    'E-mail profissional/comercial': text(op.email),
    LinkedIn: '',
    Instagram: text(op.metadados?.instagram),
    Facebook: text(op.metadados?.facebook),
    YouTube: '',
    TikTok: '',
    'X/Twitter': '',
    Fonte: text(op.origemLabel || op.connectorId),
    URL: text(op.website),
    Score: Number(op.score) || 0,
    Origem: 'LEADS MONITOR',
    Status: text(op.status),
    'Data da pesquisa': formatMonitorDateTime(op.encontradoEm || op.criadoEm),
    'Data da aprovação': op.status === 'aprovado' || op.status === 'enviado_crm' ? formatMonitorDateTime(op.atualizadoEm) : '',
    'Data de inclusão no CRM': op.status === 'enviado_crm' ? formatMonitorDateTime(op.atualizadoEm) : '',
  }))
}

export function exportRowsFromPeople(
  people: CompanyPeopleResearch[],
  companies: OportunidadeMonitor[]
): MonitorExportRow[] {
  const byId = new Map(companies.map((c) => [c.id, c]))
  return people.map((p) => {
    const company = byId.get(p.opportunityId)
    return {
      Empresa: text(p.companyName || company?.nome),
      CNPJ: text(p.companyCnpj || company?.cnpj),
      Pessoa: text(p.personName),
      Cargo: text(p.jobTitle),
      Relação: text(p.relationToCompany),
      Cidade: text(company?.cidade),
      UF: text(company?.estado),
      'Telefone comercial': text(p.phone),
      'WhatsApp comercial': text(p.whatsapp),
      'E-mail profissional/comercial': '',
      LinkedIn: text(p.linkedinUrl),
      Instagram: text(p.instagramUrl),
      Facebook: text(p.facebookUrl),
      YouTube: '',
      TikTok: '',
      'X/Twitter': '',
      Fonte: text(p.sourceName || p.source),
      URL: text(p.sourceUrl),
      Score: Number(company?.score) || 0,
      Origem: 'LEADS MONITOR',
      Status: text(p.status),
      'Data da pesquisa': formatMonitorDateTime(p.foundAt || p.createdAt),
      'Data da aprovação': p.status === 'aprovado' || p.status === 'enviado_crm' ? formatMonitorDateTime(p.updatedAt) : '',
      'Data de inclusão no CRM': p.status === 'enviado_crm' ? formatMonitorDateTime(p.updatedAt) : '',
    }
  })
}

export function exportRowsFromClientes(clientes: NexusCliente[]): MonitorExportRow[] {
  return clientes.map((c) => ({
    Empresa: text(c.empresaNome),
    CNPJ: text(c.empresaCnpj),
    Pessoa: text(c.nome),
    Cargo: text(c.cargo || c.profissao),
    Relação: text(c.relacaoEmpresa),
    Cidade: text(c.cidade),
    UF: text(c.estado),
    'Telefone comercial': text(c.telefone),
    'WhatsApp comercial': text(c.whatsapp),
    'E-mail profissional/comercial': text(c.email),
    LinkedIn: text(c.linkedinUrl),
    Instagram: text(c.instagramUrl),
    Facebook: text(c.facebookUrl),
    YouTube: text(c.youtubeUrl),
    TikTok: text(c.tiktokUrl),
    'X/Twitter': text(c.twitterUrl),
    Fonte: text(c.fontePesquisa || c.utm_medium),
    URL: text(c.fonteUrl),
    Score: Number(c.score) || 0,
    Origem: originLabel(originCode(String(c.source || c.origem))),
    Status: text(c.status || c.pipeline),
    'Data da pesquisa': '',
    'Data da aprovação': '',
    'Data de inclusão no CRM': formatMonitorDateTime(c.criadoEm),
  }))
}

function xmlEscape(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/** SpreadsheetML 2003 (Excel XML real). Extensão .xls — não é OOXML .xlsx nem TSV. */
export function downloadSpreadsheetMl(
  filename: string,
  sheets: Array<{ name: string; columns: readonly string[]; rows: MonitorExportRow[] }>
) {
  const inner = sheets
    .map((sheet) => {
      const header = `<Row>${sheet.columns.map((c) => `<Cell><Data ss:Type="String">${xmlEscape(c)}</Data></Cell>`).join('')}</Row>`
      const body = sheet.rows
        .map((r) => {
          const cells = sheet.columns
            .map((c) => {
              const v = r[c]
              const isNum = typeof v === 'number'
              return `<Cell><Data ss:Type="${isNum ? 'Number' : 'String'}">${xmlEscape(String(v ?? ''))}</Data></Cell>`
            })
            .join('')
          return `<Row>${cells}</Row>`
        })
        .join('')
      return `<Worksheet ss:Name="${xmlEscape(sheet.name)}"><Table>${header}${body}</Table></Worksheet>`
    })
    .join('')
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
${inner}
</Workbook>`
  const blob = new Blob([xml], { type: 'application/vnd.ms-excel' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename.replace(/\.xlsx$/i, '.xls')
  a.click()
  URL.revokeObjectURL(a.href)
}

export function downloadDelimited(
  filename: string,
  rows: MonitorExportRow[],
  kind: 'csv' | 'xlsx',
  columns?: readonly string[]
) {
  const keys = [...(columns || MONITOR_EXPORT_COLUMNS)]
  if (kind === 'xlsx') {
    downloadSpreadsheetMl(filename.replace(/\.csv$/i, '.xls'), [{ name: 'DADOS', columns: keys, rows }])
    return
  }
  const body = [
    keys.join(';'),
    ...rows.map((r) => keys.map((k) => String(r[k] ?? '').replace(/[\t\n;]/g, ' ')).join(';')),
  ].join('\n')
  const blob = new Blob(['\uFEFF' + body], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

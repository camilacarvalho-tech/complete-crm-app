import type { OportunidadeMonitor } from '../types'
import type { CompanyPeopleResearch } from '../types/peopleResearch'
import type { ProcessRun } from '../types/processRun'
import { formatMonitorDateTime } from '../utils/datetime'
import {
  downloadDelimited,
  downloadSpreadsheetMl,
  type MonitorExportRow,
} from './exportMonitorRows'

function text(v: unknown) {
  if (v == null) return ''
  return String(v)
}

export const EMPRESA_EXPORT_COLUMNS = [
  'Empresa',
  'Razão Social',
  'Nome Fantasia',
  'CNPJ',
  'CNAE',
  'Segmento',
  'Endereço',
  'Cidade',
  'UF',
  'Porte',
  'Funcionários',
  'Site',
  'Telefone comercial',
  'Email comercial',
  'Redes sociais',
  'Score',
  'Critérios',
  'Status',
  'Origem',
  'Fonte',
  'Origem do dado',
  'Finalidade',
  'Base legal',
  'Data',
] as const

export const PESSOA_EXPORT_COLUMNS = [
  'Nome',
  'Empresa',
  'CNPJ',
  'Cargo',
  'Relação',
  'Telefone comercial',
  'WhatsApp comercial/autorizado',
  'Email profissional',
  'LinkedIn',
  'Instagram',
  'Facebook',
  'Cidade',
  'UF',
  'Segmento',
  'Score',
  'Status',
  'Fonte',
  'Evidência',
  'Data',
  'Origem do dado',
  'Finalidade',
  'Base legal',
] as const

export function exportEmpresasRows(ops: OportunidadeMonitor[]): MonitorExportRow[] {
  return ops
    .filter((o) => o.tipo !== 'pessoa')
    .map((op) => ({
      Empresa: text(op.empresaNome || op.nome),
      'Razão Social': text(op.dadosEnriquecidos?.razaoSocial),
      'Nome Fantasia': text(op.dadosEnriquecidos?.nomeFantasia || op.nome),
      CNPJ: text(op.cnpj),
      CNAE: text(op.dadosEnriquecidos?.cnaePrincipal),
      Segmento: text(op.segmento),
      Endereço: text(op.endereco),
      Cidade: text(op.cidade),
      UF: text(op.estado),
      Porte: text(op.dadosEnriquecidos?.porteEmpresa),
      Funcionários: text(op.employeeCountRange || (op.employeeCountStatus === 'nao_informada' ? 'Não informado' : '')),
      Site: text(op.website),
      'Telefone comercial': text(op.telefone),
      'Email comercial': text(op.email),
      'Redes sociais': [op.metadados?.instagram, op.metadados?.facebook].filter(Boolean).join(' | '),
      Score: Number(op.score) || 0,
      Critérios: (op.motivosScore || []).join('; '),
      Status: text(op.status),
      Origem: 'LEADS MONITOR',
      Fonte: text(op.origemLabel || op.connectorId),
      'Origem do dado': text(op.origemDado || op.metadados?.origemDado || op.origemLabel),
      Finalidade: text(op.finalidadeTratamento || op.metadados?.finalidadeTratamento),
      'Base legal': text(op.baseLegal),
      Data: formatMonitorDateTime(op.atualizadoEm || op.criadoEm),
    }))
}

export function exportPessoasSheetRows(
  people: CompanyPeopleResearch[],
  companies: OportunidadeMonitor[]
): MonitorExportRow[] {
  const byId = new Map(companies.map((c) => [c.id, c]))
  return people.map((p) => {
    const company = byId.get(p.opportunityId)
    return {
      Nome: text(p.personName),
      Empresa: text(p.companyName || company?.nome),
      CNPJ: text(p.companyCnpj || company?.cnpj),
      Cargo: text(p.jobTitle),
      Relação: text(p.relationToCompany),
      'Telefone comercial': text(p.phone),
      'WhatsApp comercial/autorizado': text(p.whatsapp),
      'Email profissional': '',
      LinkedIn: text(p.linkedinUrl),
      Instagram: text(p.instagramUrl),
      Facebook: text(p.facebookUrl),
      Cidade: text(company?.cidade),
      UF: text(company?.estado),
      Segmento: text(company?.segmento),
      Score: Number(company?.score) || 0,
      Status: text(p.status),
      Fonte: text(p.sourceName || p.source),
      Evidência: text(p.sourceUrl),
      Data: formatMonitorDateTime(p.foundAt || p.createdAt),
      'Origem do dado': text(p.sourceName || p.source),
      Finalidade: 'Não informado',
      'Base legal': 'Não informado',
    }
  })
}

export function downloadCsvNamed(filename: string, columns: readonly string[], rows: MonitorExportRow[]) {
  downloadDelimited(filename, rows, 'csv', columns)
}

export function downloadBaseCompleta(opts: {
  empresas: OportunidadeMonitor[]
  pessoas: CompanyPeopleResearch[]
  processRuns: ProcessRun[]
}) {
  const emp = exportEmpresasRows(opts.empresas)
  const pes = exportPessoasSheetRows(opts.pessoas, opts.empresas)
  const qual = emp.map((r) => ({
    Empresa: r.Empresa,
    Score: r.Score,
    Critérios: r.Critérios,
    Status: r.Status,
    Segmento: r.Segmento,
  }))
  const hist = opts.processRuns.map((p) => ({
    Nome: p.nome,
    Origem: p.origem,
    Status: p.status,
    Total: p.total,
    Processados: p.processados,
    Erros: p.erros,
    Data: formatMonitorDateTime(p.criadoEm || p.startedAt),
  }))
  const erros = opts.empresas
    .filter((o) => o.status === 'rejeitado')
    .map((o) => ({
      Empresa: o.nome,
      Status: o.status,
      Observações: text(o.observacoes),
    }))
  const opps = opts.empresas.flatMap((o) => {
    const lista = Array.isArray(o.metadados?.oportunidades) ? (o.metadados?.oportunidades as Array<Record<string, unknown>>) : []
    if (!lista.length) {
      return [{
        Nome: o.nome,
        Empresa: o.empresaNome || o.nome,
        Produto: text(o.metadados?.produto),
        Operação: text(o.metadados?.operacao || o.segmento),
        Score: Number(o.score) || 0,
        Status: o.status,
        Cidade: o.cidade,
        UF: o.estado,
        Motivos: (o.motivosScore || []).join('; '),
      }]
    }
    return lista.map((op) => ({
      Nome: o.nome,
      Empresa: o.empresaNome || o.nome,
      Produto: text(op.produto),
      Operação: text(o.metadados?.operacao),
      Score: Number(op.score || o.score) || 0,
      Status: text(op.status || o.status),
      Cidade: o.cidade,
      UF: o.estado,
      Motivos: text((op.criteriosAtendidos as string[] | undefined)?.join('; ')),
    }))
  })
  downloadSpreadsheetMl('nexus-monitor-base-completa.xls', [
    { name: 'EMPRESAS', columns: EMPRESA_EXPORT_COLUMNS, rows: emp },
    { name: 'PESSOAS', columns: PESSOA_EXPORT_COLUMNS, rows: pes },
    { name: 'OPORTUNIDADES', columns: ['Nome', 'Empresa', 'Produto', 'Operação', 'Score', 'Status', 'Cidade', 'UF', 'Motivos'], rows: opps },
    { name: 'QUALIFICACAO', columns: ['Empresa', 'Score', 'Critérios', 'Status', 'Segmento'], rows: qual },
    { name: 'HISTORICO', columns: ['Nome', 'Origem', 'Status', 'Total', 'Processados', 'Erros', 'Data'], rows: hist },
    { name: 'ERROS_PENDENCIAS', columns: ['Empresa', 'Status', 'Observações'], rows: erros },
  ])
}

export { exportRowsFromOportunidades, exportRowsFromPeople }

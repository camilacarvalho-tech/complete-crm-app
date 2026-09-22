import { CSV_TARGET_FIELDS, type CsvTargetField } from '../types/processRun'
import { digitsOnly } from './normalizeFields'
import { isValidCpf } from '../enrichment/cpf'

const ALIASES: Record<CsvTargetField, string[]> = {
  nome: ['nome completo', 'nome_completo', 'nome beneficiario', 'nome cliente', 'cliente', 'nome', 'name', 'pessoa', 'contato', 'titular'],
  cpf: ['cpf'],
  cnpj: ['cnpj'],
  telefone: ['telefone 1', 'telefone1', 'celular 1', 'telefone', 'fone', 'phone', 'celular', 'tel'],
  whatsapp: ['whatsapp', 'whats', 'wa', 'zap'],
  email: ['email', 'e-mail', 'mail'],
  empresa: ['empresa', 'company'],
  razaoSocial: ['razao social', 'razão social', 'razao'],
  nomeFantasia: ['nome fantasia', 'fantasia'],
  cargo: ['cargo', 'funcao', 'função', 'titulo', 'job'],
  cidade: ['cidade', 'city', 'municipio', 'município'],
  uf: ['uf', 'estado', 'state'],
  endereco: ['endereco', 'endereço', 'address', 'logradouro'],
  numero: ['numero', 'número', 'num', 'nro'],
  complemento: ['complemento', 'compl'],
  bairro: ['bairro', 'district'],
  cep: ['cep', 'zip'],
  segmento: ['segmento', 'setor', 'categoria'],
  site: ['site', 'website', 'url', 'web'],
  observacoes: ['observacoes', 'observações', 'obs', 'notas'],
  dataNascimento: ['data nascimento', 'nascimento', 'dt nasc', 'data_nascimento'],
  idade: ['idade'],
  tipoBeneficiario: ['tipo beneficiario', 'tipo de beneficiario', 'beneficiario', 'aposentado', 'pensionista'],
  tipoBeneficio: ['tipo beneficio', 'tipo de beneficio'],
  especieBeneficio: ['especie', 'especie beneficio', 'espécie'],
  situacaoBeneficio: ['situacao', 'situação', 'situacao beneficio'],
  dataInicioBeneficio: ['data inicio', 'inicio beneficio', 'dib'],
  banco: ['banco', 'banco pagador', 'banco origem'],
  produto: ['produto', 'campanha'],
  operacao: ['operacao', 'operação', 'operation'],
  vinculo: ['vinculo', 'vínculo', 'relacao', 'relação'],
  beneficiosConsignaveis: ['beneficios consignaveis', 'qtd beneficios', 'quantidade beneficios'],
}

function normHeader(h: string) {
  return h
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_-]+/g, ' ')
    .trim()
}

export const CSV_FIELD_TO_PERSON_LEAD: Record<CsvTargetField, string> = {
  nome: 'personName',
  cpf: 'cpf',
  cnpj: 'companyCnpj',
  telefone: 'phone',
  whatsapp: 'whatsapp',
  email: 'email',
  empresa: 'companyName',
  razaoSocial: 'companyName',
  nomeFantasia: 'companyName',
  cargo: 'jobTitle',
  cidade: 'city',
  uf: 'state',
  endereco: 'address',
  numero: 'address',
  complemento: 'address',
  bairro: 'address',
  cep: 'cep',
  segmento: 'segment',
  site: 'sourceUrl',
  observacoes: 'originalData',
  dataNascimento: 'originalData',
  idade: 'originalData',
  tipoBeneficiario: 'originalData',
  tipoBeneficio: 'originalData',
  especieBeneficio: 'originalData',
  situacaoBeneficio: 'originalData',
  dataInicioBeneficio: 'originalData',
  banco: 'originalData',
  produto: 'product',
  operacao: 'operation',
  vinculo: 'relationToCompany',
  beneficiosConsignaveis: 'originalData',
}

export function isUnixLikeIdentifier(value: string): boolean {
  const d = digitsOnly(value)
  if (d.length !== 10) return false
  const n = Number(d)
  return n >= 1_500_000_000 && n <= 2_100_000_000
}

export function isLikelyPersonName(value: string): boolean {
  const t = String(value || '').trim()
  if (!t) return false
  const compact = t.replace(/[.\-\/\s]/g, '')
  if (/^\d+$/.test(compact)) return false
  if (isUnixLikeIdentifier(t)) return false
  const letters = (t.match(/[A-Za-zÀ-ÿ]/g) || []).length
  return letters >= 3
}

export function isLikelyBrPhone(value: string): boolean {
  let d = digitsOnly(value)
  if (!d) return false
  if (isUnixLikeIdentifier(d)) return false
  if (d.length >= 12 && d.startsWith('55')) d = d.slice(2)
  if (d.length === 11) {
    const ddd = Number(d.slice(0, 2))
    return ddd >= 11 && ddd <= 99 && d[2] === '9'
  }
  if (d.length === 10) {
    const ddd = Number(d.slice(0, 2))
    const local = d[2]
    return ddd >= 11 && ddd <= 99 && local >= '2' && local <= '5'
  }
  return false
}

function isValidCnpj(value: string): boolean {
  const cnpj = digitsOnly(value)
  if (cnpj.length !== 14) return false
  if (/^(\d)\1{13}$/.test(cnpj)) return false
  const calc = (base: number) => {
    let sum = 0
    let pos = base - 7
    for (let i = 0; i < base; i += 1) {
      sum += Number(cnpj[i]) * pos
      pos -= 1
      if (pos < 2) pos = 9
    }
    const mod = sum % 11
    return mod < 2 ? 0 : 11 - mod
  }
  return calc(12) === Number(cnpj[12]) && calc(13) === Number(cnpj[13])
}

export function detectCsvSeparator(headerLine: string): ',' | ';' | '\t' {
  const counts: Array<[',' | ';' | '\t', number]> = [
    [',', (headerLine.match(/,/g) || []).length],
    [';', (headerLine.match(/;/g) || []).length],
    ['\t', (headerLine.match(/\t/g) || []).length],
  ]
  counts.sort((a, b) => b[1] - a[1])
  return counts[0][0]
}

export function splitCsvLine(line: string, sep: string): string[] {
  const out: string[] = []
  let cur = ''
  let quoted = false
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        cur += '"'
        i += 1
      } else quoted = !quoted
      continue
    }
    if (!quoted && ch === sep) {
      out.push(cur.trim())
      cur = ''
      continue
    }
    cur += ch
  }
  out.push(cur.trim())
  return out
}

export function parseCsvTable(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim())
  if (!lines.length) return { headers: [], rows: [] }
  const sep = detectCsvSeparator(lines[0])
  const headers = splitCsvLine(lines[0], sep).map((h) => h || 'coluna')
  const rows: Record<string, string>[] = []
  for (let i = 1; i < lines.length; i += 1) {
    const values = splitCsvLine(lines[i], sep)
    const obj: Record<string, string> = {}
    headers.forEach((h, idx) => {
      obj[h] = values[idx] || ''
    })
    rows.push(obj)
  }
  return { headers, rows }
}

function headerAliasHit(header: string, field: CsvTargetField, mode: 'exact' | 'includes'): boolean {
  const n = normHeader(header)
  if (!n || /^\d+$/.test(n) || /^coluna\d+$/i.test(n)) return false
  return ALIASES[field].some((a) => {
    if (mode === 'exact') return n === a
    return a.length >= 4 && n.includes(a)
  })
}

export function suggestMapping(headers: string[]): Record<string, CsvTargetField | ''> {
  const used = new Set<string>()
  const mapping: Record<string, CsvTargetField | ''> = {}
  for (const header of headers) mapping[header] = ''
  for (const mode of ['exact', 'includes'] as const) {
    for (const header of headers) {
      if (mapping[header]) continue
      for (const field of CSV_TARGET_FIELDS) {
        if (used.has(field)) continue
        if (!headerAliasHit(header, field, mode)) continue
        mapping[header] = field
        used.add(field)
        break
      }
    }
  }
  return mapping
}

function columnValues(rows: Record<string, string>[], header: string): string[] {
  return rows.map((r) => String(r[header] || '').trim()).filter(Boolean)
}

function profileColumn(values: string[]) {
  const n = Math.max(values.length, 1)
  let name = 0
  let phone = 0
  let cpf = 0
  let cnpj = 0
  let email = 0
  let unix = 0
  let numeric = 0
  for (const v of values) {
    if (isUnixLikeIdentifier(v)) unix += 1
    if (/^\d+$/.test(v.replace(/[.\-\/\s]/g, ''))) numeric += 1
    if (isLikelyPersonName(v)) name += 1
    if (isLikelyBrPhone(v)) phone += 1
    if (isValidCpf(v)) cpf += 1
    if (isValidCnpj(v)) cnpj += 1
    if (v.includes('@') && v.includes('.')) email += 1
  }
  return {
    name: name / n,
    phone: phone / n,
    cpf: cpf / n,
    cnpj: cnpj / n,
    email: email / n,
    unix: unix / n,
    numeric: numeric / n,
  }
}

/** Cabeçalho + valores. Coluna ambígua ou identificador numérico fica sem campo. */
export function inferMappingFromTable(
  headers: string[],
  rows: Record<string, string>[]
): Record<string, CsvTargetField | ''> {
  const mapping = suggestMapping(headers)
  const used = new Set(Object.values(mapping).filter(Boolean) as CsvTargetField[])
  const sample = rows.slice(0, 80)

  for (const header of headers) {
    if (mapping[header]) {
      if (mapping[header] === 'nome') {
        const p = profileColumn(columnValues(sample, header))
        if (p.numeric > 0.5 || p.unix > 0.4 || p.name < 0.4) {
          mapping[header] = ''
          used.delete('nome')
        }
      }
      if (mapping[header] === 'telefone' || mapping[header] === 'whatsapp') {
        const p = profileColumn(columnValues(sample, header))
        if (p.unix > 0.5 && p.phone < 0.4) {
          used.delete(mapping[header] as CsvTargetField)
          mapping[header] = ''
        }
      }
      continue
    }
    const vals = columnValues(sample, header)
    if (!vals.length) continue
    const p = profileColumn(vals)
    const n = normHeader(header)
    const headerSaysWhatsapp = /whatsapp|whats|zap/.test(n)
    let hit: CsvTargetField | '' = ''
    if (p.email > 0.5 && !used.has('email')) hit = 'email'
    else if (p.cpf > 0.5 && !used.has('cpf')) hit = 'cpf'
    else if (p.cnpj > 0.5 && !used.has('cnpj')) hit = 'cnpj'
    else if (headerSaysWhatsapp && p.phone > 0.5 && !used.has('whatsapp')) hit = 'whatsapp'
    else if (p.phone > 0.6 && p.unix < 0.3 && !used.has('telefone')) hit = 'telefone'
    else if (p.name > 0.7 && p.numeric < 0.2 && p.unix < 0.2 && !used.has('nome')) hit = 'nome'
    if (hit) {
      mapping[header] = hit
      used.add(hit)
    }
  }
  return mapping
}

export function applyMapping(
  row: Record<string, string>,
  mapping: Record<string, CsvTargetField | ''>
): Record<string, string> {
  const out: Record<string, string> = {}
  for (const field of CSV_TARGET_FIELDS) out[field] = ''
  for (const [header, field] of Object.entries(mapping)) {
    if (!field) continue
    out[field] = row[header] || out[field]
  }
  return out
}

export function previewStats(
  rows: Record<string, string>[],
  mapping: Record<string, CsvTargetField | ''>
) {
  const recognized = Object.values(mapping).filter(Boolean).length
  const unknown = Object.values(mapping).filter((v) => !v).length
  let incompletos = 0
  const seen = new Set<string>()
  let duplicados = 0
  for (const row of rows) {
    const m = applyMapping(row, mapping)
    const nome = (m.nome || m.empresa || m.razaoSocial).trim()
    if (!nome) incompletos += 1
    const onlyDigits = (v: string) => v.replace(/\D/g, '')
    const keys = [
      onlyDigits(m.cpf).length === 11 ? `cpf:${onlyDigits(m.cpf)}` : '',
      onlyDigits(m.cnpj).length === 14 ? `cnpj:${onlyDigits(m.cnpj)}` : '',
      m.email.includes('@') ? `email:${m.email.toLowerCase()}` : '',
      onlyDigits(m.telefone).length >= 10 ? `tel:${onlyDigits(m.telefone)}` : '',
      `${nome}|${(m.empresa || '').toLowerCase()}`,
    ].filter(Boolean)
    if (keys.some((k) => seen.has(k))) duplicados += 1
    else keys.forEach((k) => seen.add(k))
  }
  return {
    total: rows.length,
    colunas: Object.keys(mapping).length,
    reconhecidas: recognized,
    naoReconhecidas: unknown,
    duplicados,
    incompletos,
  }
}

import { CSV_TARGET_FIELDS, type CsvTargetField } from '../types/processRun'

const ALIASES: Record<CsvTargetField, string[]> = {
  nome: ['nome', 'nome completo', 'nome beneficiario', 'name', 'pessoa', 'contato'],
  cpf: ['cpf'],
  cnpj: ['cnpj'],
  telefone: ['telefone', 'fone', 'phone', 'celular', 'tel'],
  whatsapp: ['whatsapp', 'whats', 'wa', 'zap'],
  email: ['email', 'e-mail', 'mail'],
  empresa: ['empresa', 'company'],
  razaoSocial: ['razao social', 'razão social', 'razao'],
  nomeFantasia: ['nome fantasia', 'fantasia'],
  cargo: ['cargo', 'funcao', 'função', 'titulo', 'job'],
  cidade: ['cidade', 'city', 'municipio', 'município'],
  uf: ['uf', 'estado', 'state'],
  endereco: ['endereco', 'endereço', 'address', 'logradouro'],
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

export function suggestMapping(headers: string[]): Record<string, CsvTargetField | ''> {
  const used = new Set<string>()
  const mapping: Record<string, CsvTargetField | ''> = {}
  for (const header of headers) {
    const n = normHeader(header)
    let hit: CsvTargetField | '' = ''
    for (const field of CSV_TARGET_FIELDS) {
      if (used.has(field)) continue
      if (ALIASES[field].some((a) => n === a || n.includes(a))) {
        hit = field
        used.add(field)
        break
      }
    }
    mapping[header] = hit
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

/**
 * Parser CSV simples (RFC-ish) — sem dependências.
 * Suporta aspas e vírgula/ponto-e-vírgula.
 */
export function parseCsv(text: string): Record<string, string>[] {
  const raw = String(text || '').replace(/^\uFEFF/, '').trim()
  if (!raw) return []

  const lines = splitCsvLines(raw)
  if (lines.length < 2) return []

  const delim = detectDelim(lines[0])
  const headers = splitCsvRow(lines[0], delim).map((h) => h.trim().toLowerCase())
  const rows: Record<string, string>[] = []

  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvRow(lines[i], delim)
    if (cols.every((c) => !c.trim())) continue
    const obj: Record<string, string> = {}
    headers.forEach((h, idx) => {
      obj[h] = (cols[idx] || '').trim()
    })
    rows.push(obj)
  }
  return rows
}

function detectDelim(headerLine: string): ',' | ';' {
  const commas = (headerLine.match(/,/g) || []).length
  const semis = (headerLine.match(/;/g) || []).length
  return semis > commas ? ';' : ','
}

function splitCsvLines(text: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (ch === '"') {
      inQuotes = !inQuotes
      cur += ch
      continue
    }
    if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && text[i + 1] === '\n') i += 1
      if (cur.trim()) out.push(cur)
      cur = ''
      continue
    }
    cur += ch
  }
  if (cur.trim()) out.push(cur)
  return out
}

function splitCsvRow(line: string, delim: ',' | ';'): string[] {
  const out: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }
    if (ch === delim && !inQuotes) {
      out.push(cur)
      cur = ''
      continue
    }
    cur += ch
  }
  out.push(cur)
  return out
}

/** Mapeia colunas comuns PT/EN → campos canônicos. */
export function mapCsvRow(row: Record<string, string>): Record<string, unknown> {
  const g = (...keys: string[]) => {
    for (const k of keys) {
      const v = row[k]
      if (v) return v
    }
    return ''
  }
  return {
    nome: g('nome', 'name', 'razao', 'razão', 'razao_social', 'empresa', 'company'),
    telefone: g('telefone', 'phone', 'whatsapp', 'celular', 'tel'),
    email: g('email', 'e-mail', 'mail'),
    cidade: g('cidade', 'city'),
    estado: g('estado', 'uf', 'state'),
    bairro: g('bairro', 'neighborhood', 'district'),
    cep: g('cep', 'zip', 'postal_code'),
    cnae: g('cnae'),
    segmento: g('segmento', 'segment', 'modalidade'),
    site: g('site', 'website', 'url'),
    instagram: g('instagram', 'ig'),
    facebook: g('facebook', 'fb'),
    cnpj: g('cnpj'),
    consentimentoLgpd: g('lgpd', 'consentimento', 'consent') || 'true',
  }
}

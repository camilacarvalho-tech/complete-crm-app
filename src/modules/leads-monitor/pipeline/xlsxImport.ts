/**
 * Lê CSV, SpreadsheetML (.xls), XLSX (OOXML) e ODS (OpenDocument zip) sem inventar células.
 */
import { parseCsvTable, suggestMapping } from './csvImportMap'

export type ImportedTable = { headers: string[]; rows: Record<string, string>[] }

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const ds = new DecompressionStream('deflate-raw')
  const stream = new Blob([data]).stream().pipeThrough(ds)
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

async function inflateZip(data: Uint8Array, method: number): Promise<Uint8Array> {
  if (method === 0) return data
  try {
    return await inflateRaw(data)
  } catch {
    const ds = new DecompressionStream('deflate')
    const stream = new Blob([data]).stream().pipeThrough(ds)
    return new Uint8Array(await new Response(stream).arrayBuffer())
  }
}

function zipWantedKey(name: string, wanted: Set<string>): string | null {
  const n = name.replace(/\\/g, '/')
  if (wanted.has(n)) return n
  for (const w of wanted) {
    if (n.endsWith(`/${w}`) || n.split('/').pop() === w) return w
  }
  return null
}

function u16(view: DataView, o: number) {
  return view.getUint16(o, true)
}
function u32(view: DataView, o: number) {
  return view.getUint32(o, true)
}

async function readZipEntry(bytes: Uint8Array, view: DataView, localOff: number, method: number, compSize: number): Promise<Uint8Array> {
  const locNameLen = u16(view, localOff + 26)
  const locExtra = u16(view, localOff + 28)
  const dataStart = localOff + 30 + locNameLen + locExtra
  const data = bytes.slice(dataStart, dataStart + compSize)
  if (method === 8) return inflateZip(data, method)
  return data
}

async function unzipNamed(buf: ArrayBuffer, names: string[]): Promise<Record<string, string>> {
  const bytes = new Uint8Array(buf)
  const view = new DataView(buf)
  const wanted = new Set(names)
  const out: Record<string, string> = {}
  let eocd = -1
  const min = Math.max(0, bytes.length - 22 - 65535)
  for (let i = bytes.length - 22; i >= min; i -= 1) {
    if (u32(view, i) === 0x06054b50) {
      eocd = i
      break
    }
  }
  if (eocd >= 0) {
    let cdOffset = u32(view, eocd + 16)
    const entries = u16(view, eocd + 10)
    for (let n = 0; n < entries && Object.keys(out).length < wanted.size; n += 1) {
      if (u32(view, cdOffset) !== 0x02014b50) break
      const method = u16(view, cdOffset + 10)
      const compSize = u32(view, cdOffset + 20)
      const nameLen = u16(view, cdOffset + 28)
      const extraLen = u16(view, cdOffset + 30)
      const commentLen = u16(view, cdOffset + 32)
      const localOff = u32(view, cdOffset + 42)
      const name = new TextDecoder().decode(bytes.slice(cdOffset + 46, cdOffset + 46 + nameLen))
      const key = zipWantedKey(name, wanted)
      if (key) {
        const raw = await readZipEntry(bytes, view, localOff, method, compSize)
        out[key] = new TextDecoder('utf-8').decode(raw)
      }
      cdOffset += 46 + nameLen + extraLen + commentLen
    }
    if (Object.keys(out).length) return out
  }
  let offset = 0
  while (offset + 30 < bytes.length && Object.keys(out).length < wanted.size) {
    if (u32(view, offset) !== 0x04034b50) break
    const method = u16(view, offset + 8)
    const compSize = u32(view, offset + 18)
    const nameLen = u16(view, offset + 26)
    const extraLen = u16(view, offset + 28)
    const name = new TextDecoder().decode(bytes.slice(offset + 30, offset + 30 + nameLen))
    const dataStart = offset + 30 + nameLen + extraLen
    const key = zipWantedKey(name, wanted)
    if (key) {
      const data = bytes.slice(dataStart, dataStart + compSize)
      const raw = method === 8 ? await inflateZip(data, method) : data
      out[key] = new TextDecoder('utf-8').decode(raw)
    }
    offset = dataStart + compSize
  }
  return out
}

function xmlDecode(s: string) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

function parseSharedStrings(xml: string): string[] {
  const out: string[] = []
  const re = /<si[\s>][\s\S]*?<\/si>/gi
  const parts = xml.match(re) || []
  for (const block of parts) {
    const texts = [...block.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/gi)].map((m) => xmlDecode(m[1]))
    out.push(texts.join(''))
  }
  return out
}

function colRow(ref: string): { c: number; r: number } {
  const m = ref.match(/^([A-Z]+)(\d+)$/i)
  if (!m) return { c: 0, r: 0 }
  const letters = m[1].toUpperCase()
  let c = 0
  for (let i = 0; i < letters.length; i += 1) c = c * 26 + (letters.charCodeAt(i) - 64)
  return { c: c - 1, r: Number(m[2]) - 1 }
}

function parseSheetXml(xml: string, shared: string[]): string[][] {
  const rows: string[][] = []
  const rowBlocks = xml.match(/<row\b[\s\S]*?<\/row>/gi) || []
  for (const block of rowBlocks) {
    const cells: string[] = []
    const cellRe = /<c\b([^>]*)>([\s\S]*?)<\/c>/gi
    let match: RegExpExecArray | null
    while ((match = cellRe.exec(block))) {
      const attrs = match[1]
      const inner = match[2]
      const ref = (attrs.match(/r="([^"]+)"/) || [])[1] || ''
      const t = (attrs.match(/t="([^"]+)"/) || [])[1] || ''
      const { c } = colRow(ref)
      let val = ''
      const v = (inner.match(/<v[^>]*>([\s\S]*?)<\/v>/i) || [])[1]
      const is = [...inner.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/gi)].map((x) => xmlDecode(x[1])).join('')
      if (t === 's' && v != null) val = shared[Number(v)] || ''
      else if (t === 'inlineStr') val = is
      else val = xmlDecode(v || is || '')
      cells[c] = val
    }
    rows.push(cells.map((x) => x || ''))
  }
  return rows
}

function mappedHeaderCount(cells: string[]): number {
  const headers = cells.map((h, i) => (h || '').trim() || `coluna${i + 1}`)
  return Object.values(suggestMapping(headers)).filter(Boolean).length
}

function tableFromMatrix(matrix: string[][]): ImportedTable {
  if (!matrix.length) return { headers: [], rows: [] }
  const nonempty = matrix.filter((r) => r.some((c) => (c || '').trim()))
  if (!nonempty.length) return { headers: [], rows: [] }
  const scan = Math.min(nonempty.length, 25)
  let best = 0
  let bestScore = -1
  for (let i = 0; i < scan; i += 1) {
    const score = mappedHeaderCount(nonempty[i])
    if (score > bestScore) {
      bestScore = score
      best = i
    }
  }
  const width = Math.max(...nonempty.map((r) => r.length), 0)
  if (bestScore <= 0) {
    const headers = Array.from({ length: width }, (_, i) => `coluna${i + 1}`)
    const rows = nonempty.map((r) => {
      const obj: Record<string, string> = {}
      headers.forEach((h, i) => {
        obj[h] = (r[i] || '').trim()
      })
      return obj
    })
    return { headers, rows }
  }
  const body = nonempty.slice(best)
  const headers = Array.from({ length: width }, (_, i) => (body[0][i] || '').trim() || `coluna${i + 1}`)
  const rows = body.slice(1).map((r) => {
    const obj: Record<string, string> = {}
    headers.forEach((h, i) => {
      obj[h] = (r[i] || '').trim()
    })
    return obj
  }).filter((row) => Object.values(row).some((v) => v))
  return { headers, rows }
}

function odsCellText(inner: string): string {
  const parts = [...inner.matchAll(/<text:p\b[^>]*>([\s\S]*?)<\/text:p>/gi)].map((m) =>
    xmlDecode(m[1].replace(/<[^>]+>/g, ''))
  )
  return parts.join(' ').trim()
}

function odsAttr(attrs: string, name: string): string {
  const m = attrs.match(new RegExp(`${name}="([^"]+)"`))
  return m ? m[1] : ''
}

export function parseOdsContent(xml: string): ImportedTable {
  const tableMatch = xml.match(/<table:table\b[\s\S]*?<\/table:table>/i)
  if (!tableMatch) return { headers: [], rows: [] }
  const table = tableMatch[0]
  const rowBlocks = table.match(/<table:table-row\b[\s\S]*?<\/table:table-row>/gi) || []
  const matrix: string[][] = []
  for (const rowXml of rowBlocks) {
    const rowOpen = rowXml.match(/^<table:table-row\b([^>]*)>/i)?.[1] || ''
    const rowRepeatRaw = Number(odsAttr(rowOpen, 'table:number-rows-repeated') || '1') || 1
    if (rowRepeatRaw > 50) continue
    const cells: string[] = []
    const tokenRe =
      /<(table:table-cell|table:covered-table-cell)\b([^>]*)(?:\/>|>([\s\S]*?)<\/(?:table:table-cell|table:covered-table-cell)>)/gi
    let match: RegExpExecArray | null
    while ((match = tokenRe.exec(rowXml))) {
      const attrs = match[2] || ''
      const inner = match[3] || ''
      const repeat = Math.min(Number(odsAttr(attrs, 'table:number-columns-repeated') || '1') || 1, 40)
      let value = ''
      if (!match[1].includes('covered')) {
        const text = odsCellText(inner)
        const dateVal = odsAttr(attrs, 'office:date-value')
        const rawVal = xmlDecode(odsAttr(attrs, 'office:value'))
        if (text) value = text
        else if (dateVal) value = dateVal
        else value = rawVal
      }
      for (let i = 0; i < repeat; i += 1) cells.push(value)
    }
    const times = Math.min(rowRepeatRaw, 20)
    if (cells.every((c) => !c) && rowRepeatRaw > 1) continue
    for (let i = 0; i < times; i += 1) matrix.push(cells.map((x) => x || ''))
  }
  return tableFromMatrix(matrix)
}

export function parseSpreadsheetMl(xml: string): ImportedTable {
  const rows: string[][] = []
  const rowRe = /<Row\b[\s\S]*?<\/Row>/gi
  const blocks = xml.match(rowRe) || []
  for (const block of blocks) {
    const cells: string[] = []
    const cellRe = /<Cell\b([^>]*)>([\s\S]*?)<\/Cell>/gi
    let m: RegExpExecArray | null
    let idx = 0
    while ((m = cellRe.exec(block))) {
      const attrs = m[1]
      const inner = m[2]
      const indexAttr = attrs.match(/ss:Index="(\d+)"/)
      if (indexAttr) idx = Number(indexAttr[1]) - 1
      const data = (inner.match(/<Data[^>]*>([\s\S]*?)<\/Data>/i) || [])[1] || ''
      cells[idx] = xmlDecode(data.replace(/<[^>]+>/g, ''))
      idx += 1
    }
    rows.push(cells.map((x) => x || ''))
  }
  return tableFromMatrix(rows)
}

export async function parseImportedWorkbook(file: File): Promise<ImportedTable> {
  const name = file.name || ''
  if (/\.csv$/i.test(name) || /\.txt$/i.test(name)) {
    return parseCsvTable(await file.text())
  }
  const buf = await file.arrayBuffer()
  const head = new Uint8Array(buf.slice(0, 4))
  const isZip = head[0] === 0x50 && head[1] === 0x4b
  if (isZip) {
    const files = await unzipNamed(buf, [
      'xl/sharedStrings.xml',
      'xl/worksheets/sheet1.xml',
      'content.xml',
    ])
    if (files['content.xml'] || /\.ods$/i.test(name)) {
      const ods = parseOdsContent(files['content.xml'] || '')
      if (ods.headers.length) return ods
    }
    const shared = files['xl/sharedStrings.xml'] ? parseSharedStrings(files['xl/sharedStrings.xml']) : []
    const sheet = files['xl/worksheets/sheet1.xml'] || ''
    if (sheet) return tableFromMatrix(parseSheetXml(sheet, shared))
    return { headers: [], rows: [] }
  }
  const text = new TextDecoder('utf-8').decode(buf)
  if (text.includes('<Workbook') || text.includes('ss:Worksheet')) return parseSpreadsheetMl(text)
  if (text.includes('<table:table') || text.includes('office:document')) return parseOdsContent(text)
  return parseCsvTable(text)
}

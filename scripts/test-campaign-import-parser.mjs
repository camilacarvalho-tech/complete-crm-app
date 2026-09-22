import { mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { crc32 } from 'node:zlib'
import { createServer } from 'vite'

const dir = join(process.cwd(), 'tmp-campaign-import-test')
mkdirSync(dir, { recursive: true })

const csv = `Nome completo;CPF;Telefone 1;WhatsApp;Email;Empresa;CNPJ;Cargo;Vínculo;Endereço;Número;Bairro;CEP;Cidade;UF;Produto;Operação
Ana Silva;52998224725;11988880001;11988880001;ana@example.com;Clinica Norte;11222333000181;Recepcionista;funcionario;Rua A;10;Centro;01310100;Sao Paulo;SP;Clinicas;INSS
;;;; ;Padaria Sul;22333444000192;;;Av B;20;Jardim;80010000;Curitiba;PR;Outros;
`

function u16(n) {
  const b = Buffer.alloc(2)
  b.writeUInt16LE(n)
  return b
}
function u32(n) {
  const b = Buffer.alloc(4)
  b.writeUInt32LE(n)
  return b
}

function zipStore(files) {
  const locals = []
  const centrals = []
  let offset = 0
  for (const [name, content] of Object.entries(files)) {
    const data = Buffer.from(content, 'utf8')
    const nameBuf = Buffer.from(name, 'utf8')
    const crc = crc32(data) >>> 0
    const local = Buffer.concat([
      Buffer.from([0x50, 0x4b, 0x03, 0x04]),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(data.length),
      u32(data.length),
      u16(nameBuf.length),
      u16(0),
      nameBuf,
      data,
    ])
    locals.push(local)
    const central = Buffer.concat([
      Buffer.from([0x50, 0x4b, 0x01, 0x02]),
      u16(20),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(data.length),
      u32(data.length),
      u16(nameBuf.length),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(0),
      u32(offset),
      nameBuf,
    ])
    centrals.push(central)
    offset += local.length
  }
  const centralConcat = Buffer.concat(centrals)
  const eocd = Buffer.concat([
    Buffer.from([0x50, 0x4b, 0x05, 0x06]),
    u16(0),
    u16(0),
    u16(centrals.length),
    u16(centrals.length),
    u32(centralConcat.length),
    u32(offset),
    u16(0),
  ])
  return Buffer.concat([...locals, centralConcat, eocd])
}

const headers = ['Nome', 'CPF', 'WhatsApp', 'Telefone', 'Empresa', 'Cidade', 'UF']
const values = ['Bruno Costa', '39053344705', '11977770002', '1133334444', 'Clinica Leste', 'Campinas', 'SP']
const sst = `<?xml version="1.0" encoding="UTF-8"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="14" uniqueCount="14">${[...headers, ...values].map((t) => `<si><t>${t}</t></si>`).join('')}</sst>`
const sheet = `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1">${headers.map((_, i) => `<c r="${String.fromCharCode(65 + i)}1" t="s"><v>${i}</v></c>`).join('')}</row><row r="2">${values.map((_, i) => `<c r="${String.fromCharCode(65 + i)}2" t="s"><v>${i + headers.length}</v></c>`).join('')}</row></sheetData></worksheet>`
const xlsXml = `<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Plan1"><Table><Row>${headers.map((h) => `<Cell><Data ss:Type="String">${h}</Data></Cell>`).join('')}</Row><Row>${values.map((h) => `<Cell><Data ss:Type="String">${h}</Data></Cell>`).join('')}</Row></Table></Worksheet></Workbook>`

const csvPath = join(dir, 'campanha-teste.csv')
const xlsxPath = join(dir, 'campanha-teste.xlsx')
const xlsPath = join(dir, 'campanha-teste.xls')
writeFileSync(csvPath, csv)
writeFileSync(xlsxPath, zipStore({ 'xl/sharedStrings.xml': sst, 'xl/worksheets/sheet1.xml': sheet }))
writeFileSync(xlsPath, xlsXml)

const server = await createServer({ server: { middlewareMode: true }, logLevel: 'error' })
try {
  const xlsxMod = await server.ssrLoadModule('/src/modules/leads-monitor/pipeline/xlsxImport.ts')
  const mapMod = await server.ssrLoadModule('/src/modules/leads-monitor/pipeline/csvImportMap.ts')
  async function check(label, file) {
    const table = await xlsxMod.parseImportedWorkbook(file)
    const mapped = table.rows.map((r) => mapMod.applyMapping(r, mapMod.suggestMapping(table.headers)))
    const pessoas = mapped.filter((m) => (m.nome || '').trim()).length
    const empresas = mapped.filter((m) => !(m.nome || '').trim() && ((m.empresa || '').trim() || (m.cnpj || '').trim())).length
    if (!pessoas && !empresas) throw new Error(`${label}: nenhuma linha válida ${JSON.stringify(mapped[0])} headers=${JSON.stringify(table.headers)}`)
    console.log(label, { headers: table.headers, pessoas, empresas, primeira: mapped[0] })
  }
  await check('csv', new File([csv], 'campanha-teste.csv', { type: 'text/csv' }))
  await check(
    'xlsx',
    new File([readFileSync(xlsxPath)], 'campanha-teste.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
  )
  await check('xls', new File([xlsXml], 'campanha-teste.xls', { type: 'application/vnd.ms-excel' }))
  const odsXml = `<?xml version="1.0"?><office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"><office:body><office:spreadsheet><table:table table:name="Plan1">
<table:table-row><table:table-cell><text:p>PLANILHA TESTE NX</text:p></table:table-cell></table:table-row>
<table:table-row>
<table:table-cell><text:p>Nome</text:p></table:table-cell>
<table:table-cell><text:p>CPF</text:p></table:table-cell>
<table:table-cell><text:p>WhatsApp</text:p></table:table-cell>
<table:table-cell><text:p>Empresa</text:p></table:table-cell>
</table:table-row>
<table:table-row>
<table:table-cell><text:p>Camila Carvalho</text:p></table:table-cell>
<table:table-cell><text:p>52998224725</text:p></table:table-cell>
<table:table-cell><text:p>11988880001</text:p></table:table-cell>
<table:table-cell><text:p>CODE Tecnologia</text:p></table:table-cell>
</table:table-row>
</table:table></office:spreadsheet></office:body></office:document-content>`
  const odsPath = join(dir, 'PLANILHA TESTE NX.ods')
  writeFileSync(odsPath, zipStore({ 'content.xml': odsXml }))
  await check(
    'ods',
    new File([readFileSync(odsPath)], 'PLANILHA TESTE NX.ods', { type: 'application/vnd.oasis.opendocument.spreadsheet' })
  )
  const odsIds = `<?xml version="1.0"?><office:document-content xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"><office:body><office:spreadsheet><table:table>
<table:table-row>
<table:table-cell><text:p>1701713362</text:p></table:table-cell>
<table:table-cell><text:p>Ana Souza</text:p></table:table-cell>
<table:table-cell><text:p>11987654321</text:p></table:table-cell>
<table:table-cell><text:p>52998224725</text:p></table:table-cell>
</table:table-row>
<table:table-row>
<table:table-cell><text:p>1724000877</text:p></table:table-cell>
<table:table-cell><text:p>Bruno Lima</text:p></table:table-cell>
<table:table-cell><text:p>11976543210</text:p></table:table-cell>
<table:table-cell><text:p>39053344705</text:p></table:table-cell>
</table:table-row>
</table:table></office:spreadsheet></office:body></office:document-content>`
  const inferMod = await server.ssrLoadModule('/src/modules/leads-monitor/pipeline/csvImportMap.ts')
  const idTable = await xlsxMod.parseImportedWorkbook(
    new File([zipStore({ 'content.xml': odsIds })], 'PLANIHLA TESTE NX.ods', { type: 'application/vnd.oasis.opendocument.spreadsheet' })
  )
  const inferred = inferMod.inferMappingFromTable(idTable.headers, idTable.rows)
  const mappedIds = idTable.rows.map((r) => inferMod.applyMapping(r, inferred))
  if (mappedIds.some((m) => String(m.nome || '').includes('1701713362') || /^\d+$/.test(m.nome || ''))) {
    throw new Error(`ID mapeado como nome: ${JSON.stringify({ headers: idTable.headers, inferred, mappedIds })}`)
  }
  if (!mappedIds[0].nome || !inferMod.isLikelyPersonName(mappedIds[0].nome)) {
    throw new Error(`nome não inferido ${JSON.stringify({ inferred, mappedIds, headers: idTable.headers, rows: idTable.rows })}`)
  }
  console.log('ods-ids', { headers: idTable.headers, inferred, primeira: mappedIds[0] })
  console.log('OK parser csv/xlsx/xls/ods')
} finally {
  await server.close()
  rmSync(dir, { recursive: true, force: true })
}

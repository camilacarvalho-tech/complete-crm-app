/**
 * CSV Parser — funções para processar arquivos CSV
 */

export function parseCsv(csvText: string): any[] {
  const lines = csvText.split('\n').filter(l => l.trim())
  if (lines.length < 2) return []
  
  const headers = lines[0].split(',').map(h => h.trim())
  const data: any[] = []
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim())
    const obj: any = {}
    headers.forEach((h, idx) => {
      obj[h] = values[idx] || ''
    })
    data.push(obj)
  }
  
  return data
}

export function mapCsvRow(row: any, mapping: any): any {
  const mapped: any = {}
  Object.keys(mapping).forEach(key => {
    mapped[key] = row[mapping[key]] || ''
  })
  return mapped
}

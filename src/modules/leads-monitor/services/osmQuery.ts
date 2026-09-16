/**
 * Query OSM (Nominatim bbox + Overpass QL).
 * Endpoints fixos — não aceita URL do usuário (anti-SSRF).
 * © OpenStreetMap contributors
 */

export const NOMINATIM_ENDPOINT = 'https://nominatim.openstreetmap.org/search'
export const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
] as const
export const OSM_ATTRIBUTION = '© OpenStreetMap contributors'

export interface OsmFiltros {
  cidade: string
  estado: string
  segmento: string
  palavraChave: string
  nomeEmpresa: string
  bairro: string
  cep: string
}

export interface OsmBbox {
  south: number
  west: number
  north: number
  east: number
  displayName?: string
}

export interface OsmMappedPlace {
  osmId: string
  nome: string
  endereco: string
  telefone: string
  website: string
  tipos: string[]
  lat: number | null
  lng: number | null
  cidade: string
  estado: string
  bairro: string
  cep: string
  source: 'openstreetmap'
  attribution: string
}

const SEGMENT_SELECTORS: Record<string, string[]> = {
  clinicas: [
    'nwr["amenity"="clinic"]',
    'nwr["amenity"="doctors"]',
    'nwr["amenity"="hospital"]',
    'nwr["healthcare"="clinic"]',
    'nwr["healthcare"="doctor"]',
    'nwr["healthcare"="dentist"]',
  ],
  supermercados: ['nwr["shop"="supermarket"]', 'nwr["shop"="wholesale"]'],
  mercados: ['nwr["shop"="supermarket"]', 'nwr["shop"="convenience"]', 'nwr["shop"="greengrocer"]'],
  industrias: [
    'nwr["industrial"]',
    'nwr["man_made"="works"]',
    'nwr["office"="manufacturer"]',
    'nwr["building"="industrial"]',
  ],
  academias: ['nwr["leisure"="fitness_centre"]', 'nwr["leisure"="sports_centre"]'],
  pet_shops: ['nwr["shop"="pet"]', 'nwr["amenity"="veterinary"]'],
  empresa_b2b: ['nwr["office"]', 'nwr["shop"]'],
  outros: ['node["amenity"]', 'nwr["shop"]', 'nwr["office"]'],
  inss: ['nwr["office"="financial"]', 'nwr["amenity"="bank"]', 'nwr["office"="insurance"]'],
  credito_clt: ['nwr["office"="financial"]', 'nwr["office"="company"]', 'nwr["amenity"="bank"]'],
  emprestimo: ['nwr["office"="financial"]', 'nwr["amenity"="bank"]'],
  consignado: ['nwr["office"="financial"]', 'nwr["amenity"="bank"]'],
  fgts: ['nwr["office"="financial"]', 'nwr["amenity"="bank"]'],
  cartao: ['nwr["office"="financial"]', 'nwr["amenity"="bank"]'],
  corban: ['nwr["office"="financial"]', 'nwr["amenity"="bank"]', 'nwr["office"="company"]'],
}

const KEYWORD_SELECTORS: Array<{ test: RegExp; selectors: string[] }> = [
  { test: /cl[ií]nic/i, selectors: ['nwr["amenity"="clinic"]', 'nwr["healthcare"="clinic"]'] },
  { test: /hospital/i, selectors: ['nwr["amenity"="hospital"]'] },
  { test: /m[eé]dic|doutor|doctor/i, selectors: ['nwr["healthcare"="doctor"]', 'nwr["amenity"="doctors"]'] },
  { test: /dentist/i, selectors: ['nwr["healthcare"="dentist"]', 'nwr["amenity"="dentist"]'] },
  { test: /farm[aá]c/i, selectors: ['nwr["amenity"="pharmacy"]'] },
  { test: /pet\s*shop|petshop|\bpet\b/i, selectors: ['nwr["shop"="pet"]'] },
  { test: /academia|fitness|gym/i, selectors: ['nwr["leisure"="fitness_centre"]'] },
  { test: /supermerc|hipermerc|atacarejo/i, selectors: ['nwr["shop"="supermarket"]', 'nwr["shop"="wholesale"]'] },
  { test: /ind[uú]stri/i, selectors: ['nwr["industrial"]', 'nwr["man_made"="works"]'] },
  { test: /escrit[oó]rio|office/i, selectors: ['nwr["office"]'] },
]

function clampText(value: unknown, max: number): string {
  return String(value || '').trim().slice(0, max)
}

function normalizeSegment(seg: string): string {
  const s = seg.toLowerCase().trim()
  if (/^cl[ií]nic/.test(s)) return 'clinicas'
  if (/^supermerc/.test(s)) return 'supermercados'
  if (/^ind[uú]stri/.test(s)) return 'industrias'
  return s
}

export function pickOsmFiltros(raw: Record<string, unknown> | null | undefined): OsmFiltros {
  const src = raw && typeof raw === 'object' ? raw : {}
  return {
    cidade: clampText(src.cidade, 80),
    estado: clampText(src.estado, 2).toUpperCase(),
    segmento: normalizeSegment(clampText(src.segmento, 40)),
    palavraChave: clampText(src.palavraChave, 80),
    nomeEmpresa: clampText(src.nomeEmpresa, 80),
    bairro: clampText(src.bairro, 80),
    cep: clampText(String(src.cep || '').replace(/\D/g, ''), 8),
  }
}

function escapeOverpassRegex(value: string): string {
  return String(value || '')
    .replace(/[\\^$.*+?()[\]{}|]/g, '\\$&')
    .replace(/"/g, '')
    .slice(0, 60)
}

export function buildNominatimUrl(filtros: OsmFiltros): string {
  const q = [filtros.bairro, filtros.cidade, filtros.estado, 'Brasil'].filter(Boolean).join(', ')
  const params = new URLSearchParams({
    format: 'json',
    limit: '1',
    countrycodes: 'br',
    addressdetails: '0',
    q,
  })
  if (filtros.cep) params.set('postalcode', filtros.cep)
  return `${NOMINATIM_ENDPOINT}?${params.toString()}`
}

export function parseNominatimBbox(data: unknown, queryLabel: string): OsmBbox {
  const hit = Array.isArray(data) ? data[0] : null
  const box = hit?.boundingbox
  if (!box || box.length < 4) {
    throw Object.assign(new Error('Nominatim não encontrou bounding box para a cidade informada.'), {
      code: 'skipped',
      status: 404,
    })
  }
  const south = Number(box[0])
  const north = Number(box[1])
  const west = Number(box[2])
  const east = Number(box[3])
  if (![south, north, west, east].every((n) => Number.isFinite(n))) {
    throw Object.assign(new Error('Bounding box inválida retornada pelo Nominatim.'), {
      code: 'unavailable',
      status: 502,
    })
  }
  return { south, west, north, east, displayName: String(hit.display_name || queryLabel) }
}

export function buildSelectors(filtros: OsmFiltros): string[] {
  const set = new Set<string>()
  const fromSegment = SEGMENT_SELECTORS[filtros.segmento] || []
  fromSegment.forEach((s) => set.add(s))
  const blob = `${filtros.nomeEmpresa} ${filtros.segmento}`
  for (const row of KEYWORD_SELECTORS) {
    if (row.test.test(blob)) row.selectors.forEach((s) => set.add(s))
  }
  if (set.size === 0) {
    // Segmento "Todos": mesma tríade amenity/shop/office + ["name"] (em buildOverpassQuery).
    // amenity só em node (POIs); shop/office em nwr. Evita varrer ways de amenity (estacionamento, etc.).
    set.add('node["amenity"]')
    set.add('nwr["shop"]')
    set.add('nwr["office"]')
  }
  return Array.from(set)
}

export function buildOverpassQuery(filtros: OsmFiltros, bbox: OsmBbox): string {
  // Palavra-chave de prospecção (INSS/CLT/empréstimo) NÃO filtra o nome OSM.
  const nameNeedle = escapeOverpassRegex(filtros.nomeEmpresa)
  const nameFilter = nameNeedle ? `["name"~"${nameNeedle}",i]` : '["name"]'
  const selectors = buildSelectors(filtros)
  const bboxClause = `(${bbox.south},${bbox.west},${bbox.north},${bbox.east})`
  const union = selectors.map((sel) => `  ${sel}${nameFilter}${bboxClause};`).join('\n')
  return `[out:json][timeout:25];\n(\n${union}\n);\nout center tags;`
}

export const OVERPASS_HEALTH_QUERY = '[out:json][timeout:8];node(1);out;'

function tag(tags: Record<string, unknown> | undefined, key: string): string {
  if (!tags || typeof tags !== 'object') return ''
  return String(tags[key] || tags[`contact:${key}`] || '').trim()
}

export function mapOsmElement(el: any, filtros: OsmFiltros): OsmMappedPlace | null {
  const tags = el?.tags || {}
  const nome = tag(tags, 'name')
  if (!nome) return null
  const type = el.type === 'way' || el.type === 'relation' || el.type === 'node' ? el.type : 'node'
  const osmId = `${type}/${el.id}`
  const lat = el.lat ?? el.center?.lat ?? null
  const lng = el.lon ?? el.center?.lon ?? null
  const street = tag(tags, 'addr:street')
  const number = tag(tags, 'addr:housenumber')
  const endereco =
    tag(tags, 'addr:full') || [street, number].filter(Boolean).join(', ') || tag(tags, 'addr:place')
  return {
    osmId,
    nome,
    endereco,
    telefone: tag(tags, 'phone') || tag(tags, 'contact:phone') || tag(tags, 'mobile'),
    website: tag(tags, 'website') || tag(tags, 'contact:website') || tag(tags, 'url'),
    tipos: ['amenity', 'shop', 'office', 'healthcare', 'leisure']
      .map((k) => (tags[k] ? `${k}=${tags[k]}` : ''))
      .filter(Boolean),
    lat: lat == null ? null : Number(lat),
    lng: lng == null ? null : Number(lng),
    cidade: tag(tags, 'addr:city') || filtros.cidade,
    estado: (tag(tags, 'addr:state') || filtros.estado).toUpperCase(),
    bairro: tag(tags, 'addr:suburb') || filtros.bairro,
    cep: String(tag(tags, 'addr:postcode') || filtros.cep || '').replace(/\D/g, ''),
    source: 'openstreetmap',
    attribution: OSM_ATTRIBUTION,
  }
}

export function mapOsmElements(elements: unknown[], filtros: OsmFiltros, limite: number): OsmMappedPlace[] {
  const seen = new Set<string>()
  const places: OsmMappedPlace[] = []
  for (const el of Array.isArray(elements) ? elements : []) {
    const mapped = mapOsmElement(el, filtros)
    if (!mapped || seen.has(mapped.osmId)) continue
    seen.add(mapped.osmId)
    places.push(mapped)
    if (places.length >= limite) break
  }
  return places
}

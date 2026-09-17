import { filterConnectorsByCampanha } from './fontesCampanha.ts'

const all = [
  { meta: { id: 'openstreetmap' } },
  { meta: { id: 'google-places' } },
  { meta: { id: 'csv-import' } },
  { meta: { id: 'webhook' } },
  { meta: { id: 'integracao_api' } },
]

function ids(list: typeof all) {
  return list.map((c) => c.meta.id).join(',')
}

const empty = filterConnectorsByCampanha(all, [])
if (ids(empty) !== ids(all)) throw new Error('lista vazia deve manter todas as runnables')

const osm = filterConnectorsByCampanha(all, ['openstreetmap'])
if (ids(osm) !== 'openstreetmap') throw new Error('somente OSM')

const places = filterConnectorsByCampanha(all, ['google_places'])
if (ids(places) !== 'google-places') throw new Error('google_places deve mapear para google-places')

const both = filterConnectorsByCampanha(all, ['openstreetmap', 'google_places'])
if (ids(both) !== 'openstreetmap,google-places') throw new Error('OSM + Places')

const csv = filterConnectorsByCampanha(all, ['csv'])
if (ids(csv) !== 'csv-import') throw new Error('csv deve mapear para csv-import')

console.log('fontesCampanha: OK')

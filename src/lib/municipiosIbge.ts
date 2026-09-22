const cache = new Map<string, string[]>()

export const fetchMunicipiosUf = async (uf: string, signal?: AbortSignal): Promise<string[]> => {
  const key = uf.trim().toUpperCase()
  if (!key) return []
  if (cache.has(key)) return cache.get(key) || []
  const res = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${key}/municipios`, {
    signal,
  })
  if (!res.ok) throw new Error(`IBGE indisponível para ${key}`)
  const data = (await res.json()) as { nome: string }[]
  const names = (data || []).map((d) => d.nome).sort((a, b) => a.localeCompare(b, 'pt-BR'))
  cache.set(key, names)
  return names
}

export function municipiosCacheGet(uf: string): string[] | undefined {
  return cache.get(uf.trim().toUpperCase())
}

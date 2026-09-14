import { useEffect, useState } from 'react'

const cache = new Map<string, string[]>()

export function useMunicipios(uf?: string, search = '') {
  const [cidades, setCidades] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!uf) {
      setCidades([])
      return
    }
    let alive = true
    const key = uf.toUpperCase()
    if (cache.has(key)) {
      setCidades(cache.get(key) || [])
      return
    }
    setLoading(true)
    setError(null)
    fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${key}/municipios`)
      .then((r) => {
        if (!r.ok) throw new Error('IBGE indisponível')
        return r.json()
      })
      .then((data: { nome: string }[]) => {
        const names = (data || []).map((d) => d.nome).sort((a, b) => a.localeCompare(b, 'pt-BR'))
        cache.set(key, names)
        if (alive) setCidades(names)
      })
      .catch((e) => {
        if (alive) setError(e instanceof Error ? e.message : 'Falha ao carregar municípios')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [uf])

  const q = search.trim().toLowerCase()
  const filtered = q ? cidades.filter((c) => c.toLowerCase().includes(q)).slice(0, 80) : cidades.slice(0, 80)
  return { cidades: filtered, total: cidades.length, loading, error }
}

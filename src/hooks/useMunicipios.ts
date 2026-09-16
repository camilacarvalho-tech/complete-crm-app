import { useEffect, useState } from 'react'
import { fetchMunicipiosUf, municipiosCacheGet } from '../lib/municipiosIbge'

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
    const cached = municipiosCacheGet(key)
    if (cached) {
      setCidades(cached)
      return
    }
    setLoading(true)
    setError(null)
    fetchMunicipiosUf(key)
      .then((names) => {
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
  const filtered = q ? cidades.filter((c) => c.toLowerCase().includes(q)).slice(0, 80) : cidades
  return { cidades: filtered, all: cidades, total: cidades.length, loading, error }
}

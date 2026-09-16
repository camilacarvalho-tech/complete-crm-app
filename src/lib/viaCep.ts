export async function consultarCep(cepRaw: string): Promise<{
  ok: boolean
  uf?: string
  cidade?: string
  bairro?: string
  logradouro?: string
  erro?: string
}> {
  const cep = cepRaw.replace(/\D/g, '')
  if (cep.length !== 8) return { ok: false, erro: 'CEP inválido' }
  const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
  if (!res.ok) return { ok: false, erro: 'CEP não localizado.' }
  const data = (await res.json()) as { erro?: boolean; uf?: string; localidade?: string; bairro?: string; logradouro?: string }
  if (data.erro) return { ok: false, erro: 'CEP não localizado.' }
  return {
    ok: true,
    uf: data.uf || undefined,
    cidade: data.localidade || undefined,
    bairro: data.bairro || undefined,
    logradouro: data.logradouro || undefined,
  }
}

import { useState } from 'react'
import { UFS_BRASIL } from '../../catalog/crmCatalog'
import { useMunicipios } from '../../hooks/useMunicipios'
import { FormField, SelectInput, TextInput } from './kit'

export function StateCityFields({
  uf,
  cidade,
  onUf,
  onCidade,
  ufLabel = 'ESTADO',
  cityLabel = 'CIDADE',
}: {
  uf: string
  cidade: string
  onUf: (uf: string) => void
  onCidade: (cidade: string) => void
  ufLabel?: string
  cityLabel?: string
}) {
  const [q, setQ] = useState('')
  const { cidades, loading, error, total } = useMunicipios(uf, q)
  return (
    <>
      <FormField label={ufLabel}>
        <SelectInput value={uf} onChange={(e) => { onUf(e.target.value); onCidade('') }}>
          <option value="">UF</option>
          {UFS_BRASIL.map((s) => (
            <option key={s.uf} value={s.uf}>{s.uf} — {s.nome}</option>
          ))}
        </SelectInput>
      </FormField>
      <FormField label={cityLabel}>
        <TextInput placeholder={uf ? 'Pesquisar município' : 'Selecione o estado'} value={q || cidade} onChange={(e) => { setQ(e.target.value); onCidade(e.target.value) }} disabled={!uf} />
        {loading && <span className="text-[10px]">Carregando IBGE…</span>}
        {error && <span className="text-[10px]" style={{ color: 'var(--code-danger)' }}>{error}</span>}
        {uf && (
          <SelectInput className="mt-1" value={cidade} onChange={(e) => { onCidade(e.target.value); setQ('') }} disabled={!uf}>
            <option value="">{total ? `${total} municípios` : 'Cidade'}</option>
            {cidades.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </SelectInput>
        )}
      </FormField>
    </>
  )
}

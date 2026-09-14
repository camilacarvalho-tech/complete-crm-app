import { useMemo, useState } from 'react'
import { useNexusStore } from '../contexts/NexusStore'
import { PageHeader, PrimaryButton, SelectInput } from '../components/nexus/kit'
import { money } from '../lib/nexusCore'

export default function Relatorios() {
  const store = useNexusStore()
  const [tipo, setTipo] = useState('clientes')
  const rows = useMemo(() => {
    if (tipo === 'propostas') return store.propostas.items
    if (tipo === 'digitacao') return store.digitacoes.items
    if (tipo === 'campanhas') return store.campanhas.items
    if (tipo === 'ligacoes') return store.ligacoes.items
    if (tipo === 'financeiro') return store.transacoes.items
    return store.clientes.items
  }, [tipo, store])

  function exportCsv() {
    const header = Object.keys(rows[0] || { id: '', nome: '' })
    const csv = [header.join(';'), ...rows.map((r) => header.map((h) => JSON.stringify((r as any)[h] ?? '')).join(';'))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `nexus-${tipo}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-3">
      <PageHeader title="Relatórios" subtitle="Exporta os dados reais do tenant (CSV). PDF/Excel avançado pode usar o mesmo dataset." actions={<PrimaryButton onClick={exportCsv}>Exportar CSV</PrimaryButton>} />
      <SelectInput value={tipo} onChange={(e) => setTipo(e.target.value)}>
        {['clientes', 'propostas', 'digitacao', 'campanhas', 'ligacoes', 'financeiro'].map((t) => <option key={t}>{t}</option>)}
      </SelectInput>
      <p className="text-sm text-slate-500">{rows.length} linhas · produção paga {store.digitacoes.items.filter((d) => d.status === 'paga').length} · receita {money(store.transacoes.items.filter((t) => t.tipo === 'receita').reduce((s, t) => s + Number(t.valor || 0), 0))}</p>
      <div className="nexus-card overflow-auto max-h-[60vh]">
        <table className="w-full text-sm">
          <tbody>
            {rows.slice(0, 200).map((r) => (
              <tr key={r.id} className="border-b">
                <td className="p-2 font-mono text-xs">{r.id}</td>
                <td className="p-2">{String((r as any).nome || (r as any).titulo || (r as any).descricao || (r as any).clienteNome || '')}</td>
                <td className="p-2">{String((r as any).status || (r as any).tipo || '')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

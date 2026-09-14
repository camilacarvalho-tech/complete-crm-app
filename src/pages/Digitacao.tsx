import { useState } from 'react'
import { RecordsPage } from '../components/nexus/RecordsPage'
import { getBankProvider } from '../integrations/providers'
import { digits } from '../lib/nexusCore'
import { BANCOS_DIGITACAO, INSS_OPERACOES } from '../catalog/crmCatalog'
import { GhostButton, PageHeader, TextInput } from '../components/nexus/kit'

export default function Digitacao() {
  const [cpf, setCpf] = useState('')
  const [msg, setMsg] = useState('')

  async function consultar() {
    const r = await getBankProvider().consultarCpf({ cpf: digits(cpf) })
    setMsg(r.message)
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Digitação" subtitle="Preparada para os bancos da operação. Consulta só ocorre quando o provedor estiver configurado." />
      <div className="nexus-card p-4 flex flex-wrap gap-2 items-end">
        <label className="text-xs font-semibold">CPF
          <TextInput value={cpf} onChange={(e) => setCpf(e.target.value)} />
        </label>
        <GhostButton type="button" onClick={consultar}>Consultar APIs configuradas</GhostButton>
        {msg && <p className="text-sm" style={{ color: 'var(--code-warning)' }}>{msg}</p>}
      </div>
      <RecordsPage
        storeKey="digitacoes"
        title="Fila de digitação"
        subtitle="Cada registro aponta para um cliente. Retorno de banco nunca é inventado."
        tabs={['todas', 'nova', 'em_digitacao', 'enviada', 'em_analise', 'pendencia', 'aprovada', 'reprovada', 'paga', 'cancelada']}
        fields={[
          { key: 'clienteNome', label: 'Cliente' },
          { key: 'cpf', label: 'CPF' },
          { key: 'produto', label: 'Produto' },
          { key: 'operacao', label: 'Operação', options: [...INSS_OPERACOES] },
          { key: 'banco', label: 'Banco', options: [...BANCOS_DIGITACAO] },
          { key: 'convenio', label: 'Convênio' },
          { key: 'valor', label: 'Valor' },
          { key: 'parcela', label: 'Parcela' },
          { key: 'prazo', label: 'Prazo' },
          { key: 'taxa', label: 'Taxa' },
          { key: 'status', label: 'Status', options: ['nova', 'em_digitacao', 'enviada', 'em_analise', 'pendencia', 'aprovada', 'reprovada', 'paga', 'cancelada'] },
        ]}
      />
    </div>
  )
}

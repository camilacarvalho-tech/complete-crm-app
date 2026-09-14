import { useState } from 'react'
import { useNexusStore } from '../contexts/NexusStore'
import { useAuth } from '../contexts/AuthContext'
import { getVoipProvider } from '../integrations/providers'
import { MetricCard, PageHeader, PrimaryButton, SelectInput, TextArea, TextInput } from '../components/nexus/kit'
import { useToast } from '../components/ui/Toast'

export default function Discadora() {
  const { ligacoes, clientes } = useNexusStore()
  const { usuario } = useAuth()
  const toast = useToast()
  const [clienteId, setClienteId] = useState('')
  const [telefone, setTelefone] = useState('')
  const [resultado, setResultado] = useState('Atendeu')
  const [obs, setObs] = useState('')
  const cliente = clientes.items.find((c) => c.id === clienteId)
  const hoje = ligacoes.items.filter((l) => {
    const d = l.criadoEm as { toDate?: () => Date } | undefined
    const dt = d?.toDate ? d.toDate() : null
    if (!dt) return true
    const n = new Date()
    return dt.toDateString() === n.toDateString()
  })
  const atendidas = hoje.filter((l) => l.resultado === 'Atendeu').length
  const nao = hoje.filter((l) => l.resultado === 'Não atendeu').length

  async function ligar() {
    const phone = telefone || cliente?.telefone || cliente?.whatsapp || ''
    const r = await getVoipProvider().dial(String(phone))
    toast.info(r.message)
    await ligacoes.create({
      clienteId,
      clienteNome: cliente?.nome,
      telefone: phone,
      funcionario: usuario?.nome,
      resultado: 'em_curso',
      observacao: obs,
    } as any)
  }

  async function registrar() {
    await ligacoes.create({
      clienteId,
      clienteNome: cliente?.nome,
      telefone: telefone || cliente?.telefone,
      funcionario: usuario?.nome,
      resultado,
      observacao: obs,
    } as any)
    toast.success('Ligação registrada')
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Discadora" subtitle="Pronto para SIP/WebRTC. Hoje a chamada usa o discador do dispositivo." />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="Ligações hoje" value={hoje.length} />
        <MetricCard label="Atendidas" value={atendidas} />
        <MetricCard label="Não atendidas" value={nao} />
        <MetricCard label="Taxa" value={hoje.length ? `${Math.round((atendidas / hoje.length) * 100)}%` : '0%'} />
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="nexus-card p-4 space-y-3">
          <SelectInput className="w-full" value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
            <option value="">Cliente</option>
            {clientes.items.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </SelectInput>
          <TextInput placeholder="Telefone" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
          <SelectInput className="w-full" value={resultado} onChange={(e) => setResultado(e.target.value)}>
            {['Atendeu', 'Não atendeu', 'Ocupado', 'Número inválido', 'Retorno solicitado', 'Interessado', 'Sem interesse', 'Venda', 'Outro'].map((r) => <option key={r}>{r}</option>)}
          </SelectInput>
          <TextArea rows={3} placeholder="Observação" value={obs} onChange={(e) => setObs(e.target.value)} />
          <div className="flex gap-2">
            <PrimaryButton onClick={ligar}>Ligar</PrimaryButton>
            <PrimaryButton onClick={registrar}>Registrar resultado</PrimaryButton>
          </div>
        </div>
        <div className="nexus-card p-4 text-sm space-y-2 max-h-96 overflow-y-auto">
          {ligacoes.items.map((l) => (
            <div key={l.id} className="border-b py-2">
              <p className="font-semibold">{String(l.clienteNome || l.telefone)}</p>
              <p className="text-slate-500">{String(l.resultado)} · {String(l.funcionario || '')}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

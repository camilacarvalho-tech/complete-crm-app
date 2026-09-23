import { useEffect, useMemo, useRef, useState } from 'react'
import { useNexusStore } from '../contexts/NexusStore'
import { EmptyState, ErrorBanner, GhostButton, LoadingBlock, PageHeader, PrimaryButton, SelectInput, TextInput } from '../components/nexus/kit'
import { NexusModal } from '../components/nexus/Modal'
import { DetalhesPropostaBox } from '../components/nexus/DetalhesPropostaBox'
import { labelPt, textoMisto } from '../lib/uiPt'
import { PRODUCT_CATALOG, operationsFor, productCatalogLabel } from '../catalog/productCatalog'
import { BANCOS_DIGITACAO } from '../catalog/crmCatalog'
import { writeAudit } from '../lib/audit'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/ui/Toast'
import { buildHistory, emptyLabel, formatCpfDisplay, formatPrazo, type DeskRecord } from '../modules/digitacao/digitacaoDesk'
import { toDate } from '../lib/nexusCore'
import { maskCpf } from '../lib/format'

const STATUS = ['rascunho', 'em_analise', 'enviada', 'aguardando_cliente', 'aprovada', 'reprovada', 'cancelada', 'concluida', 'finalizada']

function clienteFicticio(nome?: string) {
  const n = String(nome || '').trim()
  if (!n || /^cliente$/i.test(n) || /lead\s+homolog/i.test(n)) return true
  const digits = n.replace(/\D/g, '')
  return digits.length >= 8 && digits.length === n.replace(/\s/g, '').length
}

export default function Propostas() {
  const { usuario } = useAuth()
  const toast = useToast()
  const { propostas, clientes, auditoria } = useNexusStore()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [open, setOpen] = useState(false)
  const [caixa, setCaixa] = useState<DeskRecord | null>(null)
  const hoje = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState({
    inclusao: hoje,
    numero: '',
    produto: '',
    operacao: '',
    banco: '',
    valor: '',
    parcela: '',
    prazo: '',
    status: 'rascunho',
    responsavel: usuario?.nome || '',
  })
  const [novo, setNovo] = useState({ nome: '', cpf: '' })
  const [saving, setSaving] = useState(false)
  const [clientesAbertos, setClientesAbertos] = useState(false)
  const apagados = useRef(new Set<string>())

  const lista = useMemo(() => propostas.items.filter((p) => {
    if (/lead\s+homolog/i.test(String(p.clienteNome || ''))) return false
    if (/toke\s*real/i.test(String(p.banco || p.instituicao || ''))) return false
    const st = String(p.status || '').replace('recusada', 'reprovada')
    if (status && st !== status) return false
    if (q) {
      const termo = q.toLowerCase()
      const digitos = q.replace(/\D/g, '')
      const cpf = String(p.cpf || '').replace(/\D/g, '')
      const numero = `${p.protocolo || ''} ${p.numeroProposta || ''}`.toLowerCase()
      const bateNumero = numero.includes(termo)
      const bateCpf = digitos.length >= 3 && cpf.includes(digitos)
      if (!bateNumero && !bateCpf) return false
    }
    return true
  }), [propostas.items, q, status])

  useEffect(() => {
    const falsos = clientes.items.filter((c) => clienteFicticio(c.nome) && !apagados.current.has(c.id))
    if (!falsos.length) return
    for (const c of falsos) apagados.current.add(c.id)
    void Promise.all(falsos.map((c) => clientes.remove(c.id)))
  }, [clientes.items, clientes.remove])

  async function salvar() {
    if (saving) return
    setSaving(true)
    try {
      const nome = novo.nome.trim()
      if (!nome) {
        toast.error('Informe o nome do cliente')
        return
      }
      const clienteId = await clientes.create({
        nome,
        cpf: novo.cpf.trim(),
        status: 'novo',
        origem: 'manual',
        origemLead: 'manual',
      } as any)
      const propostaId = await propostas.create({
        ...form,
        valor: form.valor.replace(/\./g, '').replace(',', '.'),
        parcela: form.parcela.replace(/\./g, '').replace(',', '.'),
        protocolo: form.numero.trim(),
        operacao: form.operacao,
        inclusaoEm: form.inclusao,
        clienteNome: nome,
        cpf: novo.cpf.trim(),
        origemLead: 'manual',
        clienteId,
        status: form.status || 'rascunho',
      } as any)
      await writeAudit({
        empresaId: propostas.empresaId,
        usuarioId: usuario?.id,
        usuarioNome: usuario?.nome,
        modulo: 'Propostas',
        submodulo: productCatalogLabel(form.produto) || 'Crédito',
        acao: 'PROPOSTA_CRIADA',
        descricao: 'Proposta criada',
        origem: 'FUNCIONÁRIO',
        entidade: 'proposta',
        entidadeId: propostaId,
        clienteId,
        clienteNome: nome,
        cpfCliente: novo.cpf.trim(),
      })
      toast.success('Proposta registrada')
      setOpen(false)
      setNovo({ nome: '', cpf: '' })
      setForm({ inclusao: hoje, numero: '', produto: '', operacao: '', banco: '', valor: '', parcela: '', prazo: '', status: 'rascunho', responsavel: usuario?.nome || '' })
    } catch (e) {
      toast.error('Não foi possível salvar', e instanceof Error ? e.message : '')
    } finally {
      setSaving(false)
    }
  }

  if (propostas.loading) return <LoadingBlock label="Carregando propostas..." />

  return (
    <div className="space-y-4">
      <PageHeader
        title="Propostas"
        subtitle="Clique no cliente para abrir os detalhes da proposta."
        actions={<PrimaryButton onClick={() => setOpen(true)}>Nova proposta</PrimaryButton>}
      />
      <ErrorBanner message={propostas.error} />
      <div className="flex flex-wrap gap-2">
        <TextInput className="max-w-sm" value={q} onChange={(e) => {
          const bruto = e.target.value
          const digitos = bruto.replace(/\D/g, '')
          const pareceCpf = !/[a-z]/i.test(bruto) && digitos.length <= 11
          setQ(pareceCpf ? maskCpf(bruto) : bruto)
        }} placeholder="Pesquisar CPF ou número da proposta" />
        <SelectInput value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Todos os status</option>
          {STATUS.map((s) => <option key={s} value={s}>{labelPt(s)}</option>)}
        </SelectInput>
      </div>

      <div className="flex items-center justify-between gap-2 text-xs">
        <span style={{ color: 'var(--code-muted)' }}>{lista.length} propostas</span>
        <GhostButton type="button" onClick={() => setClientesAbertos((v) => !v)}>{clientesAbertos ? 'Recolher clientes' : `Clientes fechados (${lista.length})`}</GhostButton>
      </div>
      {lista.length === 0 ? (
        <EmptyState title="Nenhuma proposta neste filtro" description="Não há dados para este período." />
      ) : clientesAbertos ? (
        <div className="propostas-hscroll nexus-card">
          <table>
            <thead>
              <tr>
                <th>Inclusão</th>
                <th>Proposta</th>
                <th>CPF</th>
                <th>Cliente</th>
                <th>Produto</th>
                <th>Tipo</th>
                <th>Banco</th>
                <th>Responsável</th>
                <th>Valor</th>
                <th>Parcela</th>
                <th>Prazo</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((p) => (
                <tr key={p.id} className="border-b cursor-pointer" style={{ borderColor: 'var(--code-border)' }} onClick={() => setCaixa(p as DeskRecord)}>
                  <td>{/^\d{4}-\d{2}-\d{2}/.test(String(p.inclusaoEm || '')) ? String(p.inclusaoEm).slice(0, 10).split('-').reverse().join('/') : (toDate(p.criadoEm)?.toLocaleDateString('pt-BR') || '—')}</td>
                  <td>{emptyLabel(p.protocolo || p.numeroProposta || p.id, '—')}</td>
                  <td>{p.cpf ? formatCpfDisplay(String(p.cpf)) : '—'}</td>
                  <td>
                    <button type="button" className="font-semibold underline" style={{ color: 'var(--code-cyan)' }} onClick={(e) => { e.stopPropagation(); setCaixa(p as DeskRecord) }}>
                      {textoMisto(String(p.clienteNome || p.clienteId || '')) || 'Cliente'}
                    </button>
                  </td>
                  <td>{productCatalogLabel(String(p.produto || '')) || textoMisto(String(p.produto || '')) || '—'}</td>
                  <td>{emptyLabel(p.operacao, '—')}</td>
                  <td>{emptyLabel(p.banco || p.instituicao, '—')}</td>
                  <td>{emptyLabel(p.responsavel, '—')}</td>
                  <td>{emptyLabel(p.valorLiberado ?? p.valor, '—')}</td>
                  <td>{emptyLabel(p.parcela, '—')}</td>
                  <td>{formatPrazo(p.prazo)}</td>
                  <td>{labelPt(String(p.status || '').replace('recusada', 'reprovada'))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {caixa && (
        <div ref={(el) => el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })}>
        <DetalhesPropostaBox
          embedded
          rec={caixa}
          clienteNome={String(caixa.clienteNome || clientes.items.find((c) => c.id === caixa.clienteId)?.nome || 'Cliente')}
          historico={buildHistory({ rec: caixa, auditoria: auditoria.items as DeskRecord[] })}
          onClose={() => setCaixa(null)}
        />
        </div>
      )}

      {open && (
        <NexusModal compact title="Nova proposta" onClose={() => !saving && setOpen(false)} onSave={() => void salvar()} saving={saving} closeOnBackdrop={false}>
          <label className="text-xs font-semibold block mb-2">Inclusão
            <TextInput type="date" value={form.inclusao} onChange={(e) => setForm({ ...form, inclusao: e.target.value })} />
          </label>
          <label className="text-xs font-semibold block mb-2">Proposta
            <TextInput placeholder="Número, se já existir" value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} />
          </label>
          <label className="text-xs font-semibold block mb-2">CPF
            <TextInput placeholder="CPF" value={novo.cpf} onChange={(e) => setNovo({ ...novo, cpf: e.target.value })} />
          </label>
          <label className="text-xs font-semibold block mb-2">Cliente
            <TextInput placeholder="Nome completo" value={novo.nome} onChange={(e) => setNovo({ ...novo, nome: e.target.value })} />
          </label>
          <label className="text-xs font-semibold block mb-2">Produto
            <SelectInput className="w-full" value={form.produto} onChange={(e) => setForm({ ...form, produto: e.target.value, operacao: '' })}>
              <option value="">Selecione</option>
              {PRODUCT_CATALOG.map((p) => <option key={p.code} value={p.code}>{p.label}</option>)}
            </SelectInput>
          </label>
          <label className="text-xs font-semibold block mb-2">Tipo
            {operationsFor(form.produto).length ? (
              <SelectInput className="w-full" value={form.operacao} onChange={(e) => setForm({ ...form, operacao: e.target.value })}>
                <option value="">Selecione</option>
                {operationsFor(form.produto).map((o) => <option key={o.code} value={o.label}>{o.label}</option>)}
              </SelectInput>
            ) : (
              <TextInput placeholder="Tipo" value={form.operacao} onChange={(e) => setForm({ ...form, operacao: e.target.value })} />
            )}
          </label>
          <label className="text-xs font-semibold block mb-2">Banco
            <SelectInput className="w-full" value={form.banco} onChange={(e) => setForm({ ...form, banco: e.target.value })}>
              <option value="">Selecione</option>
              {BANCOS_DIGITACAO.map((b) => <option key={b} value={b}>{b}</option>)}
            </SelectInput>
          </label>
          <label className="text-xs font-semibold block mb-2">Responsável
            <TextInput value={form.responsavel} onChange={(e) => setForm({ ...form, responsavel: e.target.value })} />
          </label>
          <label className="text-xs font-semibold block mb-2">Valor R$
            <TextInput placeholder="0,00" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} />
          </label>
          <label className="text-xs font-semibold block mb-2">Parcela R$
            <TextInput placeholder="0,00" value={form.parcela} onChange={(e) => setForm({ ...form, parcela: e.target.value })} />
          </label>
          <label className="text-xs font-semibold block mb-2">Prazo
            <TextInput placeholder="meses" value={form.prazo} onChange={(e) => setForm({ ...form, prazo: e.target.value })} />
          </label>
          <label className="text-xs font-semibold block mb-2">Status
            <SelectInput className="w-full" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {STATUS.map((s) => <option key={s} value={s}>{labelPt(s)}</option>)}
            </SelectInput>
          </label>
        </NexusModal>
      )}
    </div>
  )
}

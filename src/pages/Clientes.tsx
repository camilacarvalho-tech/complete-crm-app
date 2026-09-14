import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useNexusStore } from '../contexts/NexusStore'
import { writeAudit } from '../lib/audit'
import { canMutate, digits, findSimilarClientes, normalizeStage, stageIdFromLegacy, stageLabel } from '../lib/nexusCore'
import { DOCUMENT_CATEGORIES, PIPELINE_STAGES, type NexusCliente } from '../types/nexus'
import { CONVENIOS_PADRAO, LEAD_ORIGINS, PRODUCT_TREE, originCode, originLabel, productLabel, productSubs } from '../catalog/crmCatalog'
import { EmptyState, ErrorBanner, FormField, GhostButton, LoadingBlock, PageHeader, PrimaryButton, SelectInput, TextArea, TextInput } from '../components/nexus/kit'
import { NexusModal } from '../components/nexus/Modal'
import { StateCityFields } from '../components/nexus/StateCityFields'
import { FilterSearch, FilterSelect } from '../components/nexus/Filters'
import { useToast } from '../components/ui/Toast'
import { labelPt } from '../lib/uiPt'
import { normalizeEmail, normalizePersonName } from '../lib/format'

const EMPTY: Omit<NexusCliente, 'id'> = {
  nome: '',
  cpf: '',
  rg: '',
  dataNascimento: '',
  telefone: '',
  whatsapp: '',
  email: '',
  cep: '',
  pais: 'Brasil',
  estado: '',
  cidade: '',
  bairro: '',
  endereco: '',
  numero: '',
  complemento: '',
  profissao: '',
  renda: '',
  banco: '',
  agencia: '',
  conta: '',
  chavePix: '',
  observacoes: '',
  origem: 'manual',
  source: 'manual',
  cidadeOrigem: '',
  estadoOrigem: '',
  status: 'Lead',
  pipeline: 'NOVO LEAD',
  pipelineStage: 'novo_lead',
  modalidades: [],
  tags: [],
  convenio: '',
  subproduto: '',
  equipe: '',
  campanha: '',
}

export default function Clientes() {
  const { usuario } = useAuth()
  const toast = useToast()
  const { clientes, propostas, digitacoes, documentos, conversas, mensagens, ligacoes, agenda, campanhas, transacoes, contratos, convenios, produtos } = useNexusStore()
  const [params, setParams] = useSearchParams()
  const selectedId = params.get('id')
  const [busca, setBusca] = useState('')
  const [status, setStatus] = useState(() => params.get('status') || '')
  const [origem, setOrigem] = useState(() => params.get('origem') || '')
  const [etapa, setEtapa] = useState(() => params.get('etapa') || '')
  const [produtoFiltro, setProdutoFiltro] = useState(() => params.get('produto') || '')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<NexusCliente | null>(null)
  const [form, setForm] = useState(EMPTY)
  const [similares, setSimilares] = useState<NexusCliente[]>([])
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [tab, setTab] = useState('resumo')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [bulk, setBulk] = useState('')
  const writable = canMutate(usuario?.perfil)
  const convenioOpts = convenios.items.length ? convenios.items.map((c) => ({ code: String(c.codigo || c.id), label: String(c.nome || c.codigo).toUpperCase() })) : CONVENIOS_PADRAO.map((c) => ({ code: c.code, label: c.label }))
  const productOpts = (() => {
    const seen = new Set<string>()
    const list: { code: string; nome: string }[] = []
    for (const p of PRODUCT_TREE) {
      seen.add(p.code)
      list.push({ code: p.code, nome: p.nome })
    }
    for (const p of produtos.items) {
      const code = String(p.codigo || p.nome || '')
      if (!code || seen.has(code)) continue
      seen.add(code)
      list.push({ code, nome: String(p.nome || p.codigo) })
    }
    return list
  })()

  const lista = useMemo(() => {
    const q = busca.toLowerCase()
    return clientes.items.filter((c) => {
      const blob = `${c.nome} ${c.cpf} ${c.telefone} ${c.whatsapp} ${c.email} ${c.cidade}`.toLowerCase()
      if (q && !blob.includes(q)) return false
      if (status && c.status !== status) return false
      if (origem && originCode(String(c.source || c.origem)) !== origem) return false
      if (etapa && normalizeStage(String(c.pipelineStage || stageIdFromLegacy(c.status, c.pipeline))) !== etapa) return false
      if (produtoFiltro && String(c.modalidade || c.produto || '') !== produtoFiltro && !(c.modalidades || []).includes(produtoFiltro) && String(c.subproduto || '') !== produtoFiltro) return false
      return true
    })
  }, [clientes.items, busca, status, origem, etapa, produtoFiltro])

  const selected = clientes.items.find((c) => c.id === selectedId) || null

  function openNew() {
    setEditing(null)
    setForm({ ...EMPTY, responsavel: usuario?.nome })
    setSimilares([])
    setModalOpen(true)
  }

  function openEdit(c: NexusCliente) {
    setEditing(c)
    setForm({ ...EMPTY, ...c })
    setSimilares([])
    setModalOpen(true)
  }

  function checkDup() {
    setSimilares(findSimilarClientes(clientes.items, form, editing?.id))
  }

  async function save(forceNew = false) {
    if (saving) return
    if (!form.nome?.trim()) {
      toast.error('Informe o nome completo')
      return
    }
    const dup = findSimilarClientes(clientes.items, form, editing?.id)
    if (dup.length && !forceNew && !editing) {
      setSimilares(dup)
      return
    }
    setSaving(true)
    try {
      if (!clientes.empresaId) throw new Error('Empresa não identificada. Recarregue a página e entre novamente.')
      const payload = {
        ...form,
        nome: normalizePersonName(form.nome),
        email: normalizeEmail(form.email),
        telefone: digits(form.telefone),
        whatsapp: digits(form.whatsapp || form.telefone),
        cpf: digits(form.cpf),
        source: originCode(String(form.source || form.origem)),
        origem: originCode(String(form.source || form.origem)),
        tenant_id: clientes.empresaId,
        empresaId: clientes.empresaId,
        pipelineStage: form.pipelineStage || 'novo_lead',
        pipeline: stageLabel(String(form.pipelineStage || 'novo_lead')),
        status: form.status || 'Lead',
        produto: form.modalidade || form.produto || '',
        modalidade: form.modalidade || form.produto || '',
        subproduto: form.subproduto || '',
        responsavel: form.responsavel || usuario?.nome || '',
        responsavelId: form.responsavelId || usuario?.id || '',
      }
      if (editing) {
        await clientes.update(editing.id, payload)
        await writeAudit({ empresaId: clientes.empresaId, usuarioId: usuario?.id, usuarioNome: usuario?.nome, modulo: 'clientes', acao: 'atualizar', entidade: 'cliente', entidadeId: editing.id, antes: editing, depois: payload })
        toast.success('Cliente atualizado')
      } else {
        const id = await clientes.create(payload as Omit<NexusCliente, 'id'>)
        await writeAudit({ empresaId: clientes.empresaId, usuarioId: usuario?.id, usuarioNome: usuario?.nome, modulo: 'clientes', acao: 'criar', entidade: 'cliente', entidadeId: id, depois: payload })
        toast.success('Cliente cadastrado')
        setParams({ id })
      }
      setModalOpen(false)
    } catch (e) {
      toast.error('Não foi possível salvar o cliente', e instanceof Error ? e.message : '')
    } finally {
      setSaving(false)
    }
  }

  async function remove(id: string) {
    try {
      await clientes.remove(id)
      await writeAudit({ empresaId: clientes.empresaId, usuarioId: usuario?.id, usuarioNome: usuario?.nome, modulo: 'clientes', acao: 'excluir', entidade: 'cliente', entidadeId: id })
      toast.success('Cliente excluído')
      setConfirmId(null)
      if (selectedId === id) setParams({})
    } catch (e) {
      toast.error('Não foi possível excluir', e instanceof Error ? e.message : '')
    }
  }

  async function applyBulk() {
    if (!bulk || !selectedIds.length) return
    if (['campanha', 'arquivar'].includes(bulk) && !window.confirm('Confirmar ação em massa?')) return
    for (const id of selectedIds) {
      if (bulk.startsWith('etapa:')) await clientes.update(id, { pipelineStage: bulk.slice(6), pipeline: stageLabel(bulk.slice(6)), status: stageLabel(bulk.slice(6)) })
      if (bulk === 'eu') await clientes.update(id, { responsavel: usuario?.nome, responsavelId: usuario?.id })
    }
    toast.success('Ação em massa aplicada')
    setSelectedIds([])
  }

  if (clientes.loading) return <LoadingBlock />

  return (
    <div className="space-y-4">
      <PageHeader title="Clientes" subtitle="Cadastro único da empresa. Origem do lead e origem geográfica são campos distintos." actions={writable ? <PrimaryButton onClick={openNew}>Novo cliente</PrimaryButton> : null} />
      <ErrorBanner message={clientes.error} />

      <div className="flex flex-wrap gap-2 items-end">
        <FilterSearch value={busca} onChange={setBusca} placeholder="Nome, CPF, telefone, e-mail" />
        <FilterSelect label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">TODOS</option>
          {[...new Set(clientes.items.map((c) => c.status).filter(Boolean))].map((s) => <option key={String(s)}>{String(s)}</option>)}
        </FilterSelect>
        <FilterSelect label="Origem do lead" value={origem} onChange={(e) => setOrigem(e.target.value)}>
          <option value="">TODAS</option>
          {LEAD_ORIGINS.map((s) => <option key={s.code} value={s.code}>{s.label}</option>)}
        </FilterSelect>
        <FilterSelect label="Etapa do atendimento" value={etapa} onChange={(e) => setEtapa(e.target.value)}>
          <option value="">TODAS</option>
          {PIPELINE_STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </FilterSelect>
      </div>

      {selectedIds.length > 0 && writable && (
        <div className="flex gap-2 items-center text-sm">
          <span>{selectedIds.length} selecionados</span>
          <SelectInput value={bulk} onChange={(e) => setBulk(e.target.value)}>
            <option value="">Ação em massa</option>
            {PIPELINE_STAGES.map((s) => <option key={s.id} value={`etapa:${s.id}`}>Etapa: {s.label}</option>)}
            <option value="eu">Atribuir a mim</option>
          </SelectInput>
          <PrimaryButton type="button" onClick={() => void applyBulk()}>Aplicar</PrimaryButton>
        </div>
      )}

      {lista.length === 0 ? (
        <EmptyState title="Nenhum cliente neste filtro" description="Cadastre manualmente ou aprove uma oportunidade no Leads Monitor." action={writable ? <PrimaryButton onClick={openNew}>Cadastrar</PrimaryButton> : null} />
      ) : (
        <div className="grid xl:grid-cols-[1fr_440px] gap-4">
          <div className="nexus-card overflow-auto">
            <table className="w-full text-sm">
              <thead className="text-left" style={{ color: 'var(--code-muted)' }}>
                <tr>
                  <th className="p-3"><input type="checkbox" aria-label="Selecionar todos" onChange={(e) => setSelectedIds(e.target.checked ? lista.map((c) => c.id) : [])} /></th>
                  <th className="p-3">Nome</th>
                  <th className="p-3">Contato</th>
                  <th className="p-3">Origem do lead</th>
                  <th className="p-3">Origem geográfica</th>
                  <th className="p-3">Etapa</th>
                  <th className="p-3">Responsável</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((c) => (
                  <tr key={c.id} onClick={() => setParams({ id: c.id })} className={`cursor-pointer border-b ${selectedId === c.id ? 'bg-[color:var(--code-surface-muted)]' : ''}`} style={{ borderColor: 'var(--code-border)' }}>
                    <td className="p-3" onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={selectedIds.includes(c.id)} onChange={(e) => setSelectedIds((ids) => e.target.checked ? [...ids, c.id] : ids.filter((x) => x !== c.id))} /></td>
                    <td className="p-3 font-medium">{c.nome}</td>
                    <td className="p-3">{c.whatsapp || c.telefone || c.email || '—'}</td>
                    <td className="p-3">{originLabel(originCode(String(c.source || c.origem)))}</td>
                    <td className="p-3">{c.cidadeOrigem || c.cidade ? `${c.cidadeOrigem || c.cidade} - ${c.estadoOrigem || c.estado || ''}` : '—'}</td>
                    <td className="p-3">{stageLabel(String(c.pipelineStage || stageIdFromLegacy(c.status, c.pipeline)))}</td>
                    <td className="p-3">{c.responsavel || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {selected ? (
            <ClientWorkspace
              cliente={selected}
              tab={tab}
              setTab={setTab}
              propostas={propostas.items.filter((p) => p.clienteId === selected.id)}
              digitacoes={digitacoes.items.filter((d) => d.clienteId === selected.id)}
              documentos={documentos.items.filter((d) => d.clienteId === selected.id)}
              conversas={conversas.items.filter((d) => d.clienteId === selected.id)}
              mensagens={mensagens.items.filter((m) => conversas.items.some((cv) => cv.clienteId === selected.id && cv.id === m.conversaId))}
              ligacoes={ligacoes.items.filter((d) => d.clienteId === selected.id)}
              agenda={agenda.items.filter((d) => d.clienteId === selected.id)}
              campanhas={campanhas.items.filter((d) => String(d.segmentoClienteId || '') === selected.id || (Array.isArray(d.clienteIds) && d.clienteIds.includes(selected.id)))}
              transacoes={transacoes.items.filter((d) => d.clienteId === selected.id)}
              contratos={contratos.items.filter((d) => d.clienteId === selected.id)}
              mensagensCount={conversas.items.filter((d) => d.clienteId === selected.id).length}
              onEdit={() => openEdit(selected)}
              onDelete={() => setConfirmId(selected.id)}
              writable={writable}
            />
          ) : (
            <EmptyState title="Selecione um cliente" description="A ficha 360° abre conversa, propostas, contratos, documentos e timeline reais." />
          )}
        </div>
      )}

      {modalOpen && (
        <NexusModal title={editing ? 'Editar cliente' : 'Novo cliente'} onClose={() => !saving && setModalOpen(false)} onSave={() => void save(false)} saveLabel="Salvar cliente" saving={saving} closeOnBackdrop={false}>
          {similares.length > 0 && (
            <div className="mb-3 rounded-lg border p-3 text-sm" style={{ borderColor: 'var(--code-warning)', background: 'color-mix(in srgb, var(--code-warning) 12%, white)' }}>
              Cliente semelhante encontrado: {similares.map((s) => s.nome).join(', ')}.
              <div className="mt-2 flex gap-2">
                <GhostButton onClick={() => { setParams({ id: similares[0].id }); setModalOpen(false) }}>Usar existente</GhostButton>
                <GhostButton onClick={() => void save(true)}>Criar novo mesmo assim</GhostButton>
              </div>
            </div>
          )}
          <div className="grid md:grid-cols-2 gap-x-4 gap-y-4">
            {(
              [
                ['nome', 'Nome completo'],
                ['cpf', 'CPF'],
                ['rg', 'RG'],
                ['dataNascimento', 'Data de nascimento'],
                ['telefone', 'Telefone'],
                ['whatsapp', 'WhatsApp'],
                ['email', 'E-mail'],
                ['cep', 'CEP'],
                ['pais', 'País'],
                ['bairro', 'Bairro'],
                ['endereco', 'Endereço'],
                ['numero', 'Número'],
                ['complemento', 'Complemento'],
                ['profissao', 'Profissão'],
                ['renda', 'Renda'],
                ['banco', 'Banco'],
                ['agencia', 'Agência'],
                ['conta', 'Conta'],
                ['chavePix', 'Chave PIX'],
                ['responsavel', 'Responsável'],
                ['equipe', 'Equipe'],
                ['campanha', 'Campanha'],
                ['primeiroContatoEm', 'Data de entrada'],
                ['ultimoContatoEm', 'Data do último contato'],
                ['proximoFollowUp', 'Próximo follow-up'],
              ] as const
            ).map(([key, label]) => (
              <FormField key={key} label={label}>
                <TextInput
                  type={key.includes('Em') || key.includes('Follow') || key === 'dataNascimento' ? 'date' : 'text'}
                  value={String((form as Record<string, unknown>)[key] || '')}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  onBlur={checkDup}
                />
              </FormField>
            ))}
            <StateCityFields uf={String(form.estado || '')} cidade={String(form.cidade || '')} onUf={(uf) => setForm((f) => ({ ...f, estado: uf, cidade: '' }))} onCidade={(cidade) => setForm((f) => ({ ...f, cidade }))} />
            <StateCityFields uf={String(form.estadoOrigem || '')} cidade={String(form.cidadeOrigem || '')} onUf={(uf) => setForm((f) => ({ ...f, estadoOrigem: uf, cidadeOrigem: '' }))} onCidade={(cidade) => setForm((f) => ({ ...f, cidadeOrigem }))} ufLabel="Estado de origem" cityLabel="Cidade de origem" />
            <FormField label="Origem do lead">
              <SelectInput value={originCode(String(form.source || 'manual'))} onChange={(e) => setForm((f) => ({ ...f, source: e.target.value, origem: e.target.value }))}>
                {LEAD_ORIGINS.map((s) => <option key={s.code} value={s.code}>{s.label}</option>)}
              </SelectInput>
            </FormField>
            <FormField label="Etapa do atendimento">
              <SelectInput value={String(form.pipelineStage || 'novo_lead')} onChange={(e) => setForm((f) => ({ ...f, pipelineStage: e.target.value, pipeline: stageLabel(e.target.value), status: stageLabel(e.target.value) }))}>
                {PIPELINE_STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </SelectInput>
            </FormField>
            <FormField label="Produto">
              <SelectInput value={String(form.modalidade || form.produto || '')} onChange={(e) => setForm((f) => ({ ...f, modalidade: e.target.value, produto: e.target.value, modalidades: [e.target.value], subproduto: productSubs(e.target.value).includes(String(f.subproduto || '')) ? f.subproduto : '' }))}>
                <option value="">Selecione</option>
                {productOpts.map((p) => <option key={p.code} value={p.code}>{p.nome}</option>)}
              </SelectInput>
            </FormField>
            {productSubs(String(form.modalidade || form.produto || '')).length > 0 && (
              <FormField label={/inss/i.test(String(form.modalidade || form.produto || '')) ? 'Tipo de operação INSS' : 'Tipo / operação'}>
                <SelectInput value={String(form.subproduto || '')} onChange={(e) => setForm((f) => ({ ...f, subproduto: e.target.value }))}>
                  <option value="">Selecione</option>
                  {productSubs(String(form.modalidade || form.produto || '')).map((s) => <option key={s} value={s}>{s}</option>)}
                </SelectInput>
              </FormField>
            )}
            {String(form.modalidade || form.produto || '') && (
              <FormField label="Convênio / público">
                <SelectInput value={String(form.convenio || '')} onChange={(e) => setForm((f) => ({ ...f, convenio: e.target.value }))}>
                  <option value="">Selecione</option>
                  {convenioOpts.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
                </SelectInput>
              </FormField>
            )}
          </div>
          <FormField label="Observações">
            <TextArea rows={3} value={form.observacoes || ''} onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))} />
          </FormField>
        </NexusModal>
      )}

      {confirmId && (
        <NexusModal title="Excluir este cliente?" onClose={() => setConfirmId(null)} onSave={() => void remove(confirmId)} saveLabel="Excluir" closeOnBackdrop>
          <p className="text-sm" style={{ color: 'var(--code-muted)' }}>A ação não pode ser desfeita.</p>
        </NexusModal>
      )}
    </div>
  )
}

function ClientWorkspace({
  cliente, tab, setTab, propostas, digitacoes, documentos, conversas, mensagens, ligacoes, agenda, campanhas, transacoes, contratos, onEdit, onDelete, writable,
}: {
  cliente: NexusCliente
  tab: string
  setTab: (t: string) => void
  propostas: { id: string; status?: unknown; produto?: unknown; criadoEm?: unknown }[]
  digitacoes: { id: string; status?: unknown; operacao?: unknown; criadoEm?: unknown }[]
  documentos: { id: string; categoria?: unknown; nome?: unknown; criadoEm?: unknown }[]
  conversas: { id: string; status?: unknown; criadoEm?: unknown; lastMessage?: unknown }[]
  mensagens: { id: string; texto?: unknown; criadoEm?: unknown; tipo?: unknown; status?: unknown }[]
  ligacoes: { id: string; resultado?: unknown; criadoEm?: unknown }[]
  agenda: { id: string; titulo?: unknown; data?: unknown; tipo?: unknown; criadoEm?: unknown }[]
  campanhas: { id: string; nome?: unknown }[]
  transacoes: { id: string; tipo?: unknown; valor?: unknown }[]
  contratos: { id: string; numero?: unknown; status?: unknown }[]
  mensagensCount?: number
  onEdit: () => void
  onDelete: () => void
  writable: boolean
}) {
  const produtoNome = productLabel(cliente.modalidade || cliente.produto)
  const tabs = [
    ['resumo', 'Resumo'],
    ['atendimento', 'Atendimento'],
    ['conversas', 'Conversas'],
    ['propostas', 'Propostas'],
    ['documentos', 'Documentos'],
    ['tarefas', 'Tarefas'],
    ['agenda', 'Agenda'],
    ['financeiro', 'Financeiro'],
    ['historico', 'Histórico'],
    ['observacoes', 'Observações'],
  ]
  const timeline = [
    cliente.criadoEm && { t: cliente.criadoEm, label: 'Lead recebido' },
    ...conversas.map((c) => ({ t: c.criadoEm, label: `Atendimento · ${labelPt(String(c.status || ''))}` })),
    ...mensagens.slice(0, 40).map((m) => ({ t: m.criadoEm, label: String(m.texto || m.tipo || 'Mensagem') })),
    ...documentos.map((d) => ({ t: d.criadoEm, label: `Documento recebido · ${d.nome || d.categoria || ''}` })),
    ...propostas.map((p) => ({ t: p.criadoEm, label: `Proposta ${labelPt(String(p.status || '').replace('recusada', 'reprovada'))}` })),
    ...digitacoes.map((d) => ({ t: d.criadoEm, label: `Digitação ${labelPt(String(d.status || ''))}` })),
    ...agenda.map((a) => ({ t: a.criadoEm || a.data, label: String(a.titulo || 'Follow-up') })),
    ...ligacoes.map((l) => ({ t: l.criadoEm, label: `Ligação ${l.resultado || ''}` })),
  ].filter((x): x is { t: unknown; label: string } => Boolean(x && x.t))
    .sort((a, b) => String(a.t).localeCompare(String(b.t)))

  const proximo = cliente.proximoFollowUp || agenda.find((a) => String(a.data || '') >= new Date().toISOString().slice(0, 10))?.titulo

  return (
    <div className="nexus-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-bold">{cliente.nome}</h2>
          <p className="text-xs" style={{ color: 'var(--code-muted)' }}>
            CPF {cliente.cpf || '—'} · {cliente.whatsapp || cliente.telefone || '—'} · {cliente.email || '—'}
          </p>
          <p className="text-xs" style={{ color: 'var(--code-muted)' }}>
            {stageLabel(String(cliente.pipelineStage))} · {cliente.responsavel || 'sem responsável'} · {produtoNome}
            {cliente.subproduto ? ` · ${cliente.subproduto}` : ''}
            {' · '}{originLabel(originCode(String(cliente.source || cliente.origem)))}
          </p>
          <p className="text-xs font-semibold mt-1">Próximo passo: {String(proximo || 'Definir retorno')}</p>
        </div>
        {writable && (
          <div className="flex gap-2">
            <GhostButton onClick={onEdit}>Editar</GhostButton>
            <GhostButton onClick={onDelete}>Excluir</GhostButton>
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-1">
        {tabs.map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} className={`px-2 py-1 rounded text-[11px] ${tab === id ? 'nexus-cta text-white' : ''}`} style={tab === id ? undefined : { background: 'var(--code-surface-muted)' }}>{label}</button>
        ))}
      </div>
      {tab === 'resumo' && (
        <div className="text-sm space-y-1">
          <p>Produto: {produtoNome}</p>
          {cliente.subproduto && <p>Operação: {cliente.subproduto}</p>}
          <p>Convênio: {String(cliente.convenio || '—').toUpperCase()}</p>
          <p>Origem: {originLabel(originCode(String(cliente.source || cliente.origem)))}</p>
          <p>Responsável: {cliente.responsavel || '—'}</p>
          <p>Etapa: {stageLabel(String(cliente.pipelineStage))}</p>
          <p>Última interação: {cliente.ultimaInteracao || '—'}</p>
          <a className="text-sm font-semibold" style={{ color: 'var(--code-orange)' }} href={`/whatsapp?cliente=${cliente.id}`}>Abrir WhatsApp</a>
        </div>
      )}
      {tab === 'atendimento' && <ListOrEmpty items={conversas} render={(p) => `${labelPt(String(p.status || ''))} · ${p.lastMessage || ''}`} empty="Nenhum atendimento registrado." />}
      {tab === 'conversas' && <ListOrEmpty items={mensagens} render={(p) => String(p.texto || p.tipo || p.id)} empty="Sem histórico de mensagens." />}
      {tab === 'propostas' && <ListOrEmpty items={propostas} render={(p) => `${p.produto || 'Proposta'} · ${labelPt(String(p.status || '').replace('recusada', 'reprovada'))}`} empty="Nenhuma proposta" />}
      {tab === 'documentos' && <ListOrEmpty items={documentos} render={(p) => `${p.categoria || DOCUMENT_CATEGORIES[10]} · ${p.nome || p.id}`} empty="Nenhum documento" />}
      {tab === 'financeiro' && <ListOrEmpty items={transacoes} render={(p) => `${p.tipo || ''} · ${p.valor || ''}`} empty="Sem lançamentos vinculados." />}
      {tab === 'tarefas' && <ListOrEmpty items={agenda.filter((a) => String(a.tipo || '') === 'tarefa')} render={(p) => String(p.titulo || p.id)} empty="Nenhuma tarefa" />}
      {tab === 'agenda' && <ListOrEmpty items={agenda} render={(p) => `${p.titulo || 'Compromisso'} · ${p.data || ''}`} empty="Nada na agenda" />}
      {tab === 'observacoes' && <p className="text-sm">{cliente.observacoes || 'Sem observações.'}</p>}
      {tab === 'historico' && (
        timeline.length ? (
          <ul className="text-sm space-y-2">
            {timeline.map((ev, i) => (
              <li key={i} className="border-l-2 pl-3" style={{ borderColor: 'var(--code-cyan)' }}>{ev.label}</li>
            ))}
          </ul>
        ) : <p className="text-sm" style={{ color: 'var(--code-muted)' }}>Ainda não há eventos reais nesta ficha.</p>
      )}
    </div>
  )
}

function ListOrEmpty<T extends { id: string }>({ items, render, empty }: { items: T[]; render: (i: T) => string; empty: string }) {
  if (!items.length) return <p className="text-sm" style={{ color: 'var(--code-muted)' }}>{empty}</p>
  return (
    <ul className="text-sm space-y-1">
      {items.map((i) => (
        <li key={i.id} className="border-b py-1" style={{ borderColor: 'var(--code-border)' }}>{render(i)}</li>
      ))}
    </ul>
  )
}

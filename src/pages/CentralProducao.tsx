import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { UFS_BRASIL } from '../catalog/crmCatalog'
import { PRODUCT_CATALOG } from '../catalog/productCatalog'
import { useAuth } from '../contexts/AuthContext'
import { useNexusStore } from '../contexts/NexusStore'
import { useToast } from '../components/ui/Toast'
import { DetalhesPropostaBox } from '../components/nexus/DetalhesPropostaBox'
import { GhostButton, SelectInput, TextInput } from '../components/nexus/kit'
import { writeAudit } from '../lib/audit'
import { consultarCep } from '../lib/viaCep'
import { assumirDigitacaoFirestore } from '../modules/digitacao/assumirDigitacaoFirestore'
import { toDate } from '../lib/nexusCore'
import {
  CARDS_ESTEIRA,
  ESTEIRA,
  ESTEIRA_LABEL,
  TIMELINE_ESTEIRA,
  abrirPendencia,
  anexarDocumento,
  contarCards,
  BANCOS_DIGITACAO,
  DOCS_ESPERADOS,
  MENSAGEM_BANCO_LOCAL,
  MINHA_DIGITACAO,
  NAO_INFORMADO,
  ORIGENS_LEAD,
  PRODUTOS_DIGITACAO,
  SIMULACAO_INDISPONIVEL,
  aplicarEnderecoCep,
  contarMinhaDigitacao,
  cpfMascarado,
  filaOperacional,
  filtrarPropostas,
  indiceTimeline,
  informarContrato,
  lerMoeda,
  mascaraCep,
  mascaraCpf,
  mascaraTelefone,
  minhaProducao,
  moedaBr,
  montarNovaDigitacao,
  mudarStatus,
  naMinhaFila,
  prepararBanco,
  produtoDigitacao,
  registroVisivel,
  resolverPendencia,
  rotuloOrigem,
  statusEsteira,
  textoOuNao,
  tipoNotificacao,
  type CardEsteiraId,
  type DocumentoProposta,
  type PropostaProd,
} from '../modules/digitacao/producaoEsteira'

const BANCOS = [...BANCOS_DIGITACAO]

function quando(value: unknown): string {
  const d = toDate(value)
  if (!d) return NAO_INFORMADO
  const dia = d.toLocaleDateString('pt-BR')
  const hm = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return `${dia.slice(0, 5)} ${hm}`
}

function origemInicial(raw: string): string {
  return rotuloOrigem({ origem: raw }) === NAO_INFORMADO ? '' : rotuloOrigem({ origem: raw })
}

function nomeProduto(code: unknown): string {
  return PRODUTOS_DIGITACAO.find((p) => p.code === code)?.label || textoOuNao(code)
}

function Bloco(props: { id: string; titulo: string; aberto: boolean; onToggle: (id: string) => void; extra?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded" style={{ border: '1px solid var(--code-border)' }}>
      <div className="flex items-center gap-2 px-2 py-1">
        <button type="button" className="flex-1 text-left text-xs font-semibold" aria-expanded={props.aberto} onClick={() => props.onToggle(props.id)}>
          {props.aberto ? '▼' : '▶'} {props.titulo}
        </button>
        {props.extra}
      </div>
      {props.aberto ? <div className="px-2 pb-2 text-xs">{props.children}</div> : null}
    </section>
  )
}

export default function CentralProducao() {
  const { digitacoes, propostas, documentos, clientes } = useNexusStore()
  const { usuario } = useAuth()
  const toast = useToast()
  const [params] = useSearchParams()
  const [card, setCard] = useState<CardEsteiraId | ''>('')
  const [visao, setVisao] = useState<'todas' | 'minhas' | 'pendentes' | 'analise' | 'aprovadas' | 'pagas'>('todas')
  const [banco, setBanco] = useState('')
  const [produto, setProduto] = useState('')
  const [status, setStatus] = useState('')
  const [operador, setOperador] = useState('')
  const [data, setData] = useState('')
  const [cidade, setCidade] = useState('')
  const [origem, setOrigem] = useState('')
  const [numero, setNumero] = useState('')
  const [busca, setBusca] = useState('')
  const [aberta, setAberta] = useState<string | null>(null)
  const [modo, setModo] = useState<'abrir' | 'digitar' | 'historico'>('abrir')
  const [secoes, setSecoes] = useState<Record<string, boolean>>({})
  const [novaPend, setNovaPend] = useState(false)
  const [nomesAbertos, setNomesAbertos] = useState(true)
  const [cepMsg, setCepMsg] = useState('')
  const [numeroContrato, setNumeroContrato] = useState('')
  const [numeroOperacao, setNumeroOperacao] = useState('')
  const [numeroPropostaBanco, setNumeroPropostaBanco] = useState('')
  const [obs, setObs] = useState('')
  const [pendTipo, setPendTipo] = useState('Documento faltante')
  const [pendDesc, setPendDesc] = useState('')
  const [pendPrazo, setPendPrazo] = useState('')
  const [pendPrioridade, setPendPrioridade] = useState('')
  const [criar, setCriar] = useState(Boolean(params.get('cliente') || params.get('conversa') || params.get('lead') || params.get('nova') || params.get('digitacao')))
  const [form, setForm] = useState({
    clienteNome: params.get('nome') || '',
    cpf: '',
    telefone: mascaraTelefone(params.get('telefone') || ''),
    nascimento: '',
    cep: mascaraCep(params.get('cep') || ''),
    logradouro: params.get('logradouro') || '',
    numero: params.get('numero') || '',
    complemento: '',
    bairro: params.get('bairro') || '',
    cidade: params.get('cidade') || '',
    uf: params.get('uf') || '',
    produto: produtoDigitacao(params.get('produto') || '')?.code || '',
    banco: '',
    tipoOperacao: '',
    convenio: '',
    origem: origemInicial(params.get('origem') || (params.get('lead') ? 'leads_monitor' : params.get('conversa') ? 'whatsapp' : '')),
    observacoes: '',
    valorSolicitado: '',
    valorLiberado: '',
    prazo: '',
    parcela: '',
    margem: '',
    clienteId: params.get('cliente') || '',
    leadId: params.get('lead') || '',
    conversaId: params.get('conversa') || '',
    metaSource: params.get('source') || '',
    metaMedium: params.get('medium') || '',
    metaCampaign: params.get('campaign') || '',
    metaCampaignId: params.get('campaignId') || params.get('campanhaId') || '',
    metaAdset: params.get('adset') || '',
    metaAdsetId: params.get('adsetId') || '',
    metaAd: params.get('ad') || '',
    metaAdId: params.get('adId') || '',
    documentos: [] as DocumentoProposta[],
  })

  const registros = useMemo(() => {
    const dig = digitacoes.items as PropostaProd[]
    const numeros = new Set(dig.map((d) => String(d.numeroProposta || '')))
    const extra = (propostas.items as PropostaProd[]).filter((p) => !numeros.has(String(p.numeroProposta || p.id)))
    return [...dig, ...extra].filter(registroVisivel)
  }, [digitacoes.items, propostas.items])

  useEffect(() => {
    if (!form.clienteId) return
    const cliente = clientes.items.find((item) => item.id === form.clienteId)
    if (!cliente) return
    setForm((atual) => ({
      ...atual,
      clienteNome: atual.clienteNome || cliente.nome || '',
      cpf: atual.cpf || mascaraCpf(cliente.cpf || ''),
      telefone: atual.telefone || mascaraTelefone(cliente.whatsapp || cliente.telefone || ''),
      nascimento: atual.nascimento || cliente.dataNascimento || '',
      cep: atual.cep || mascaraCep(cliente.cep || ''),
      logradouro: atual.logradouro || cliente.endereco || '',
      numero: atual.numero || cliente.numero || '',
      complemento: atual.complemento || cliente.complemento || '',
      bairro: atual.bairro || cliente.bairro || '',
      cidade: atual.cidade || cliente.cidade || '',
      uf: atual.uf || cliente.estado || '',
      origem: atual.origem || origemInicial(String(cliente.origemLead || cliente.origem || '')),
      metaSource: atual.metaSource || String(cliente.utm_source || cliente.source || ''),
      metaMedium: atual.metaMedium || String(cliente.utm_medium || ''),
      metaCampaign: atual.metaCampaign || String(cliente.utm_campaign || ''),
      metaCampaignId: atual.metaCampaignId || String(cliente.campaign_id || cliente.campanhaId || ''),
      metaAdsetId: atual.metaAdsetId || String(cliente.adset_id || ''),
      metaAdId: atual.metaAdId || String(cliente.ad_id || ''),
    }))
  }, [form.clienteId, clientes.items])

  const cards = useMemo(() => contarCards(registros), [registros])
  const lista = useMemo(
    () => filtrarPropostas(registros, {
      card,
      visao,
      operadorAtualId: usuario?.id,
      banco,
      produto,
      status,
      operador,
      data,
      cidade,
      origem,
      numero,
      busca,
    }),
    [registros, card, visao, usuario?.id, banco, produto, status, operador, data, cidade, origem, numero, busca],
  )
  const fila = useMemo(() => filaOperacional(registros), [registros])
  const producao = useMemo(() => minhaProducao(registros, String(usuario?.id || ''), new Date().toISOString().slice(0, 10)), [registros, usuario?.id])
  const minha = useMemo(() => contarMinhaDigitacao(registros, String(usuario?.id || '')), [registros, usuario?.id])
  const minhaFila = useMemo(() => naMinhaFila(registros, String(usuario?.id || '')), [registros, usuario?.id])
  const atual = registros.find((r) => r.id === aberta) || null
  const docsAtuais = documentos.items.filter((d) => String(d.propostaId || '') === atual?.id || (atual?.documentosProposta || []).some((x) => x.id === d.id))

  useEffect(() => {
    setNumeroPropostaBanco(atual?.numeroProposta || '')
    setNumeroContrato(atual?.numeroContrato || '')
    setNumeroOperacao(atual?.numeroOperacao || '')
    setNovaPend(false)
    if (!atual?.id) return
    setSecoes({
      cliente: modo !== 'historico',
      operacao: modo !== 'historico',
      banco: modo !== 'historico',
      documentos: false,
      simulacao: false,
      pendencias: false,
      contrato: false,
      historico: modo === 'historico',
    })
  }, [atual?.id, modo])

  function alternar(id: string) {
    setSecoes((atualSecao) => ({ ...atualSecao, [id]: !atualSecao[id] }))
  }

  function colecao(id: string) {
    return digitacoes.items.some((d) => d.id === id) ? digitacoes : propostas
  }

  async function criarProposta() {
    const agora = new Date().toISOString()
    const montada = montarNovaDigitacao({
      clienteNome: form.clienteNome,
      cpf: form.cpf.replace(/\D/g, ''),
      telefone: form.telefone.replace(/\D/g, ''),
      nascimento: form.nascimento,
      cep: form.cep.replace(/\D/g, ''),
      logradouro: form.logradouro,
      numero: form.numero,
      complemento: form.complemento,
      bairro: form.bairro,
      convenio: form.convenio,
      cidade: form.cidade,
      uf: form.uf,
      leadId: form.leadId,
      clienteId: form.clienteId,
      conversaId: form.conversaId,
      produto: form.produto,
      banco: form.banco,
      tipoOperacao: form.tipoOperacao,
      origem: form.origem,
      observacoes: form.observacoes,
      metaSource: form.metaSource,
      metaMedium: form.metaMedium,
      metaCampaign: form.metaCampaign,
      metaCampaignId: form.metaCampaignId,
      metaAdset: form.metaAdset,
      metaAdsetId: form.metaAdsetId,
      metaAd: form.metaAd,
      metaAdId: form.metaAdId,
      valorSolicitado: lerMoeda(form.valorSolicitado),
      valorLiberado: lerMoeda(form.valorLiberado),
      prazo: lerMoeda(form.prazo),
      parcela: lerMoeda(form.parcela),
      margem: lerMoeda(form.margem),
      documentos: form.documentos,
      usuario: usuario?.nome || 'Operador',
      dataHora: agora,
      numeroProposta: '',
    })
    if (!montada.ok || !montada.registro) {
      toast.error(montada.motivo || 'Não foi possível preparar a digitação.')
      return
    }
    const { id: _id, ...payload } = montada.registro
    await digitacoes.create(payload as never)
    await propostas.create(payload as never)
    toast.success('Digitação na fila. Nenhum banco foi chamado.')
    setCriar(false)
  }

  async function trocarStatus(rec: PropostaProd, statusNovo: string) {
    const r = mudarStatus(rec, statusNovo, usuario?.nome || 'Operador', obs, new Date().toISOString())
    if (!r.ok || !r.status) {
      toast.error(r.motivo || 'Status fora da esteira')
      return
    }
    await colecao(rec.id).update(rec.id, {
      status: r.status,
      historicoEsteira: r.historico,
      atualizadoEm: new Date().toISOString(),
      ...(r.status === 'EM_ANALISE' ? { analiseDesde: new Date().toISOString() } : {}),
    } as never)
    await writeAudit({
      empresaId: digitacoes.empresaId,
      usuarioId: usuario?.id,
      usuarioNome: usuario?.nome,
      modulo: 'Digitação',
      acao: 'status',
      entidade: 'proposta',
      entidadeId: rec.id,
      depois: { status: r.status },
    })
    const aviso = tipoNotificacao(r.status)
    if (aviso === 'pendencia') toast.success('Pendência registrada na central.')
    else if (aviso === 'aprovacao') toast.success('Proposta aprovada.')
    else if (aviso === 'reprovacao') toast.success('Proposta reprovada.')
    else if (aviso === 'pagamento') toast.success('Pagamento registrado.')
    setObs('')
  }

  async function assumir(rec: PropostaProd) {
    const empresaId = digitacoes.empresaId || propostas.empresaId
    if (!empresaId) {
      toast.error('Empresa não identificada')
      return
    }
    const colecaoNome = digitacoes.items.some((d) => d.id === rec.id) ? 'digitacoes' : 'propostas'
    const r = await assumirDigitacaoFirestore({
      empresaId,
      colecao: colecaoNome,
      id: rec.id,
      operadorId: String(usuario?.id || ''),
      operadorNome: usuario?.nome || 'Operador',
      agora: new Date().toISOString(),
    })
    if (!r.ok) {
      toast.error(r.motivo || 'Esta digitação já foi atribuída a outro operador.')
      return
    }
    toast.success('Digitação assumida.')
  }

  async function novaPendencia(rec: PropostaProd) {
    if (!pendDesc.trim()) return
    const agora = new Date().toISOString()
    const pendencias = abrirPendencia(rec, {
      id: `pen-${Date.now()}`,
      tipo: pendTipo,
      motivo: pendTipo,
      descricao: pendDesc.trim(),
      responsavel: usuario?.nome || 'Operador',
      prazo: pendPrazo,
      prioridade: pendPrioridade,
      criadoEm: agora,
    })
    const hist = mudarStatus(rec, 'PENDENCIA', usuario?.nome || 'Operador', pendDesc.trim(), agora)
    await colecao(rec.id).update(rec.id, { pendencias, status: 'PENDENCIA', historicoEsteira: hist.historico, atualizadoEm: agora } as never)
    setPendDesc('')
    toast.success('Pendência aberta. Nenhum WhatsApp foi enviado.')
  }

  async function resolver(rec: PropostaProd, id: string) {
    const r = resolverPendencia(rec, id, usuario?.nome || 'Operador', new Date().toISOString())
    if (!r.ok) return
    await colecao(rec.id).update(rec.id, { pendencias: r.pendencias, historicoEsteira: r.historico, atualizadoEm: new Date().toISOString() } as never)
    toast.success('Pendência resolvida.')
  }

  function simular(rec: PropostaProd) {
    void rec
    void prepararBanco({})
    toast.success(SIMULACAO_INDISPONIVEL)
  }

  async function salvarContrato(rec: PropostaProd) {
    const r = informarContrato(rec, {
      numeroProposta: numeroPropostaBanco,
      numeroContrato,
      numeroOperacao,
    }, usuario?.nome || 'Operador', new Date().toISOString())
    if (!r.ok || !r.registro) {
      toast.error(r.motivo || 'Informe o número recebido do banco.')
      return
    }
    const { id: _id, ...payload } = r.registro
    await colecao(rec.id).update(rec.id, payload as never)
    toast.success('Contrato registrado no histórico.')
  }

  async function buscarCep(valor: string) {
    const cep = mascaraCep(valor)
    setForm((atualForm) => ({ ...atualForm, cep }))
    setCepMsg('')
    if (cep.replace(/\D/g, '').length !== 8) return
    try {
      const resposta = await consultarCep(cep)
      const aplicado = aplicarEnderecoCep(form, resposta.ok ? resposta : { ok: false })
      if (!aplicado.ok) {
        setCepMsg(aplicado.mensagem || 'CEP não encontrado.')
        return
      }
      setForm((atualForm) => ({ ...atualForm, ...aplicado.endereco, cep }))
    } catch {
      setCepMsg('CEP não encontrado.')
    }
  }

  async function anexar(rec: PropostaProd, file: File, tipo: string) {
    const doc = {
      id: `doc-${Date.now()}`,
      nome: file.name,
      tipo,
      tamanho: file.size,
      status: 'anexado',
      criadoEm: new Date().toISOString(),
    }
    const documentosProposta = anexarDocumento(rec, doc)
    await colecao(rec.id).update(rec.id, { documentosProposta, atualizadoEm: new Date().toISOString() } as never)
    if (digitacoes.empresaId) {
      await documentos.create({
        propostaId: rec.id,
        clienteId: rec.clienteId || '',
        nome: file.name,
        tipo,
        tamanho: file.size,
        status: 'anexado',
      } as never)
    }
  }

  const passo = indiceTimeline(atual?.status)
  const pendAbertas = (atual?.pendencias || []).filter((p) => p.status === 'ABERTA')
  const docsFicha = [
    ...(atual?.documentosProposta || []),
    ...docsAtuais
      .filter((d) => !(atual?.documentosProposta || []).some((x) => x.nome === d.nome))
      .map((d) => ({ id: d.id, nome: String(d.nome || 'Arquivo'), tipo: String(d.tipo || d.categoria || ''), tamanho: Number(d.tamanho || 0), status: String(d.status || ''), criadoEm: String(d.criadoEm || '') })),
  ]

  return (
    <section className="space-y-3">
      <div>
        <h1 className="text-lg font-bold">Digitação</h1>
        <p className="text-xs" style={{ color: 'var(--code-muted)' }}>Central de Produção</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-9 gap-2">
        {CARDS_ESTEIRA.map((c) => (
          <button key={c.id} type="button" className="rounded-lg p-2 text-left" style={{ background: card === c.id ? 'var(--code-navy, #0f2744)' : 'var(--code-surface)', border: '1px solid var(--code-border)', color: card === c.id ? '#fff' : 'inherit' }} onClick={() => setCard(card === c.id ? '' : c.id)}>
            <div className="text-[10px]">{c.label}</div>
            <div className="text-lg font-bold">{cards[c.id]}</div>
          </button>
        ))}
        <button type="button" className="rounded-lg p-2 text-left" style={{ background: 'var(--code-surface)', border: '1px solid var(--code-orange)' }} onClick={() => setVisao('minhas')}>
          <div className="text-[10px]">Na minha fila</div>
          <div className="text-lg font-bold">{minhaFila}</div>
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-2">
        {MINHA_DIGITACAO.map((c) => (
          <div key={c.id} className="rounded-lg p-2" style={{ background: 'var(--code-surface)', border: '1px solid var(--code-border)' }}>
            <div className="text-[10px]">{c.label}</div>
            <div className="text-lg font-bold">{minha[c.id]}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-1">
        {([
          ['todas', 'Todas'],
          ['minhas', 'Minhas'],
          ['pendentes', 'Pendentes'],
          ['analise', 'Em análise'],
          ['aprovadas', 'Aprovadas'],
          ['pagas', 'Pagas'],
        ] as const).map(([id, label]) => (
          <button key={id} type="button" className="text-[11px] px-2 py-1 rounded" style={{ background: visao === id ? 'var(--code-orange)' : 'var(--code-surface)', color: visao === id ? '#111' : 'inherit', border: '1px solid var(--code-border)' }} onClick={() => setVisao(id)}>{label}</button>
        ))}
        <button type="button" className="text-[11px] px-2 py-1 rounded font-semibold" style={{ background: 'var(--code-orange)', color: '#111' }} onClick={() => setCriar(true)}>+ Nova proposta</button>
      </div>

      {criar && (
        <div className="rounded-lg p-3 space-y-3" style={{ border: '1px solid var(--code-border)', background: 'var(--code-surface)' }}>
          <p className="text-sm font-bold">Nova proposta</p>
          {form.conversaId ? <p className="text-[12px]">Veio do Chat. Cliente, telefone e conversa já entram preenchidos. Nada é enviado ao banco.</p> : null}
          {form.leadId ? <p className="text-[12px]">Veio do Leads Monitor. Lead, cliente e telefone já entram preenchidos. Nada é contratado.</p> : null}
          <p className="text-[11px] font-semibold">Cliente</p>
          <div className="grid md:grid-cols-3 gap-2">
            <TextInput value={form.clienteNome} placeholder="Nome completo" onChange={(e) => setForm({ ...form, clienteNome: e.target.value })} />
            <TextInput value={form.cpf} placeholder="000.000.000-00" onChange={(e) => setForm({ ...form, cpf: mascaraCpf(e.target.value) })} />
            <TextInput value={form.telefone} placeholder="(00) 00000-0000" onChange={(e) => setForm({ ...form, telefone: mascaraTelefone(e.target.value) })} />
            <TextInput type="date" value={form.nascimento} onChange={(e) => setForm({ ...form, nascimento: e.target.value })} />
            <TextInput value={form.cep} placeholder="00000-000" onChange={(e) => void buscarCep(e.target.value)} />
            <TextInput value={form.logradouro} placeholder="Logradouro" onChange={(e) => setForm({ ...form, logradouro: e.target.value })} />
            <TextInput value={form.numero} placeholder="Número" onChange={(e) => setForm({ ...form, numero: e.target.value })} />
            <TextInput value={form.complemento} placeholder="Complemento" onChange={(e) => setForm({ ...form, complemento: e.target.value })} />
            <TextInput value={form.bairro} placeholder="Bairro" onChange={(e) => setForm({ ...form, bairro: e.target.value })} />
            <TextInput value={form.cidade} placeholder="Cidade" onChange={(e) => setForm({ ...form, cidade: e.target.value })} />
            <SelectInput value={form.uf} onChange={(e) => setForm({ ...form, uf: e.target.value })}>
              <option value="">UF</option>
              {UFS_BRASIL.map((u) => <option key={u.uf} value={u.uf}>{u.uf}</option>)}
            </SelectInput>
          </div>
          {cepMsg ? <p className="text-[12px]">{cepMsg}</p> : null}
          <p className="text-[11px] font-semibold">Produto e banco</p>
          <div className="grid md:grid-cols-3 gap-2">
            <SelectInput value={form.produto} onChange={(e) => setForm({ ...form, produto: e.target.value })}>
              <option value="">Produto</option>
              {PRODUTOS_DIGITACAO.map((p) => <option key={p.code} value={p.code}>{p.label}</option>)}
            </SelectInput>
            <SelectInput value={form.banco} onChange={(e) => setForm({ ...form, banco: e.target.value })}>
              <option value="">Banco / adapter</option>
              {BANCOS.map((b) => <option key={b} value={b}>{b}</option>)}
            </SelectInput>
            <TextInput value={form.tipoOperacao} placeholder="Tipo de operação" onChange={(e) => setForm({ ...form, tipoOperacao: e.target.value })} />
          </div>
          {form.banco ? <p className="text-[12px]" style={{ color: 'var(--code-orange)' }}>{MENSAGEM_BANCO_LOCAL}</p> : null}
          <div className="rounded p-2 text-xs" style={{ border: '1px solid var(--code-border)' }}>
            <p>Cliente: {form.clienteNome || '—'}</p>
            <p>Produto: {PRODUTOS_DIGITACAO.find((p) => p.code === form.produto)?.label || '—'}</p>
            <p>Banco: {form.banco || '—'}</p>
            <p>Operação: {form.tipoOperacao || '—'}</p>
          </div>
          <p className="text-[11px] font-semibold">Dados da operação</p>
          <div className="grid md:grid-cols-3 gap-2">
            <TextInput value={form.valorSolicitado} placeholder="R$ 0,00" onChange={(e) => setForm({ ...form, valorSolicitado: e.target.value })} />
            <TextInput value={form.valorLiberado} placeholder="R$ 0,00" onChange={(e) => setForm({ ...form, valorLiberado: e.target.value })} />
            <TextInput value={form.prazo} placeholder="Prazo" onChange={(e) => setForm({ ...form, prazo: e.target.value })} />
            <TextInput value={form.parcela} placeholder="R$ 0,00" onChange={(e) => setForm({ ...form, parcela: e.target.value })} />
            <TextInput value={form.margem} placeholder="R$ 0,00" onChange={(e) => setForm({ ...form, margem: e.target.value })} />
            <TextInput value={form.convenio} placeholder="Convênio" onChange={(e) => setForm({ ...form, convenio: e.target.value })} />
            <SelectInput value={form.origem} onChange={(e) => setForm({ ...form, origem: e.target.value })}>
              <option value="">Origem do lead</option>
              {ORIGENS_LEAD.map((item) => <option key={item} value={item}>{item}</option>)}
            </SelectInput>
            <TextInput value={form.observacoes} placeholder="Observações internas" onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
          </div>
          <p className="text-[11px]">Origem: {rotuloOrigem(form)}</p>
          <p className="text-[11px] font-semibold">Documentos</p>
          {form.documentos.map((item) => (
            <p key={item.id} className="text-[11px]">{item.nome} · {item.tipo} · {item.tamanho} bytes · {quando(item.criadoEm)} · {item.status}</p>
          ))}
          <label className="text-[11px] font-semibold cursor-pointer">
            Anexar documento
            <input className="hidden" type="file" onChange={(e) => {
              const f = e.target.files?.[0]
              if (!f) return
              const tipo = DOCS_ESPERADOS.includes(pendTipo as typeof DOCS_ESPERADOS[number]) ? pendTipo : 'Documento adicional'
              setForm({ ...form, documentos: [...form.documentos, { id: `doc-${Date.now()}`, nome: f.name, tipo, tamanho: f.size, status: 'anexado', criadoEm: new Date().toISOString() }] })
              e.target.value = ''
            }} />
          </label>
          <SelectInput value={pendTipo} onChange={(e) => setPendTipo(e.target.value)}>
            {DOCS_ESPERADOS.map((t) => <option key={t}>{t}</option>)}
          </SelectInput>
          <div className="flex gap-2">
            <GhostButton type="button" onClick={() => void criarProposta()}>Adicionar à fila de digitação</GhostButton>
            <button type="button" className="text-xs" onClick={() => setCriar(false)}>Fechar</button>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-4 gap-2 text-[11px]">
        <TextInput value={busca} placeholder="Nome, telefone, CPF ou proposta" onChange={(e) => setBusca(e.target.value)} />
        <SelectInput value={banco} onChange={(e) => setBanco(e.target.value)}><option value="">Banco</option>{BANCOS.map((b) => <option key={b}>{b}</option>)}</SelectInput>
        <SelectInput value={produto} onChange={(e) => setProduto(e.target.value)}><option value="">Produto</option>{PRODUCT_CATALOG.map((p) => <option key={p.code} value={p.code}>{p.label}</option>)}</SelectInput>
        <SelectInput value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Status</option>{ESTEIRA.map((s) => <option key={s} value={s}>{ESTEIRA_LABEL[s]}</option>)}</SelectInput>
        <TextInput value={operador} placeholder="Operador" onChange={(e) => setOperador(e.target.value)} />
        <TextInput type="date" value={data} onChange={(e) => setData(e.target.value)} />
        <TextInput value={cidade} placeholder="Cidade" onChange={(e) => setCidade(e.target.value)} />
        <TextInput value={origem} placeholder="Origem" onChange={(e) => setOrigem(e.target.value)} />
        <TextInput value={numero} placeholder="Número da proposta" onChange={(e) => setNumero(e.target.value)} />
      </div>

      <div className="flex justify-end">
        <button type="button" className="px-2 py-0.5 rounded-t text-[11px] font-semibold" style={{ border: '1px solid var(--code-border)', borderBottom: 'none', background: 'var(--code-surface)' }} aria-expanded={nomesAbertos} onClick={() => setNomesAbertos((v) => !v)}>
          {nomesAbertos ? '▶ Recolher' : '▼ Abrir'}
        </button>
      </div>
      {nomesAbertos ? <div className="rounded-lg" style={{ border: '1px solid var(--code-border)', overflowX: 'hidden' }}>
        <table className="w-full text-xs">
          <thead>
            <tr>{['Cliente', 'CPF', 'Produto', 'Banco', 'Origem', 'Valor', 'Operador', 'Status', 'Criada em', 'Atualizada em', 'Ações'].map((h) => <th key={h} className="text-left p-2 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {lista.map((item) => (
              <tr key={item.id} style={{ borderTop: '1px solid var(--code-border)' }}>
                <td className="p-2">{textoOuNao(item.clienteNome)}</td>
                <td className="p-2">{cpfMascarado(item.cpf) === '—' ? NAO_INFORMADO : cpfMascarado(item.cpf)}</td>
                <td className="p-2">{PRODUTOS_DIGITACAO.find((p) => p.code === item.produto)?.label || textoOuNao(item.produto)}</td>
                <td className="p-2">{textoOuNao(item.banco)}</td>
                <td className="p-2">{rotuloOrigem(item)}</td>
                <td className="p-2">{moedaBr(item.valorSolicitado ?? item.valor)}</td>
                <td className="p-2">{textoOuNao(item.operadorNome)}</td>
                <td className="p-2">{statusEsteira(item.status) ? ESTEIRA_LABEL[statusEsteira(item.status)!] : textoOuNao(item.status)}</td>
                <td className="p-2 whitespace-nowrap">{quando(item.criadoEm)}</td>
                <td className="p-2 whitespace-nowrap">{quando(item.atualizadoEm)}</td>
                <td className="p-2 whitespace-nowrap">
                  <button type="button" className="mr-2 font-semibold" onClick={() => { setModo('abrir'); setAberta(item.id) }}>Abrir</button>
                  <button type="button" className="mr-2 font-semibold" onClick={() => { setModo('digitar'); setAberta(item.id) }}>Digitar</button>
                  <button type="button" onClick={() => { setModo('historico'); setAberta(item.id) }}>Histórico</button>
                </td>
              </tr>
            ))}
            {lista.length === 0 && <tr><td className="p-3" colSpan={11}>Nenhuma proposta neste filtro.</td></tr>}
          </tbody>
        </table>
      </div> : null}

      <div className="rounded-lg" style={{ border: '1px solid var(--code-border)', overflowX: 'hidden' }}>
        <p className="text-xs font-semibold p-2">Fila de Digitação</p>
        {nomesAbertos ? <table className="w-full text-xs">
          <thead>
            <tr>{['Cliente', 'CPF', 'Produto', 'Banco', 'Origem', 'Valor', 'Operador', 'Status', 'Criada em', 'Atualizada em', 'Ações'].map((h) => <th key={`fila-${h}`} className="text-left p-2 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {fila.map((item) => (
              <tr key={item.id} style={{ borderTop: '1px solid var(--code-border)' }}>
                <td className="p-2">{textoOuNao(item.clienteNome)}</td>
                <td className="p-2">{cpfMascarado(item.cpf) === '—' ? NAO_INFORMADO : cpfMascarado(item.cpf)}</td>
                <td className="p-2">{PRODUTOS_DIGITACAO.find((p) => p.code === item.produto)?.label || textoOuNao(item.produto)}</td>
                <td className="p-2">{textoOuNao(item.banco)}</td>
                <td className="p-2">{rotuloOrigem(item)}</td>
                <td className="p-2">{moedaBr(item.valorSolicitado ?? item.valor)}</td>
                <td className="p-2">{textoOuNao(item.operadorNome)}</td>
                <td className="p-2">{statusEsteira(item.status) ? ESTEIRA_LABEL[statusEsteira(item.status)!] : textoOuNao(item.status)}</td>
                <td className="p-2 whitespace-nowrap">{quando(item.criadoEm)}</td>
                <td className="p-2 whitespace-nowrap">{quando(item.atualizadoEm)}</td>
                <td className="p-2 whitespace-nowrap">
                  <button type="button" className="mr-2 font-semibold" onClick={() => { setModo('abrir'); setAberta(item.id) }}>Abrir</button>
                  <button type="button" className="mr-2 font-semibold" onClick={() => { setModo('digitar'); setAberta(item.id) }}>Digitar</button>
                  <button type="button" onClick={() => { setModo('historico'); setAberta(item.id) }}>Histórico</button>
                </td>
              </tr>
            ))}
            {fila.length === 0 && <tr><td className="p-3" colSpan={11}>Nenhuma proposta aguardando digitação.</td></tr>}
          </tbody>
        </table> : null}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
        <div className="rounded p-2" style={{ border: '1px solid var(--code-border)' }}>Propostas hoje<div className="font-bold">{producao.propostasHoje}</div></div>
        <div className="rounded p-2" style={{ border: '1px solid var(--code-border)' }}>Em digitação<div className="font-bold">{producao.emDigitacao}</div></div>
        <div className="rounded p-2" style={{ border: '1px solid var(--code-border)' }}>Em análise<div className="font-bold">{producao.emAnalise}</div></div>
        <div className="rounded p-2" style={{ border: '1px solid var(--code-border)' }}>Pendências abertas<div className="font-bold">{producao.pendencias}</div></div>
        <div className="rounded p-2" style={{ border: '1px solid var(--code-border)' }}>Aprovadas<div className="font-bold">{producao.aprovadas}</div></div>
        <div className="rounded p-2" style={{ border: '1px solid var(--code-border)' }}>Pagas<div className="font-bold">{producao.pagas}</div></div>
        <div className="rounded p-2" style={{ border: '1px solid var(--code-border)' }}>Finalizadas<div className="font-bold">{producao.finalizadas}</div></div>
        <div className="rounded p-2" style={{ border: '1px solid var(--code-border)' }}>Taxa de aprovação<div className="font-bold">{producao.taxaAprovacao == null ? '—' : `${Math.round(producao.taxaAprovacao * 100)}%`}</div></div>
        <div className="rounded p-2" style={{ border: '1px solid var(--code-border)' }}>Tempo médio em análise<div className="font-bold">{producao.tempoMedioAnaliseHoras == null ? '—' : `${producao.tempoMedioAnaliseHoras.toFixed(1)} h`}</div></div>
      </div>

      {atual && (
        <div className="rounded-lg p-3 space-y-2" style={{ border: '1px solid var(--code-border)' }}>
          <div className="flex justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-bold">Ficha da proposta / digitação</p>
              <div className="mt-1 grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-x-3 gap-y-1 text-[11px]">
                <p><span className="opacity-70">Cliente</span><br />{textoOuNao(atual.clienteNome)}</p>
                <p><span className="opacity-70">CPF</span><br />{cpfMascarado(atual.cpf) === '—' ? NAO_INFORMADO : cpfMascarado(atual.cpf)}</p>
                <p><span className="opacity-70">Telefone</span><br />{atual.telefone ? mascaraTelefone(atual.telefone) : NAO_INFORMADO}</p>
                <p><span className="opacity-70">Produto</span><br />{nomeProduto(atual.produto)}</p>
                <p><span className="opacity-70">Banco</span><br />{textoOuNao(atual.banco)}</p>
                <p><span className="opacity-70">Status</span><br />{statusEsteira(atual.status) ? ESTEIRA_LABEL[statusEsteira(atual.status)!] : textoOuNao(atual.status)}</p>
                <p><span className="opacity-70">Operador</span><br />{textoOuNao(atual.operadorNome)}</p>
              </div>
            </div>
            <button type="button" onClick={() => setAberta(null)}>Fechar</button>
          </div>
          <div className="flex flex-wrap gap-2 text-[11px]">
            <button type="button" className="font-semibold px-2 py-1 rounded" style={{ background: 'var(--code-orange)', color: '#111' }} onClick={() => void assumir(atual)}>Assumir</button>
            <button type="button" className="font-semibold px-2 py-1 rounded" style={{ border: '1px solid var(--code-border)' }} onClick={() => setModo('digitar')}>Digitar</button>
            <button type="button" className="font-semibold px-2 py-1 rounded" style={{ border: '1px solid var(--code-border)' }} onClick={() => setModo('historico')}>Histórico</button>
            <button type="button" className="font-semibold px-2 py-1 rounded" style={{ border: '1px solid var(--code-border)' }} onClick={() => void trocarStatus(atual, 'FINALIZADA_DIGITACAO')}>Marcar como pronta</button>
            <button type="button" className="font-semibold px-2 py-1 rounded" style={{ border: '1px solid var(--code-border)' }} onClick={() => { void trocarStatus(atual, 'DIGITACAO'); toast.success('Registrado na digitação. Nenhum banco foi chamado.') }}>Enviar para digitação</button>
            {atual.conversaId ? <Link className="font-semibold px-2 py-1" to={`/whatsapp?conversa=${atual.conversaId}`}>Ver conversa</Link> : null}
          </div>
          <div className="flex flex-wrap items-center gap-1 text-[10px]">
            {TIMELINE_ESTEIRA.map((etapa, i) => (
              <span key={etapa.id}>
                {i > 0 ? <span className="opacity-40"> → </span> : null}
                <span style={{ fontWeight: i === passo ? 700 : 400, color: i === passo ? 'var(--code-orange)' : 'inherit' }}>{etapa.label}</span>
              </span>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 items-end">
            <SelectInput value={statusEsteira(atual.status) || ''} onChange={(e) => void trocarStatus(atual, e.target.value)}>
              <option value="">Status</option>
              {ESTEIRA.map((s) => <option key={s} value={s}>{ESTEIRA_LABEL[s]}</option>)}
            </SelectInput>
            <TextInput value={obs} placeholder="Observação" onChange={(e) => setObs(e.target.value)} />
          </div>
          <Bloco id="cliente" titulo="Dados do cliente" aberto={Boolean(secoes.cliente)} onToggle={alternar}>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-3 gap-y-1">
              <p>Nome<br />{textoOuNao(atual.clienteNome)}</p>
              <p>CPF<br />{cpfMascarado(atual.cpf) === '—' ? NAO_INFORMADO : cpfMascarado(atual.cpf)}</p>
              <p>Telefone<br />{atual.telefone ? mascaraTelefone(atual.telefone) : NAO_INFORMADO}</p>
              <p>Nascimento<br />{textoOuNao(atual.nascimento)}</p>
              <p>CEP<br />{atual.cep ? mascaraCep(atual.cep) : NAO_INFORMADO}</p>
              <p>UF<br />{textoOuNao(atual.uf)}</p>
              <p>Logradouro<br />{[atual.logradouro, atual.numero, atual.complemento].filter(Boolean).join(', ') || NAO_INFORMADO}</p>
              <p>Bairro<br />{textoOuNao(atual.bairro)}</p>
              <p>Cidade<br />{textoOuNao(atual.cidade)}</p>
            </div>
          </Bloco>
          <Bloco id="operacao" titulo="Produto e operação" aberto={Boolean(secoes.operacao)} onToggle={alternar}>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-x-3 gap-y-1">
              <p>Produto<br />{nomeProduto(atual.produto)}</p>
              <p>Banco / adapter<br />{textoOuNao(atual.banco)}</p>
              <p>Operação<br />{textoOuNao(atual.tipoOperacao)}</p>
              <p>Convênio<br />{textoOuNao(atual.convenio)}</p>
              <p>Valor solicitado<br />{moedaBr(atual.valorSolicitado ?? atual.valor)}</p>
              <p>Valor liberado<br />{moedaBr(atual.valorLiberado)}</p>
              <p>Prazo<br />{textoOuNao(atual.prazo)}</p>
              <p>Parcela<br />{moedaBr(atual.parcela)}</p>
              <p>Margem<br />{moedaBr(atual.margem)}</p>
              <p>Origem<br />{rotuloOrigem(atual)}</p>
              <p className="xl:col-span-2">Observações<br />{textoOuNao(atual.observacoes)}</p>
            </div>
          </Bloco>
          <Bloco id="contrato" titulo="Contrato" aberto={Boolean(secoes.contrato)} onToggle={alternar}>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2 items-end">
              <TextInput value={numeroPropostaBanco} placeholder="Nº proposta" onChange={(e) => setNumeroPropostaBanco(e.target.value)} />
              <TextInput value={numeroContrato} placeholder="Nº contrato" onChange={(e) => setNumeroContrato(e.target.value)} />
              <TextInput value={numeroOperacao} placeholder="Nº operação" onChange={(e) => setNumeroOperacao(e.target.value)} />
              <GhostButton type="button" onClick={() => void salvarContrato(atual)}>Registrar contrato</GhostButton>
            </div>
          </Bloco>
          <Bloco id="documentos" titulo="Documentos" aberto={Boolean(secoes.documentos)} onToggle={alternar}>
            {docsFicha.length === 0 ? <p>Nenhum documento informado.</p> : docsFicha.map((d) => (
              <p key={d.id}>{d.nome} · {d.tipo || NAO_INFORMADO} · {d.tamanho ? `${d.tamanho} bytes` : NAO_INFORMADO} · {quando(d.criadoEm)} · {d.status || NAO_INFORMADO}</p>
            ))}
            <label className="inline-block mt-1 font-semibold cursor-pointer">
              Anexar documento
              <input className="hidden" type="file" onChange={(e) => { const f = e.target.files?.[0]; if (f) void anexar(atual, f, pendTipo); e.target.value = '' }} />
            </label>
          </Bloco>
          <Bloco id="simulacao" titulo="Simulação" aberto={Boolean(secoes.simulacao)} onToggle={alternar}>
            <p>Produto: {nomeProduto(atual.produto)} · Banco: {textoOuNao(atual.banco)}</p>
            {(atual.simulacoes || []).length === 0 ? <p>{SIMULACAO_INDISPONIVEL}</p> : (atual.simulacoes || []).map((s) => (
              <p key={s.id}>{textoOuNao(s.banco)} · valor {moedaBr(s.valor)} · parcela {moedaBr(s.parcela)} · prazo {s.prazo ?? NAO_INFORMADO} · taxa {s.taxa == null ? NAO_INFORMADO : s.taxa}</p>
            ))}
            <GhostButton type="button" onClick={() => simular(atual)}>Simular</GhostButton>
          </Bloco>
          <Bloco
            id="pendencias"
            titulo="Pendências"
            aberto={Boolean(secoes.pendencias)}
            onToggle={alternar}
            extra={<span className="flex items-center gap-2 text-[11px] font-normal whitespace-nowrap"><span>{pendAbertas.length === 0 ? 'Nenhuma pendência.' : `${pendAbertas.length} pendência${pendAbertas.length > 1 ? 's' : ''} aberta${pendAbertas.length > 1 ? 's' : ''}`}</span><button type="button" className="font-semibold" onClick={() => { setNovaPend(true); setSecoes((s) => ({ ...s, pendencias: true })) }}>+ Nova pendência</button></span>}
          >
            {(atual.pendencias || []).length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead><tr>{['Prioridade', 'Motivo', 'Responsável', 'Prazo', 'Status', ''].map((h) => <th key={h} className="text-left font-medium pr-2">{h}</th>)}</tr></thead>
                  <tbody>
                    {(atual.pendencias || []).map((p) => (
                      <tr key={p.id}>
                        <td className="pr-2">{textoOuNao(p.prioridade)}</td>
                        <td className="pr-2">{p.motivo || p.tipo} · {p.descricao}</td>
                        <td className="pr-2">{textoOuNao(p.responsavel)}</td>
                        <td className="pr-2">{textoOuNao(p.prazo)}</td>
                        <td className="pr-2">{p.status === 'RESOLVIDA' ? 'Resolvida' : 'Aberta'}</td>
                        <td>{p.status === 'ABERTA' ? <button type="button" className="font-semibold" onClick={() => void resolver(atual, p.id)}>Resolver</button> : null}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
            {novaPend ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-2 mt-2">
                <TextInput value={pendTipo} placeholder="Motivo" onChange={(e) => setPendTipo(e.target.value)} />
                <TextInput value={pendDesc} placeholder="Descrição" onChange={(e) => setPendDesc(e.target.value)} />
                <TextInput value={pendPrazo} placeholder="Prazo" onChange={(e) => setPendPrazo(e.target.value)} />
                <TextInput value={pendPrioridade} placeholder="Prioridade" onChange={(e) => setPendPrioridade(e.target.value)} />
                <GhostButton type="button" onClick={() => void novaPendencia(atual)}>Salvar pendência</GhostButton>
              </div>
            ) : null}
          </Bloco>
          <Bloco id="historico" titulo="Histórico" aberto={Boolean(secoes.historico)} onToggle={alternar}>
            {(atual.historicoEsteira || []).length === 0 ? <p>{NAO_INFORMADO}</p> : (atual.historicoEsteira || []).map((h, i) => (
              <p key={`${h.dataHora}-${i}`}>{quando(h.dataHora)} — {h.evento || h.observacao || 'Status alterado'} · {textoOuNao(h.operador || h.usuario)}</p>
            ))}
          </Bloco>
          <Bloco id="banco" titulo="Área operacional do banco" aberto={Boolean(secoes.banco)} onToggle={alternar}>
            <p className="mb-2">{prepararBanco({}).mensagem}</p>
            <DetalhesPropostaBox
              embedded
              rec={{ ...atual, cpf: cpfMascarado(atual.cpf) === '—' ? '' : cpfMascarado(atual.cpf) }}
              clienteNome={textoOuNao(atual.clienteNome)}
              historico={(atual.historicoEsteira || []).map((h) => ({ at: toDate(h.dataHora), label: h.evento || h.observacao || h.statusNovo }))}
              onClose={() => alternar('banco')}
            />
          </Bloco>
        </div>
      )}
    </section>
  )
}

import { useEffect, useMemo, useRef, useState } from 'react'
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { storage } from '../firebase'
import { consultarCep } from '../lib/viaCep'
import { X } from 'lucide-react'
import { PRODUCT_TREE } from '../catalog/crmCatalog'
import { digitacaoStatusId, digitacaoStatusLabel, operationLabel, productCatalogLabel } from '../catalog/productCatalog'
import { ErrorBanner, LoadingBlock, PrimaryButton, SelectInput, TextInput } from '../components/nexus/kit'
import { textoMisto } from '../lib/uiPt'
import { useNexusStore } from '../contexts/NexusStore'
import { useToast } from '../components/ui/Toast'
import { useEscLayer } from '../hooks/useEscLayer'
import { toDate } from '../lib/nexusCore'
import { INSTITUTION_ADAPTERS, simulateAdapters } from '../integrations/banks/registry'
import { ingestSimulationResult } from '../modules/digitacao/simulationToDigitacao'
import {
  buildHistory,
  buildPendencias,
  displayOperationalStatus,
  findExactCliente,
  formatMoney,
  formatPrazo,
  hasSignatureBlock,
  isCompleteCpf,
  docsForProposal,
  documentOpenUrl,
  type DeskRecord,
} from '../modules/digitacao/digitacaoDesk'
import { aplicarEnderecoCep, statusEsteira } from '../modules/digitacao/producaoEsteira'
import type { NexusCliente } from '../types/nexus'
import './digitacaoDesk.css'

const SITUACOES = [
  'Em digitação',
  'Em análise',
  'Aguardando averbação',
  'Aguardando assinatura',
  'Proposta finalizada',
  'Pendência',
  'Aprovada',
  'Paga',
] as const

const OPERACOES_INSS = [
  { code: 'PORTABILIDADE', label: 'Portabilidade' },
  { code: 'REFINANCIAMENTO', label: 'Refinanciamento' },
  { code: 'NOVA_MARGEM', label: 'Nova Margem' },
  { code: 'CARTAO_RMC', label: 'Cartão RMC' },
  { code: 'CARTAO_RCC', label: 'Cartão RCC' },
  { code: 'REDUCAO_PARCELA', label: 'Redução de Parcela' },
] as const

function operacoesDoProduto(codigo: string) {
  if (codigo === 'INSS') return OPERACOES_INSS
  const item = PRODUCT_TREE.find((p) => p.code === codigo)
  if (!item) return []
  return [{ code: item.code, label: item.nome }]
}

function classeSituacao(value: string) {
  const s = value.toLowerCase()
  if (/paga|pago/.test(s)) return 'sit-paga'
  if (/pend/.test(s)) return 'sit-rosa'
  if (/averb/.test(s)) return 'sit-rosa-2'
  if (/assinatura/.test(s)) return 'sit-roxo'
  if (/an[aá]lise/.test(s)) return 'sit-roxo-2'
  if (/aprov/.test(s)) return 'sit-amarelo'
  if (/finaliz/.test(s)) return 'sit-amarelo-2'
  if (/digit/.test(s)) return 'sit-amarelo-3'
  return ''
}

function situacaoAtual(rec: DeskRecord): (typeof SITUACOES)[number] | '' {
  const s = `${rec.status || ''} ${rec.statusProposta || ''} ${rec.averbacao || ''}`.toLowerCase()
  if (/finaliz/.test(s)) return 'Proposta finalizada'
  if (/assinatura/.test(s)) return 'Aguardando assinatura'
  if (/averb/.test(s)) return 'Aguardando averbação'
  if (/pend/.test(s)) return 'Pendência'
  if (/paga|pago/.test(s)) return 'Paga'
  if (/aprov/.test(s)) return 'Aprovada'
  if (/an[aá]lise/.test(s)) return 'Em análise'
  if (/digit/.test(s)) return 'Em digitação'
  const direto = SITUACOES.find((item) => item.toLowerCase() === String(rec.status || '').trim().toLowerCase())
  return direto || ''
}

function vista(value: unknown): string {
  if (value == null) return ''
  const s = String(value).trim()
  if (!s || /^n[aã]o informado\.?$/i.test(s) || /^aguardando api$/i.test(s)) return ''
  return s
}

function mascaraCpf(value: string) {
  const d = value.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

function mascaraTelefone(value: string) {
  const d = value.replace(/\D/g, '').slice(0, 11)
  if (!d) return ''
  if (d.length <= 2) return `(${d}`
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

function mascaraCep(value: string) {
  const d = value.replace(/\D/g, '').slice(0, 8)
  if (d.length <= 5) return d
  return `${d.slice(0, 5)}-${d.slice(5)}`
}

function mascaraMedida(value: string, casas: number, tipo: 'moeda' | 'percentual' | 'coeficiente') {
  const raw = String(value || '').trim()
  if (!raw) return ''
  const fator = 10 ** casas
  const formatar = (n: number) => {
    if (tipo === 'moeda') return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    const corpo = n.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })
    return tipo === 'percentual' ? `${corpo}%` : corpo
  }
  const jaFormatado = /r\$/i.test(raw) || raw.includes('%') || raw.includes(',')
  if (jaFormatado) {
    const d = raw.replace(/\D/g, '')
    if (!d) return ''
    return formatar(Number(d) / fator)
  }
  if (/^-?\d+(\.\d+)?$/.test(raw)) return formatar(Number(raw))
  const d = raw.replace(/\D/g, '')
  if (!d) return ''
  return formatar(Number(d) / fator)
}

function mascaraMoeda(value: string) {
  return mascaraMedida(value, 2, 'moeda')
}

function mascaraTaxa(value: string) {
  return mascaraMedida(value, 2, 'percentual')
}

function mascaraCoeficiente(value: string) {
  return mascaraMedida(value, 6, 'coeficiente')
}

function dataExibicao(value: unknown) {
  const iso = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return `${iso[3]}-${iso[2]}-${iso[1]}`
  const d = toDate(value)
  if (d) {
    const dia = String(d.getDate()).padStart(2, '0')
    const mes = String(d.getMonth() + 1).padStart(2, '0')
    return `${dia}-${mes}-${d.getFullYear()}`
  }
  return mascaraData(vista(value))
}

function mascaraData(value: string) {
  const iso = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/)
  const d = (iso ? `${iso[3]}${iso[2]}${iso[1]}` : String(value || '').replace(/\D/g, '')).slice(0, 8)
  if (d.length <= 2) return d
  if (d.length <= 4) return `${d.slice(0, 2)}-${d.slice(2)}`
  return `${d.slice(0, 2)}-${d.slice(2, 4)}-${d.slice(4)}`
}

function ObsCampo({ value, onCommit }: { value: string; onCommit: (value: string) => void }) {
  const [text, setText] = useState(value)
  useEffect(() => setText(value), [value])
  return (
    <label className="ficha-campo ficha-obs">
      <span className="desk-label">Observação</span>
      <textarea
        className="ficha-input ficha-obs-input"
        rows={3}
        value={text}
        placeholder="Observação da proposta"
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          if (text.trim() !== value.trim()) onCommit(text.trim())
        }}
      />
    </label>
  )
}

function FieldRow({
  label,
  value,
  onCommit,
  mask,
  liveDigits,
}: {
  label: string
  value: string
  onCommit?: (value: string) => void
  mask?: (value: string) => string
  liveDigits?: number
}) {
  const clean = mask ? mask(vista(value)) : vista(value)
  const [text, setText] = useState(clean)
  useEffect(() => setText(clean), [clean])
  return (
    <label className="ficha-campo">
      <span className="desk-label">{label}</span>
      {onCommit ? (
        <input
          className="ficha-input"
          value={text}
          inputMode={mask ? 'numeric' : undefined}
          onChange={(e) => {
            const next = mask ? mask(e.target.value) : e.target.value
            setText(next)
            if (liveDigits && next.replace(/\D/g, '').length === liveDigits && next !== clean) onCommit(next)
          }}
          onBlur={(e) => {
            const next = mask ? mask(e.currentTarget.value) : e.currentTarget.value.trim()
            if (next !== clean) onCommit(next)
          }}
        />
      ) : (
        <div className="desk-value">{clean}</div>
      )}
    </label>
  )
}

function moneyCell(v: unknown) {
  const s = formatMoney(v)
  return vista(s)
}

function urlBanco(...vals: unknown[]): string {
  for (const v of vals) {
    const s = String(v || '').trim()
    if (/^https?:\/\//i.test(s)) return s
  }
  return ''
}

function nomeHomolog(v: unknown) {
  return /lead\s+homolog/i.test(String(v || '')) || /^cliente$/i.test(String(v || '').trim())
}

function cascaVazia(item: DeskRecord) {
  const nome = vista(item.clienteNome)
  const cpf = String(item.cpf || '').replace(/\D/g, '')
  const proposta = vista(item.protocolo || item.numeroProposta)
  return !nome && !cpf && !proposta
}

function bancoToke(v: unknown) {
  return /toke\s*real/i.test(String(v || ''))
}

function incluidoPelaMesa(item: DeskRecord) {
  return item.incluidoNaMesa === true
}

function registroFalso(item: DeskRecord) {
  const blob = `${item.clienteNome || ''} ${item.banco || ''} ${item.instituicao || ''} ${item.produto || ''} ${item.origem || ''} ${item.protocolo || ''} ${item.numeroProposta || ''}`
  if (/homolog|demo|mock|fict[ií]c|exemplo|toke\s*real|\bteste\b/i.test(blob)) return true
  if (nomeHomolog(item.clienteNome)) return true
  if (cascaVazia(item)) return true
  const cpf = String(item.cpf || '').replace(/\D/g, '')
  if (cpf && /^(\d)\1{10}$/.test(cpf)) return true
  return false
}

type FocoFicha = 'cliente' | 'operacao' | 'proposta' | 'retorno' | 'pendencias' | 'documentos' | 'historico'

function grupoResumo(item: DeskRecord): '' | 'digitacao' | 'analise' | 'pendencia' | 'aprovada' | 'paga' {
  const st = statusEsteira(item.status)
  if (st === 'DIGITACAO' || st === 'EM_DIGITACAO' || st === 'AGUARDANDO_DIGITACAO' || st === 'SIMULACAO') return 'digitacao'
  if (st === 'EM_ANALISE') return 'analise'
  if (st === 'PENDENCIA') return 'pendencia'
  if (st === 'APROVADA') return 'aprovada'
  if (st === 'PAGA') return 'paga'
  const id = digitacaoStatusId(String(item.status || ''))
  if (id === 'em_analise') return 'analise'
  if (id === 'aprovado') return 'aprovada'
  const texto = String(item.status || '').toLowerCase()
  if (/digit/.test(texto)) return 'digitacao'
  if (/an[aá]lise/.test(texto)) return 'analise'
  if (/pend/.test(texto)) return 'pendencia'
  if (/aprov/.test(texto)) return 'aprovada'
  if (/paga|pago/.test(texto)) return 'paga'
  return ''
}

function diaIso(value: unknown): string {
  const d = toDate(value)
  if (!d) return ''
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${dia}`
}

export default function Digitacao() {
  const { propostas, digitacoes, clientes, documentos, contratos, auditoria } = useNexusStore()
  const toast = useToast()
  const [q, setQ] = useState('')
  const [produto, setProduto] = useState('')
  const [operacao, setOperacao] = useState('')
  const [instituicao, setInstituicao] = useState('')
  const [pagina, setPagina] = useState(0)
  const [estado, setEstado] = useState('')
  const [municipio, setMunicipio] = useState('')
  const [busy, setBusy] = useState(false)
  const [resultados, setResultados] = useState<Awaited<ReturnType<typeof simulateAdapters>>>([])
  const [clienteId, setClienteId] = useState<string | null>(null)
  const [ocultarCliente, setOcultarCliente] = useState(false)
  const [ficha, setFicha] = useState<{ rec: DeskRecord; foco: FocoFicha; nova?: boolean } | null>(null)
  const [selecionadaId, setSelecionadaId] = useState<string | null>(null)
  const [menuId, setMenuId] = useState<string | null>(null)
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null)
  const [filtroSituacao, setFiltroSituacao] = useState('')
  const [filtroData, setFiltroData] = useState('')
  const [busca, setBusca] = useState('')
  const tableRef = useRef<HTMLDivElement>(null)
  const cepBuscado = useRef('')

  const cliente = clientes.items.find((c) => c.id === clienteId) || null

  useEffect(() => {
    setOcultarCliente(false)
  }, [q])

  useEffect(() => {
    if (!isCompleteCpf(q) || ocultarCliente) {
      if (ocultarCliente || !isCompleteCpf(q)) setClienteId(null)
      return
    }
    const hit = findExactCliente(clientes.items, q)
    setClienteId(hit ? hit.id : null)
  }, [q, clientes.items, ocultarCliente])

  const cadastros = useMemo(
    () => (digitacoes.items as DeskRecord[]).filter((d) => !registroFalso(d) && !bancoToke(`${d.banco || ''} ${d.instituicao || ''} ${d.produto || ''}`)),
    [digitacoes.items],
  )

  const base = useMemo(
    () => cadastros.filter((d) => incluidoPelaMesa(d)),
    [cadastros],
  )

  const resumo = useMemo(() => {
    const contagem = { total: base.length, digitacao: 0, analise: 0, pendencia: 0, aprovada: 0, paga: 0 }
    for (const item of base) {
      const grupo = grupoResumo(item)
      if (grupo) contagem[grupo] += 1
    }
    return contagem
  }, [base])

  const fila = useMemo(() => {
    const texto = busca.trim().toLowerCase()
    const digitos = busca.replace(/\D/g, '')
    const origem = texto ? cadastros : base
    return origem.filter((item) => {
      if (filtroSituacao && grupoResumo(item) !== filtroSituacao) return false
      if (filtroData && diaIso(item.criadoEm) !== filtroData) return false
      if (texto) {
        const cpf = String(item.cpf || '').replace(/\D/g, '')
        const tels = [item.telefone, item.whatsapp].map((v) => String(v || '').replace(/\D/g, ''))
        const alvo = `${item.clienteNome || ''} ${item.protocolo || ''} ${item.numeroProposta || ''} ${item.telefone || ''} ${item.whatsapp || ''}`.toLowerCase()
        const bateNumero = Boolean(digitos) && (cpf.includes(digitos) || tels.some((t) => t.includes(digitos)))
        if (!alvo.includes(texto) && !bateNumero) return false
      }
      return true
    })
  }, [base, cadastros, filtroSituacao, filtroData, busca])

  useEffect(() => {
    setPagina(0)
  }, [filtroSituacao, filtroData, busca])

  function abrirFicha(rec: DeskRecord, foco: FocoFicha, nova = false) {
    setMenuId(null)
    setSelecionadaId(rec.id === 'nova' ? null : rec.id)
    setFicha({ rec, foco, nova })
  }

  function novaProposta() {
    abrirFicha({ id: 'nova', status: 'Em digitação' }, 'proposta', true)
  }

  function escolherProposta(lista: DeskRecord[]) {
    if (!lista.length) return undefined
    const emDigitacao = lista.filter((d) => grupoResumo(d) === 'digitacao' || /digit/i.test(String(d.status || '')))
    const pool = emDigitacao.length ? emDigitacao : lista
    return [...pool].sort((a, b) => {
      const ta = toDate(a.atualizadoEm || a.criadoEm)?.getTime() || 0
      const tb = toDate(b.atualizadoEm || b.criadoEm)?.getTime() || 0
      return tb - ta
    })[0]
  }

  function abrirPropostaExistente(hit: DeskRecord) {
    abrirFicha(hit, 'proposta')
    const st = vista(hit.status) || 'proposta existente'
    toast.success(`Proposta encontrada: ${st}`)
  }

  function abrirDoCliente(cli: NexusCliente) {
    const cpf = String(cli.cpf || '').replace(/\D/g, '')
    const hit = escolherProposta(cadastros.filter((d) => String(d.clienteId || '') === cli.id || (cpf.length === 11 && String(d.cpf || '').replace(/\D/g, '') === cpf)))
    if (hit) {
      abrirPropostaExistente(hit)
      return
    }
    abrirFicha({
      id: 'nova',
      status: 'Em digitação',
      clienteId: cli.id,
      clienteNome: cli.nome || '',
      cpf: cli.cpf || '',
      telefone: cli.telefone || cli.whatsapp || '',
    }, 'cliente', true)
    toast.success('Cliente encontrado. Ainda não há proposta cadastrada.')
  }

  function buscarCliente(valor: string) {
    const digits = valor.replace(/\D/g, '')
    const texto = valor.trim().toLowerCase()
    if (!digits && !texto) {
      toast.error('Informe o nome, CPF, telefone ou proposta.')
      return
    }
    const telefoneBate = (item: { telefone?: string; whatsapp?: string }) => {
      const tels = [item.telefone, item.whatsapp].map((v) => String(v || '').replace(/\D/g, ''))
      return tels.some((tel) => tel && (tel === digits || tel.endsWith(digits)))
    }
    if (/[a-z]/i.test(valor)) {
      const porNome = clientes.items.filter((c) => String(c.nome || '').toLowerCase().includes(texto))
      const exato = porNome.filter((c) => String(c.nome || '').trim().toLowerCase() === texto)
      const escolhidos = exato.length ? exato : porNome
      if (escolhidos.length === 1) {
        abrirDoCliente(escolhidos[0])
        return
      }
      const proposta = escolherProposta(cadastros.filter((d) => {
        const nome = String(d.clienteNome || '').toLowerCase()
        const numero = String(d.protocolo || d.numeroProposta || '').trim().toLowerCase()
        return nome.includes(texto) || (numero && (numero === texto || numero.includes(texto)))
      }))
      if (proposta) {
        abrirPropostaExistente(proposta)
        return
      }
      if (escolhidos.length > 1) {
        toast.error('Há mais de um cliente com esse nome. Informe o CPF.')
        return
      }
      toast.error('Cliente não encontrado.')
      return
    }
    if (digits.length === 10 || digits.length === 11) {
      const proposta = escolherProposta(cadastros.filter((d) => {
        const cpf = String(d.cpf || '').replace(/\D/g, '')
        return (digits.length === 11 && cpf === digits) || telefoneBate(d)
      }))
      if (proposta) {
        abrirPropostaExistente(proposta)
        return
      }
      const cli = digits.length === 11
        ? findExactCliente(clientes.items, valor) || clientes.items.find((c) => telefoneBate(c))
        : clientes.items.find((c) => telefoneBate(c))
      if (!cli) {
        toast.error(digits.length === 11 ? 'Não existe cadastro para este CPF ou telefone.' : 'Não existe cadastro para este telefone.')
        return
      }
      abrirDoCliente(cli)
      return
    }
    const proposta = escolherProposta(cadastros.filter((d) => {
      const numero = String(d.protocolo || d.numeroProposta || '').trim().toLowerCase()
      return numero && (numero === texto || numero.includes(texto))
    }))
    if (!proposta) {
      toast.error('Não existe cadastro para esta proposta.')
      return
    }
    abrirPropostaExistente(proposta)
  }

  async function marcarEtapa(label: string) {
    if (!ficha) return
    const patch: Record<string, string> = { status: label }
    if (label === 'Aguardando averbação') patch.averbacao = 'Aguardando averbação'
    try {
      if (ficha.nova || ficha.rec.id === 'nova') {
        const criado = await digitacoes.create({ ...ficha.rec, ...patch, incluidoNaMesa: true, id: undefined } as never)
        setFicha({ rec: { ...ficha.rec, ...patch, incluidoNaMesa: true, id: criado }, foco: ficha.foco })
        setSelecionadaId(criado)
      } else {
        await digitacoes.update(ficha.rec.id, patch)
        setFicha((cur) => (cur ? { ...cur, rec: { ...cur.rec, ...patch }, nova: false } : cur))
      }
      toast.success('Proposta salva')
    } catch {
      toast.error('Não foi possível salvar a proposta')
    }
  }

  async function salvarProposta(campo: string, valor: string) {
    if (!ficha) return
    setFicha((cur) => (cur ? { ...cur, rec: { ...cur.rec, [campo]: valor } } : cur))
    if (ficha.nova || ficha.rec.id === 'nova') return
    try {
      await digitacoes.update(ficha.rec.id, { [campo]: valor })
    } catch {
      toast.error('Não foi possível salvar o campo')
    }
  }

  async function adicionarDocumento(file: File) {
    if (!ficha || ficha.nova || ficha.rec.id === 'nova') {
      toast.error('Salve a proposta antes de adicionar o documento.')
      return
    }
    const empresaId = documentos.empresaId
    if (!empresaId) {
      toast.error('Empresa não identificada para salvar o arquivo.')
      return
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error('Arquivo acima de 8 MB.')
      return
    }
    const safe = file.name.replace(/[^\w.\-]+/g, '_')
    const path = `empresas/${empresaId}/digitacao/${ficha.rec.id}/${Date.now()}_${safe}`
    try {
      const stored = ref(storage, path)
      await uploadBytes(stored, file)
      const arquivoUrl = await getDownloadURL(stored)
      await documentos.create({
        propostaId: ficha.rec.id,
        digitacaoId: ficha.rec.id,
        clienteId: ficha.rec.clienteId || '',
        clienteNome: ficha.rec.clienteNome || '',
        nome: file.name,
        categoria: 'documento',
        origem: 'digitacao',
        status: 'anexado',
        tamanho: file.size,
        tipoArquivo: file.type,
        arquivoUrl,
        storagePath: path,
      } as never)
      toast.success('Documento adicionado')
    } catch {
      toast.error('Não foi possível adicionar o documento.')
    }
  }

  async function salvarCpf(valor: string) {
    const masked = mascaraCpf(valor)
    await salvarProposta('cpf', masked)
    const id = String(ficha?.rec.clienteId || '')
    const alvo = clientes.items.find((c) => c.id === id)
    if (!alvo) return
    try {
      await clientes.update(alvo.id, { cpf: masked } as Partial<NexusCliente>)
    } catch {
      toast.error('Não foi possível salvar o CPF')
    }
  }

  async function salvarCliente(campo: string, valor: string) {
    const id = String(ficha?.rec.clienteId || '')
    const alvo = clientes.items.find((c) => c.id === id)
    if (!alvo) {
      const noRegistro: Record<string, string> = {
        nome: 'clienteNome',
        telefone: 'telefone',
        whatsapp: 'whatsapp',
        email: 'email',
        dataNascimento: 'dataNascimento',
        cep: 'cep',
        endereco: 'endereco',
        bairro: 'bairro',
        cidade: 'cidade',
        estado: 'uf',
      }
      const campoDig = noRegistro[campo]
      if (campoDig) await salvarProposta(campoDig, valor)
      return
    }
    try {
      await clientes.update(alvo.id, { [campo]: valor } as Partial<NexusCliente>)
      if (campo === 'nome') await salvarProposta('clienteNome', valor)
      if (campo === 'telefone') await salvarProposta('telefone', valor)
      const espelho: Record<string, string> = {
        dataNascimento: 'dataNascimento',
        cep: 'cep',
        endereco: 'endereco',
        bairro: 'bairro',
        cidade: 'cidade',
        estado: 'uf',
      }
      if (espelho[campo]) await salvarProposta(espelho[campo], valor)
    } catch {
      toast.error('Não foi possível salvar o cliente')
    }
  }

  async function buscarCep(valor: string) {
    const masked = mascaraCep(valor)
    const digits = masked.replace(/\D/g, '')
    const chave = `${ficha?.rec.id || ''}:${digits}`
    if (digits.length === 8 && cepBuscado.current === chave) {
      await salvarCliente('cep', masked)
      return
    }
    if (digits.length === 8) cepBuscado.current = chave
    await salvarCliente('cep', masked)
    if (digits.length !== 8) return
    const id = String(ficha?.rec.clienteId || '')
    const alvo = clientes.items.find((c) => c.id === id)
    try {
      const resposta = await consultarCep(digits)
      const aplicado = aplicarEnderecoCep(
        {
          logradouro: String(alvo?.endereco || ficha?.rec.endereco || ''),
          bairro: String(alvo?.bairro || ficha?.rec.bairro || ''),
          cidade: String(alvo?.cidade || ficha?.rec.cidade || ''),
          uf: String(ficha?.rec.uf || alvo?.estado || ''),
        },
        resposta.ok ? resposta : { ok: false },
      )
      if (!aplicado.ok) {
        cepBuscado.current = ''
        toast.error(aplicado.mensagem || resposta.erro || 'CEP não encontrado.')
        return
      }
      const endereco = aplicado.endereco
      if (endereco.logradouro) await salvarCliente('endereco', endereco.logradouro)
      if (endereco.bairro) await salvarCliente('bairro', endereco.bairro)
      if (endereco.cidade) await salvarCliente('cidade', endereco.cidade)
      if (endereco.uf) await salvarCliente('estado', endereco.uf)
      toast.success('Endereço encontrado pelo CEP')
    } catch {
      cepBuscado.current = ''
      toast.error('CEP não encontrado.')
    }
  }

  const porPagina = 25
  const paginas = Math.max(1, Math.ceil(fila.length / porPagina))
  const paginaAtual = Math.min(pagina, paginas - 1)
  const filaPagina = fila.slice(paginaAtual * porPagina, paginaAtual * porPagina + porPagina)

  async function simularEEnviar() {
    setBusy(true)
    try {
      const cpfDigits = q.replace(/\D/g, '')
      const cli =
        cliente ||
        clientes.items.find((c) => String(c.cpf || '').replace(/\D/g, '') === cpfDigits) ||
        undefined
      const adapters = instituicao
        ? INSTITUTION_ADAPTERS.filter((a) => a.name === instituicao)
        : INSTITUTION_ADAPTERS
      const offers = await simulateAdapters(adapters, {
        cpf: cli?.cpf || q,
        produto,
        operacao,
        clienteId: cli?.id,
        clienteNome: String(cli?.nome || ''),
        origem: 'digitacao',
      })
      setResultados(offers)
      const recebidas = offers.filter((o) => o.status === 'Dados retornados pela instituição')
      if (!recebidas.length) {
        toast.success('Nenhuma instituição devolveu dados. Nada foi inventado e nenhuma proposta nova foi criada.')
        return
      }
      const existingKeys = new Set(
        digitacoes.items.map((d) =>
          [d.clienteId || 'sem-cliente', d.banco, d.produto, d.operacao].join(':').toLowerCase()
        )
      )
      let criadas = 0
      for (const offer of recebidas) {
        const packed = ingestSimulationResult({
          offer,
          clienteId: cli?.id,
          clienteNome: String(cli?.nome || ''),
          cpf: String(cli?.cpf || q),
          existingDigitacaoKey: existingKeys.has(
            [cli?.id || 'sem-cliente', offer.banco, offer.produto, offer.operacao].join(':').toLowerCase()
          )
            ? [cli?.id || 'sem-cliente', offer.banco, offer.produto, offer.operacao].join(':').toLowerCase()
            : null,
        })
        if (packed.reused) continue
        await propostas.create(packed.proposta as any)
        await digitacoes.create({ ...packed.digitacao, estado, municipio } as any)
        criadas += 1
      }
      toast.success(criadas ? `${criadas} proposta(s) na Digitação` : 'Já existiam na Digitação (idempotente)')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha na simulação')
    } finally {
      setBusy(false)
    }
  }

  if (digitacoes.loading || clientes.loading) return <LoadingBlock label="Carregando digitação..." />

  return (
    <div className="digitacao-desk mesa">
      <div className="mesa-titulo">
        <div>
          <h1>Central de Digitação</h1>
          <p>Mesa operacional de propostas e digitação.</p>
        </div>
        <div className="mesa-acoes">
          <button type="button" className="acao-mesa" onClick={novaProposta}>+ Nova proposta</button>
        </div>
        <div className="resumo-linha" role="status">
          {([
            ['', 'Total', resumo.total],
            ['digitacao', 'Em digitação', resumo.digitacao],
            ['analise', 'Em análise', resumo.analise],
            ['pendencia', 'Pendências', resumo.pendencia],
            ['aprovada', 'Aprovadas', resumo.aprovada],
            ['paga', 'Pagas', resumo.paga],
          ] as const).map(([id, label, n]) => (
            <button key={label} type="button" className={filtroSituacao === id ? 'on' : ''} onClick={() => setFiltroSituacao(id)}>{label} {n}</button>
          ))}
        </div>
      </div>
      <ErrorBanner message={digitacoes.error || clientes.error} />

      <div className="desk-card mesa-barra">
        <div className="flex flex-wrap gap-2 items-end">
          <label className="desk-label campo-cpf">
            CPF, proposta ou telefone
            <TextInput
              value={q}
              placeholder="000.000.000-00, proposta ou (00) 00000-0000"
              autoComplete="off"
              className="!py-1.5 !text-xs"
              onChange={(e) => {
                const raw = e.target.value
                const digits = raw.replace(/\D/g, '')
                const proposta = /[a-z]/i.test(raw) || digits.length > 11
                const masked = proposta ? raw : digits.length === 11 ? mascaraCpf(digits) : digits.length === 10 ? mascaraTelefone(digits) : digits
                setQ(masked)
                if (!digits && !raw.trim()) setClienteId(null)
              }}
            />
          </label>
          <label className="desk-label">Produto
            <SelectInput className="!py-1.5 !text-xs" value={produto} onChange={(e) => {
              const code = e.target.value
              setProduto(code)
              setOperacao(code && code !== 'INSS' ? code : '')
            }}>
              <option value="">Todos</option>
              {PRODUCT_TREE.map((p) => (
                <option key={p.code} value={p.code}>{p.nome}</option>
              ))}
            </SelectInput>
          </label>
          <label className="desk-label">Operação
            <SelectInput className="!py-1.5 !text-xs" value={operacao} onChange={(e) => setOperacao(e.target.value)}>
              <option value="">Todas</option>
              {operacoesDoProduto(produto).map((o) => (
                <option key={o.code} value={o.code}>{o.label}</option>
              ))}
            </SelectInput>
          </label>
          <label className="desk-label">Instituição
            <SelectInput className="!py-1.5 !text-xs" value={instituicao} onChange={(e) => setInstituicao(e.target.value)}>
              <option value="">Todas</option>
              {INSTITUTION_ADAPTERS.map((a) => (
                <option key={a.id} value={a.name}>{a.name}</option>
              ))}
            </SelectInput>
          </label>
          <PrimaryButton type="button" className="!py-1.5 !text-xs" onClick={() => buscarCliente(q)}>
            Consultar
          </PrimaryButton>
        </div>
      </div>

      {resultados.length > 0 && (
        <p className="text-[12px]" style={{ color: 'var(--code-muted)' }}>
          {resultados.filter((o) => !bancoToke(o.banco)).map((o) => `${o.banco}: ${o.status}`).join(' · ')}
        </p>
      )}

      <div className="desk-card mesa-barra">
        <div className="flex flex-wrap gap-2 items-end">
          <label className="desk-label">Data
            <TextInput className="!py-1.5 !text-xs" type="date" value={filtroData} onChange={(e) => setFiltroData(e.target.value)} />
          </label>
          <label className="desk-label campo-cpf">
            Busca
            <TextInput
              className="!py-1.5 !text-xs"
              value={busca}
              placeholder="Nome, CPF, telefone ou proposta"
              autoComplete="off"
              onChange={(e) => {
                const raw = e.target.value
                const digits = raw.replace(/\D/g, '')
                const texto = /[a-z]/i.test(raw) || digits.length > 11
                setBusca(texto ? raw : digits.length === 11 ? mascaraCpf(digits) : digits.length === 10 ? mascaraTelefone(digits) : digits)
              }}
              onKeyDown={(e) => { if (e.key === 'Enter') buscarCliente(busca) }}
            />
          </label>
          <PrimaryButton type="button" className="!py-1.5 !text-xs" onClick={() => buscarCliente(busca)}>
            Buscar cliente
          </PrimaryButton>
        </div>
      </div>

      <div className="desk-card tabela">
        <div className="desk-table-wrap" ref={tableRef}>
          {fila.length === 0 ? (
            <p className="p-4 text-[12px]" style={{ color: 'var(--code-muted)' }}>Nenhum registro nesta fila.</p>
          ) : (
            <table className="desk-table">
              <thead>
                <tr>
                  <th>Menu</th>
                  <th>Inclusão</th>
                  <th>Proposta</th>
                  <th>CPF</th>
                  <th>Nome</th>
                  <th>Tipo</th>
                  <th>Bruto</th>
                  <th>Líquido</th>
                  <th>Prazo</th>
                  <th>Parcela</th>
                  <th>Situação</th>
                  <th>Averbação</th>
                  <th>Último histórico</th>
                  <th>Produto</th>
                  <th>Instituição</th>
                  <th>Vendedor</th>
                  <th>Contrato</th>
                  <th>Data</th>
                  <th>Telefone</th>
                </tr>
              </thead>
              <tbody>
                {filaPagina.map((item) => {
                  const averb = digitacaoStatusId(String(item.averbacao || item.statusAverbacao || ''))
                  const nome = textoMisto(vista(item.clienteNome))
                  const formalizacao = urlBanco(item.linkFormalizacao, item.formalizacaoUrl, item.linkAssinatura, item.assinaturaUrl)
                  const pdfContrato = urlBanco(item.contratoPdf, item.pdfUrl, item.linkContrato, item.contratoUrl, item.arquivoContrato)
                  return (
                    <tr key={item.id} className={selecionadaId === item.id ? 'sel' : ''} onClick={() => setSelecionadaId(item.id)}>
                      <td className="menu-linha" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className="menu-linha-btn"
                          aria-label="Menu da proposta"
                          onClick={(e) => {
                            const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
                            setMenuPos({ top: r.bottom + 4, left: r.left })
                            setMenuId((cur) => (cur === item.id ? null : item.id))
                          }}
                        >≡</button>
                        <button type="button" className="acao-linha" onClick={() => abrirFicha(item, 'operacao')}>Digitar</button>
                        <button type="button" className="acao-linha sec" onClick={() => abrirFicha(item, 'proposta')}>Abrir</button>
                        {menuId === item.id && menuPos && (
                          <div className="menu-linha-pop" style={{ top: menuPos.top, left: menuPos.left }}>
                            <button type="button" onClick={() => abrirFicha(item, 'proposta')}>Abrir</button>
                            <button type="button" onClick={() => abrirFicha(item, 'proposta')}>Detalhes</button>
                            <button type="button" onClick={() => abrirFicha(item, 'operacao')}>Digitar</button>
                            <button type="button" onClick={() => abrirFicha(item, 'historico')}>Histórico</button>
                            <button type="button" onClick={() => abrirFicha(item, 'pendencias')}>Pendências</button>
                            <button type="button" onClick={() => abrirFicha(item, 'documentos')}>Documentos</button>
                            {formalizacao ? <a href={formalizacao} target="_blank" rel="noreferrer">Link de formalização</a> : null}
                            {pdfContrato ? <a href={pdfContrato} target="_blank" rel="noreferrer">Contrato em PDF</a> : null}
                          </div>
                        )}
                      </td>
                      <td>{toDate(item.criadoEm)?.toLocaleDateString('pt-BR') || ''}</td>
                      <td title={vista(item.protocolo || item.numeroProposta)}>{vista(item.protocolo || item.numeroProposta)}</td>
                      <td className="cpf">{item.cpf ? mascaraCpf(String(item.cpf)) : ''}</td>
                      <td title={nome}>{nome}</td>
                      <td>{operationLabel(String(item.operacao || ''))}</td>
                      <td className="num">{moneyCell(item.valorBruto ?? item.valor)}</td>
                      <td className="num">{moneyCell(item.valorLiberado)}</td>
                      <td className="num">{vista(formatPrazo(item.prazo))}</td>
                      <td className="num">{moneyCell(item.parcela)}</td>
                      <td>{(() => {
                        const rotulo = digitacaoStatusLabel(String(item.status || '')) || vista(displayOperationalStatus(item))
                        return rotulo ? <span className={`nx-badge ${classeSituacao(rotulo)}`}>{rotulo}</span> : null
                      })()}</td>
                      <td>{averb === 'averbado' ? 'Averbado' : averb === 'nao_averbado' ? 'Não averbado' : vista(item.averbacao || item.statusAverbacao)}</td>
                      <td className="corte" title={vista(item.mensagemSimulacao || item.ultimoHistorico)}>{vista(item.mensagemSimulacao || item.ultimoHistorico)}</td>
                      <td>{vista(productCatalogLabel(String(item.produto || '')) || item.produto) ? <span className="nx-badge">{productCatalogLabel(String(item.produto || '')) || vista(item.produto)}</span> : null}</td>
                      <td>{vista(item.banco || item.instituicao) ? <span className="nx-badge">{vista(item.banco || item.instituicao)}</span> : null}</td>
                      <td>{vista(item.responsavel || item.operadorNome)}</td>
                      <td>{vista(item.contrato || item.numeroContrato)}</td>
                      <td>{dataExibicao(item.data || item.dataAverbacao)}</td>
                      <td>{mascaraTelefone(vista(item.telefone || item.whatsapp))}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
        {fila.length > porPagina ? (
          <div className="flex items-center justify-between gap-2 p-2 text-[11px]">
            <span>{fila.length} registros · página {paginaAtual + 1} de {paginas}</span>
            <div className="flex gap-1">
              <button type="button" className="px-2 py-0.5 rounded nexus-btn-secondary" disabled={paginaAtual === 0} onClick={() => setPagina((p) => Math.max(0, p - 1))}>Anterior</button>
              <button type="button" className="px-2 py-0.5 rounded nexus-btn-secondary" disabled={paginaAtual >= paginas - 1} onClick={() => setPagina((p) => p + 1)}>Próxima</button>
            </div>
          </div>
        ) : null}
      </div>

      {ficha && (
        <FichaProposta
          rec={ficha.rec}
          foco={ficha.foco}
          onClose={() => setFicha(null)}
          cliente={clientes.items.find((c) => c.id === ficha.rec.clienteId) || cliente}
          documentos={docsForProposal(documentos.items as DeskRecord[], ficha.rec)}
          contratos={(contratos.items as DeskRecord[]).filter((c) => String(c.clienteId || '') === String(ficha.rec.clienteId || '') || String(c.numero || c.contrato || '') === String(ficha.rec.contrato || ''))}
          auditoria={auditoria.items as DeskRecord[]}
          onSave={salvarProposta}
          onSaveCliente={salvarCliente}
          onSaveCpf={salvarCpf}
          onBuscarCep={buscarCep}
          onAddDocumento={(file) => void adicionarDocumento(file)}
          onPersistir={marcarEtapa}
        />
      )}
    </div>
  )
}

function FichaProposta({
  rec,
  foco,
  onClose,
  cliente,
  documentos,
  contratos,
  auditoria,
  onSave,
  onSaveCliente,
  onSaveCpf,
  onBuscarCep,
  onAddDocumento,
  onPersistir,
}: {
  rec: DeskRecord
  foco: FocoFicha
  onClose: () => void
  cliente?: NexusCliente | null
  documentos: DeskRecord[]
  contratos: DeskRecord[]
  auditoria: DeskRecord[]
  onSave: (campo: string, valor: string) => Promise<void>
  onSaveCliente: (campo: string, valor: string) => Promise<void>
  onSaveCpf: (valor: string) => Promise<void>
  onBuscarCep: (valor: string) => Promise<void>
  onAddDocumento: (file: File) => void
  onPersistir: (label: string) => Promise<void>
}) {
  useEscLayer(true, onClose)
  const pendencias = buildPendencias({ rec, docs: documentos })
  const situacao = vista(digitacaoStatusLabel(String(rec.status || '')) || displayOperationalStatus(rec))
  const [etapaLocal, setEtapaLocal] = useState(situacaoAtual(rec))
  const [salvando, setSalvando] = useState(false)
  useEffect(() => {
    setEtapaLocal(situacaoAtual(rec))
  }, [rec.id, rec.status, rec.averbacao, rec.statusAverbacao])
  const situacaoVisivel = etapaLocal || situacao
  const numero = vista(rec.protocolo || rec.numeroProposta)
  useEffect(() => {
    const scroller = document.querySelector('.ficha-panel .ficha-corpo')
    if (scroller instanceof HTMLElement) scroller.scrollTop = 0
  }, [foco, rec.id])
  const historico = buildHistory({ rec, auditoria })

  return (
    <div className="ficha-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Proposta">
      <div className="ficha-panel" onClick={(e) => e.stopPropagation()}>
        <div className="ficha-topo sticky top-0 z-30 border-b" style={{ borderColor: 'var(--code-border)', background: 'var(--code-surface)' }}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-[15px] font-bold">Proposta {numero}</div>
              {situacaoVisivel ? <span className={`nx-badge mt-1 ${classeSituacao(situacaoVisivel)}`}>{situacaoVisivel}</span> : null}
            </div>
            <button type="button" onClick={onClose} aria-label="Fechar"><X className="w-5 h-5" /></button>
          </div>
        </div>
        <div className="ficha-corpo">
              <section id="ficha-cliente" className="ficha-block">
                <div className="desk-label mb-1">Cliente</div>
                <FieldRow label="CPF" mask={mascaraCpf} value={String(rec.cpf || cliente?.cpf || '')} onCommit={(v) => void onSaveCpf(v)} />
                <FieldRow label="Nome completo" value={vista(cliente?.nome || rec.clienteNome)} onCommit={(v) => void onSaveCliente('nome', v)} />
                <FieldRow label="Data de nascimento" mask={mascaraData} value={String(rec.dataNascimento || cliente?.dataNascimento || '')} onCommit={(v) => void onSaveCliente('dataNascimento', mascaraData(v))} />
                <FieldRow label="Telefone" mask={mascaraTelefone} value={String(cliente?.telefone || rec.telefone || '')} onCommit={(v) => void onSaveCliente('telefone', mascaraTelefone(v))} />
                <FieldRow label="WhatsApp" mask={mascaraTelefone} value={String(cliente?.whatsapp || rec.whatsapp || '')} onCommit={(v) => void onSaveCliente('whatsapp', mascaraTelefone(v))} />
                <FieldRow label="E-mail" value={vista(cliente?.email)} onCommit={(v) => void onSaveCliente('email', v)} />
                <FieldRow label="CEP" mask={mascaraCep} liveDigits={8} value={String(rec.cep || cliente?.cep || '')} onCommit={(v) => void onBuscarCep(v)} />
                <FieldRow label="Endereço" value={vista(rec.endereco || cliente?.endereco)} onCommit={(v) => void onSaveCliente('endereco', v)} />
                <FieldRow label="Número" value={vista(cliente?.numero)} onCommit={(v) => void onSaveCliente('numero', v)} />
                <FieldRow label="Complemento" value={vista(cliente?.complemento)} onCommit={(v) => void onSaveCliente('complemento', v)} />
                <FieldRow label="Bairro" value={vista(rec.bairro || cliente?.bairro)} onCommit={(v) => void onSaveCliente('bairro', v)} />
                <FieldRow label="Cidade" value={vista(rec.cidade || cliente?.cidade)} onCommit={(v) => void onSaveCliente('cidade', v)} />
                <FieldRow label="UF" value={vista(rec.uf || cliente?.estado)} onCommit={(v) => void onSave('uf', v)} />
                <FieldRow label="Benefício" value={vista(rec.beneficio || rec.numeroBeneficio)} onCommit={(v) => void onSave('beneficio', v)} />
                <FieldRow label="Matrícula" value={vista(rec.matricula)} onCommit={(v) => void onSave('matricula', v)} />
                <FieldRow label="Espécie" value={vista(rec.especie)} onCommit={(v) => void onSave('especie', v)} />
              </section>
              <section id="ficha-operacao" className="ficha-block">
                <div className="desk-label mb-1">Operação</div>
                <FieldRow label="Produto" value={vista(productCatalogLabel(String(rec.produto || '')) || rec.produto)} />
                <FieldRow label="Operação" value={operationLabel(String(rec.operacao || ''))} />
                <FieldRow label="Instituição" value={vista(rec.banco || rec.instituicao)} />
                <FieldRow label="Convênio" value={vista(rec.convenio)} onCommit={(v) => void onSave('convenio', v)} />
                <FieldRow label="Tabela" value={vista(rec.tabela)} onCommit={(v) => void onSave('tabela', v)} />
                <FieldRow label="Prazo" value={vista(rec.prazo)} onCommit={(v) => void onSave('prazo', v)} />
                <FieldRow label="Parcela" mask={mascaraMoeda} value={String(rec.parcela ?? '')} onCommit={(v) => void onSave('parcela', v)} />
                <FieldRow label="Taxa" mask={mascaraTaxa} value={String(rec.taxa || rec.taxaMensal || '')} onCommit={(v) => void onSave('taxa', v)} />
                <FieldRow label="Coeficiente" mask={mascaraCoeficiente} value={String(rec.coeficiente ?? '')} onCommit={(v) => void onSave('coeficiente', v)} />
                <FieldRow label="Margem" mask={mascaraMoeda} value={String(rec.margem ?? '')} onCommit={(v) => void onSave('margem', v)} />
                <FieldRow label="Valor bruto" mask={mascaraMoeda} value={String(rec.valorBruto ?? rec.valor ?? '')} onCommit={(v) => void onSave('valorBruto', v)} />
                <FieldRow label="Valor líquido" mask={mascaraMoeda} value={String(rec.valorLiberado ?? '')} onCommit={(v) => void onSave('valorLiberado', v)} />
              </section>
              <section id="ficha-proposta" className="ficha-block">
                <div className="desk-label mb-1">Proposta</div>
                <label className="ficha-campo">
                  <span className="desk-label">Situação</span>
                  <select className={`ficha-input ${classeSituacao(etapaLocal)}`} value={etapaLocal} onChange={(e) => setEtapaLocal(e.target.value as (typeof SITUACOES)[number] | '')}>
                    <option value="">Selecione</option>
                    {SITUACOES.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
                <FieldRow label="Número da proposta" value={numero} />
                <FieldRow label="Data de inclusão" value={toDate(rec.criadoEm)?.toLocaleString('pt-BR') || ''} />
                <FieldRow label="Vendedor" value={vista(rec.responsavel || rec.operadorNome)} onCommit={(v) => void onSave('responsavel', v)} />
                <FieldRow label="Contrato" value={vista(rec.contrato || rec.numeroContrato)} onCommit={(v) => void onSave('contrato', v)} />
                <FieldRow label="Data" mask={mascaraData} value={dataExibicao(rec.data || rec.dataAverbacao)} onCommit={(v) => void onSave('data', mascaraData(v))} />
                <ObsCampo value={vista(rec.observacoes)} onCommit={(v) => void onSave('observacoes', v)} />
              </section>
              {hasSignatureBlock(rec) && (
                <section className="ficha-block">
                  <div className="desk-label mb-1">Assinatura</div>
                  <FieldRow label="Link de assinatura" value={vista(rec.linkAssinatura || rec.assinaturaUrl)} />
                  <FieldRow label="Data de envio" value={toDate(rec.dataEnvioAssinatura)?.toLocaleString('pt-BR') || ''} />
                </section>
              )}
              {contratos.length > 0 && (
              <section className="ficha-block">
                <div className="desk-label mb-1">Contrato</div>
                {contratos.map((c) => (
                  <div key={c.id} className="text-[12px] border-b py-1" style={{ borderColor: 'var(--code-border)' }}>
                    <div>Número: {vista(c.numero || c.contrato)}</div>
                    <div>Status: {vista(c.status)}</div>
                    <div>Instituição: {vista(c.instituicao || rec.banco)}</div>
                    <div>Parcela: {moneyCell(c.parcela)} · Prazo: {vista(formatPrazo(c.prazo))} · Valor: {moneyCell(c.valor)}</div>
                  </div>
                ))}
              </section>
              )}
              <section id="ficha-documentos" className="ficha-block">
                <div className="desk-label mb-1" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Documentos</span>
                  <label className="acao-linha" style={{ cursor: 'pointer' }}>
                    Adicionar
                    <input
                      type="file"
                      hidden
                      accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        e.target.value = ''
                        if (file) onAddDocumento(file)
                      }}
                    />
                  </label>
                </div>
                {documentos.length === 0 ? (
                  <p className="text-[12px]" style={{ color: 'var(--code-muted)' }}>Nenhum documento disponível.</p>
                ) : (
                  <ul className="space-y-1">
                    {documentos.map((d) => {
                      const href = documentOpenUrl(d)
                      return (
                        <li key={d.id} className="flex items-center justify-between gap-2 text-[12px]">
                          <span>{[vista(d.nome || d.categoria), vista(d.status)].filter(Boolean).join(' · ')}</span>
                          {href ? <a className="nexus-btn-secondary px-2 py-0.5 rounded text-[11px]" href={href} target="_blank" rel="noreferrer">Visualizar</a> : null}
                        </li>
                      )
                    })}
                  </ul>
                )}
              </section>
              <section id="ficha-pendencias" className="ficha-block">
                <div className="desk-label mb-1">Pendências</div>
                {pendencias.length === 0 ? (
                  <p className="text-[12px]">Nenhuma pendência registrada.</p>
                ) : (
                  <ul className="text-[12px] space-y-1">
                    {pendencias.filter((p) => !/aguardando api/i.test(p)).map((p) => <li key={p}><span className="nx-badge">{p}</span></li>)}
                  </ul>
                )}
              </section>
              <section id="ficha-historico" className="ficha-block">
                <div className="desk-label mb-1">Histórico</div>
                {historico.length === 0 ? (
                  <p className="text-[12px]" style={{ color: 'var(--code-muted)' }}>Nenhum evento real registrado.</p>
                ) : (
                  <ul className="space-y-2">
                    {historico.filter((h) => !/aguardando api/i.test(h.label)).map((h, i) => (
                      <li key={`${h.label}-${i}`} className="text-[12px] border-l-2 pl-2" style={{ borderColor: 'var(--code-orange)' }}>
                        <div className="font-semibold">{h.at ? h.at.toLocaleString('pt-BR') : ''}</div>
                        <div>{h.label}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
        </div>
        <div className="ficha-rodape">
          <button
            type="button"
            className="ficha-salvar"
            disabled={!etapaLocal || salvando}
            onClick={() => {
              if (!etapaLocal) return
              setSalvando(true)
              void Promise.resolve(onPersistir(etapaLocal)).finally(() => setSalvando(false))
            }}
          >
            {salvando ? 'Salvando…' : 'Salvar proposta'}
          </button>
        </div>
      </div>
    </div>
  )
}

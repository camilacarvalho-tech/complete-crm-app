import { useState, useEffect } from 'react'
import {
  Columns3, Phone, DollarSign, User, Filter,
  Calendar, TrendingUp, Flame, Snowflake, ThermometerSun
} from 'lucide-react'
import {
  collection, onSnapshot, updateDoc, doc, addDoc, serverTimestamp, getDocs
} from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../contexts/AuthContext'
import { PIPELINE_ETAPAS, PIPELINE_CORES, type PipelineEtapa } from '../constants/pipeline'

interface ClientePipeline {
  id: string
  nome: string
  cpf: string
  telefone: string
  status: PipelineEtapa | string
  pipeline?: string
  valorProposta: number
  atendente: string
  temperatura: 'Quente' | 'Morno' | 'Frio'
  ultimaInteracao: string
  origem?: string
}

const corHeader: Record<string, string> = {
  purple: 'bg-purple-500',
  blue: 'bg-blue-500',
  cyan: 'bg-cyan-500',
  yellow: 'bg-yellow-500',
  orange: 'bg-orange-500',
  amber: 'bg-amber-500',
  green: 'bg-green-500',
  teal: 'bg-teal-500',
}

function normalizarEtapa(raw: string | undefined): PipelineEtapa | string {
  if (!raw) return 'Novo Lead'
  const map: Record<string, PipelineEtapa> = {
    'Novo Lead': 'Novo Lead',
    Lead: 'Novo Lead',
    'Primeiro Contato': 'Primeiro Contato',
    Qualificado: 'Qualificado',
    Proposta: 'Proposta',
    'Proposta Enviada': 'Proposta',
    Negociação: 'Negociação',
    Contrato: 'Contrato',
    Pago: 'Pago',
    Ganho: 'Pago',
    'Pós-venda': 'Pós-venda',
    'Pos-venda': 'Pós-venda',
  }
  return map[raw] || (PIPELINE_ETAPAS.includes(raw as PipelineEtapa) ? raw : 'Novo Lead')
}

export default function Pipeline() {
  const { user, empresa, usuario } = useAuth()
  const empresaId = empresa?.id || usuario?.empresaId || ''
  const nomeUsuario = usuario?.nome || user?.displayName || 'Sistema'
  const userId = user?.uid || 'sistema'

  const [clientes, setClientes] = useState<ClientePipeline[]>([])
  const [draggedCard, setDraggedCard] = useState<ClientePipeline | null>(null)
  const [filtroAtendente, setFiltroAtendente] = useState('todos')
  const [filtroTemperatura, setFiltroTemperatura] = useState('todos')
  const [salvando, setSalvando] = useState(false)
  const [loading, setLoading] = useState(true)

  const colunas = PIPELINE_ETAPAS.map((status) => ({
    status,
    cor: PIPELINE_CORES[status],
    label: status,
  }))

  useEffect(() => {
    if (!empresaId) {
      setClientes([])
      setLoading(false)
      return
    }
    const unsub = onSnapshot(
      collection(db, 'empresas', empresaId, 'clientes'),
      (snap) => {
        const list = snap.docs.map((d) => {
          const data = d.data()
          const etapa = normalizarEtapa(data.pipeline || data.status)
          return {
            id: d.id,
            nome: data.nome || 'Sem nome',
            cpf: data.cpf || '',
            telefone: data.telefone || data.whatsapp || '',
            status: etapa,
            pipeline: etapa,
            valorProposta: Number(data.valorProposta || data.valor || 0),
            atendente: data.atendente || data.responsavel || '—',
            temperatura: (data.temperatura as ClientePipeline['temperatura']) || 'Morno',
            ultimaInteracao: data.ultimaInteracao || 'Recente',
            origem: data.origem || '',
          } as ClientePipeline
        })
        setClientes(list)
        setLoading(false)
      },
      () => {
        // fallback read once
        getDocs(collection(db, 'empresas', empresaId, 'clientes')).then((snap) => {
          setClientes(
            snap.docs.map((d) => {
              const data = d.data()
              const etapa = normalizarEtapa(data.pipeline || data.status)
              return {
                id: d.id,
                nome: data.nome || 'Sem nome',
                cpf: data.cpf || '',
                telefone: data.telefone || data.whatsapp || '',
                status: etapa,
                valorProposta: Number(data.valorProposta || 0),
                atendente: data.atendente || '—',
                temperatura: (data.temperatura as ClientePipeline['temperatura']) || 'Morno',
                ultimaInteracao: '—',
                origem: data.origem,
              }
            })
          )
          setLoading(false)
        })
      }
    )
    return () => unsub()
  }, [empresaId])

  const atendentes = Array.from(new Set(clientes.map((c) => c.atendente).filter(Boolean)))

  const clientesFiltrados = clientes.filter((c) => {
    if (filtroAtendente !== 'todos' && c.atendente !== filtroAtendente) return false
    if (filtroTemperatura !== 'todos' && c.temperatura !== filtroTemperatura) return false
    return true
  })

  const getClientesPorStatus = (status: string) =>
    clientesFiltrados.filter((c) => c.status === status || c.pipeline === status)

  const handleDragStart = (cliente: ClientePipeline) => setDraggedCard(cliente)
  const handleDragOver = (e: React.DragEvent) => e.preventDefault()

  const handleDrop = async (novoStatus: PipelineEtapa) => {
    if (!draggedCard || draggedCard.status === novoStatus) {
      setDraggedCard(null)
      return
    }
    const de = draggedCard.status
    setSalvando(true)
    setClientes((prev) =>
      prev.map((c) => (c.id === draggedCard.id ? { ...c, status: novoStatus, pipeline: novoStatus } : c))
    )
    setDraggedCard(null)
    try {
      await updateDoc(doc(db, 'empresas', empresaId, 'clientes', draggedCard.id), {
        status: novoStatus,
        pipeline: novoStatus,
        atualizadoEm: serverTimestamp(),
        movidoEm: serverTimestamp(),
        movidoPor: nomeUsuario,
        movidoPorId: userId,
      })
      await addDoc(collection(db, 'empresas', empresaId, 'clientes', draggedCard.id, 'historicoPipeline'), {
        de,
        para: novoStatus,
        userId,
        userName: nomeUsuario,
        em: serverTimestamp(),
      })
      await addDoc(collection(db, 'empresas', empresaId, 'historicoPipeline'), {
        clienteId: draggedCard.id,
        clienteNome: draggedCard.nome,
        de,
        para: novoStatus,
        userId,
        userName: nomeUsuario,
        em: serverTimestamp(),
      })
    } catch (err) {
      console.error('Erro ao mover card', err)
    } finally {
      setSalvando(false)
    }
  }

  const getTemperaturaIcon = (temp: ClientePipeline['temperatura']) => {
    if (temp === 'Quente') return <Flame className="w-4 h-4 text-red-500" />
    if (temp === 'Morno') return <ThermometerSun className="w-4 h-4 text-orange-500" />
    return <Snowflake className="w-4 h-4 text-blue-500" />
  }

  const getTemperaturaBg = (temp: ClientePipeline['temperatura']) => {
    if (temp === 'Quente') return 'border-red-300 dark:border-red-800'
    if (temp === 'Morno') return 'border-orange-300 dark:border-orange-800'
    return 'border-blue-300 dark:border-blue-800'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
            <Columns3 className="w-8 h-8 text-blue-500" />
            Pipeline de Vendas
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Arraste os cards · histórico e responsável gravados automaticamente
            {salvando && <span className="ml-2 text-blue-500 text-sm">Salvando…</span>}
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-slate-500" />
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Filtros:</span>
          </div>
          <select
            value={filtroAtendente}
            onChange={(e) => setFiltroAtendente(e.target.value)}
            className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm dark:bg-slate-700 dark:text-white"
          >
            <option value="todos">Todos os atendentes</option>
            {atendentes.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <select
            value={filtroTemperatura}
            onChange={(e) => setFiltroTemperatura(e.target.value)}
            className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm dark:bg-slate-700 dark:text-white"
          >
            <option value="todos">Todas as temperaturas</option>
            <option value="Quente">Quente</option>
            <option value="Morno">Morno</option>
            <option value="Frio">Frio</option>
          </select>
          <div className="ml-auto text-sm">
            <span className="text-slate-600 dark:text-slate-400">Total: </span>
            <span className="font-bold text-slate-900 dark:text-white">{clientesFiltrados.length}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {colunas.map((coluna) => {
          const clientesColuna = getClientesPorStatus(coluna.status)
          const valorTotal = clientesColuna.reduce((sum, c) => sum + c.valorProposta, 0)
          return (
            <div
              key={coluna.status}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(coluna.status)}
              className="flex-shrink-0 w-72 bg-slate-100 dark:bg-slate-900 rounded-xl p-3"
            >
              <div className={`${corHeader[coluna.cor] || 'bg-slate-500'} text-white rounded-lg p-3 mb-3`}>
                <div className="font-bold text-sm mb-1">{coluna.label}</div>
                <div className="flex justify-between text-xs opacity-90">
                  <span>{clientesColuna.length}</span>
                  <span>R$ {(valorTotal / 1000).toFixed(0)}k</span>
                </div>
              </div>
              <div className="space-y-2 max-h-[calc(100vh-380px)] overflow-y-auto min-h-[120px]">
                {clientesColuna.map((cliente) => (
                  <div
                    key={cliente.id}
                    draggable
                    onDragStart={() => handleDragStart(cliente)}
                    className={`bg-white dark:bg-slate-800 rounded-lg p-3 border-2 ${getTemperaturaBg(cliente.temperatura)} cursor-move hover:shadow-lg`}
                  >
                    <div className="flex justify-between mb-2">
                      <div className="font-bold text-slate-900 dark:text-white text-sm">{cliente.nome}</div>
                      {getTemperaturaIcon(cliente.temperatura)}
                    </div>
                    <div className="text-xs text-slate-500 mb-1">{cliente.cpf}</div>
                    <div className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400 mb-1">
                      <Phone className="w-3 h-3" /> {cliente.telefone}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-green-600 font-bold mb-1">
                      <DollarSign className="w-3.5 h-3.5" />
                      R$ {cliente.valorProposta.toLocaleString('pt-BR')}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <User className="w-3 h-3" /> {cliente.atendente}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                      <Calendar className="w-3 h-3" /> {cliente.ultimaInteracao}
                    </div>
                  </div>
                ))}
                {clientesColuna.length === 0 && (
                  <div className="text-center py-6 text-slate-400 text-xs">Solte aqui</div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-green-500" />
          Conversão por etapa (Pago)
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {atendentes.map((nome) => {
            const lista = clientes.filter((c) => c.atendente === nome)
            const pagos = lista.filter((c) => c.status === 'Pago').length
            const taxa = lista.length ? ((pagos / lista.length) * 100).toFixed(0) : '0'
            return (
              <div key={nome} className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                <div className="font-semibold text-slate-900 dark:text-white mb-1 text-sm">{nome}</div>
                <div className="text-2xl font-bold text-green-600">{pagos}</div>
                <div className="text-xs text-slate-500">pagos de {lista.length} · {taxa}%</div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

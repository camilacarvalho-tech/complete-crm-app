/**
 * Fluxo de Caixa ERP — dados reais multi-tenant
 * empresas/{empresaId}/fluxoCaixa
 */
import { useMemo, useState } from 'react'
import {
  DollarSign, TrendingUp, TrendingDown, Plus, Search, Trash2, ArrowUpRight, ArrowDownRight
} from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'
import { useTenantCollection } from '../../hooks/useTenantCollection'
import { useToast } from '../../components/ui/Toast'
import { SkeletonTable, EmptyState } from '../../components/ui/Skeleton'
import * as XLSX from 'xlsx'

interface Movimentacao {
  id: string
  data: string
  tipo: 'entrada' | 'saida'
  categoria: string
  descricao: string
  valor: number
  status: 'realizado' | 'previsto' | 'agendado'
  metodoPagamento?: string
}

export default function FluxoCaixaERP() {
  const { darkMode } = useTheme()
  const toast = useToast()
  const { items, loading, empresaId, create, remove } = useTenantCollection<Movimentacao>(
    'fluxoCaixa',
    [],
    { tela: 'Fluxo de Caixa' }
  )

  const [busca, setBusca] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'entrada' | 'saida'>('todos')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({
    data: new Date().toISOString().slice(0, 10),
    tipo: 'entrada' as 'entrada' | 'saida',
    categoria: 'Vendas',
    descricao: '',
    valor: '',
    status: 'realizado' as Movimentacao['status'],
    metodoPagamento: 'PIX',
  })

  const filtradas = useMemo(() => {
    return items.filter((m) => {
      if (filtroTipo !== 'todos' && m.tipo !== filtroTipo) return false
      if (busca) {
        const q = busca.toLowerCase()
        if (!`${m.descricao} ${m.categoria}`.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [items, filtroTipo, busca])

  const kpis = useMemo(() => {
    const realizados = filtradas.filter((m) => m.status === 'realizado')
    const entradas = realizados.filter((m) => m.tipo === 'entrada').reduce((s, m) => s + Number(m.valor || 0), 0)
    const saidas = realizados.filter((m) => m.tipo === 'saida').reduce((s, m) => s + Number(m.valor || 0), 0)
    return { entradas, saidas, saldo: entradas - saidas }
  }, [filtradas])

  const salvar = async () => {
    if (!form.descricao.trim() || !form.valor) {
      toast.warning('Preencha descrição e valor')
      return
    }
    if (!empresaId) {
      toast.error('Empresa não identificada')
      return
    }
    try {
      await create({
        data: form.data,
        tipo: form.tipo,
        categoria: form.categoria,
        descricao: form.descricao.trim(),
        valor: Number(String(form.valor).replace(',', '.')),
        status: form.status,
        metodoPagamento: form.metodoPagamento,
      })
      setShowModal(false)
      setForm({
        data: new Date().toISOString().slice(0, 10),
        tipo: 'entrada',
        categoria: 'Vendas',
        descricao: '',
        valor: '',
        status: 'realizado',
        metodoPagamento: 'PIX',
      })
      toast.success('Movimentação registrada')
    } catch {
      toast.error('Erro ao salvar')
    }
  }

  const exportar = () => {
    const ws = XLSX.utils.json_to_sheet(
      filtradas.map((m) => ({
        Data: m.data,
        Tipo: m.tipo,
        Categoria: m.categoria,
        Descrição: m.descricao,
        Valor: m.valor,
        Status: m.status,
      }))
    )
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Fluxo')
    XLSX.writeFile(wb, 'fluxo-caixa.xlsx')
  }

  if (!empresaId) {
    return <EmptyState title="Empresa não identificada" description="Faça login novamente." />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className={`text-3xl font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            Fluxo de Caixa
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">Entradas e saídas em tempo real</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={exportar} className="btn-secondary px-4 py-2 text-sm">Exportar</button>
          <button type="button" onClick={() => setShowModal(true)} className="btn-action px-4 py-2 text-sm flex items-center gap-2">
            <Plus className="w-4 h-4" /> Nova
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card-code p-5">
          <div className="flex items-center gap-2 text-code-success text-sm font-medium"><ArrowUpRight className="w-4 h-4" /> Entradas</div>
          <p className="text-2xl font-bold mt-2">R$ {kpis.entradas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="card-code p-5">
          <div className="flex items-center gap-2 text-code-danger text-sm font-medium"><ArrowDownRight className="w-4 h-4" /> Saídas</div>
          <p className="text-2xl font-bold mt-2">R$ {kpis.saidas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="card-code p-5">
          <div className="flex items-center gap-2 text-code-primary text-sm font-medium"><DollarSign className="w-4 h-4" /> Saldo</div>
          <p className="text-2xl font-bold mt-2">R$ {kpis.saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar…"
            className="w-full pl-10 pr-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)]"
          />
        </div>
        {(['todos', 'entrada', 'saida'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setFiltroTipo(t)}
            className={`px-3 py-2 rounded-lg text-sm capitalize ${filtroTipo === t ? 'btn-primary' : 'btn-secondary'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <SkeletonTable rows={6} />
      ) : filtradas.length === 0 ? (
        <EmptyState
          title="Nenhuma movimentação"
          description="Registre a primeira entrada ou saída."
          action={
            <button type="button" className="btn-action px-4 py-2" onClick={() => setShowModal(true)}>
              Nova movimentação
            </button>
          }
        />
      ) : (
        <div className="card-code overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg-main)] text-[var(--text-secondary)]">
              <tr>
                <th className="text-left p-3">Data</th>
                <th className="text-left p-3">Tipo</th>
                <th className="text-left p-3">Categoria</th>
                <th className="text-left p-3">Descrição</th>
                <th className="text-right p-3">Valor</th>
                <th className="text-left p-3">Status</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {filtradas.map((m) => (
                <tr key={m.id} className="border-t border-[var(--border-color)]">
                  <td className="p-3">{m.data}</td>
                  <td className="p-3">
                    <span className={m.tipo === 'entrada' ? 'text-code-success' : 'text-code-danger'}>
                      {m.tipo === 'entrada' ? <TrendingUp className="w-4 h-4 inline" /> : <TrendingDown className="w-4 h-4 inline" />}
                      {' '}{m.tipo}
                    </span>
                  </td>
                  <td className="p-3">{m.categoria}</td>
                  <td className="p-3">{m.descricao}</td>
                  <td className="p-3 text-right font-semibold">
                    R$ {Number(m.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-3 capitalize">{m.status}</td>
                  <td className="p-3">
                    <button
                      type="button"
                      className="text-code-danger"
                      onClick={() => remove(m.id, m).then(() => toast.success('Removido')).catch(() => toast.error('Erro'))}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="card-code w-full max-w-lg p-6 space-y-4">
            <h2 className="text-xl font-bold">Nova movimentação</h2>
            <div className="grid grid-cols-2 gap-3">
              <input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} className="rounded-lg border p-2 bg-[var(--bg-main)]" />
              <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as any })} className="rounded-lg border p-2 bg-[var(--bg-main)]">
                <option value="entrada">Entrada</option>
                <option value="saida">Saída</option>
              </select>
              <input placeholder="Categoria" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} className="rounded-lg border p-2 bg-[var(--bg-main)]" />
              <input placeholder="Valor" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} className="rounded-lg border p-2 bg-[var(--bg-main)]" />
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as any })} className="rounded-lg border p-2 bg-[var(--bg-main)] col-span-2">
                <option value="realizado">Realizado</option>
                <option value="previsto">Previsto</option>
                <option value="agendado">Agendado</option>
              </select>
              <input placeholder="Descrição" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} className="rounded-lg border p-2 bg-[var(--bg-main)] col-span-2" />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-cancel px-4 py-2" onClick={() => setShowModal(false)}>Cancelar</button>
              <button type="button" className="btn-save px-4 py-2" onClick={salvar}>Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

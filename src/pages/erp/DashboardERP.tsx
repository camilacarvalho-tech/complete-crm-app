/**
 * Dashboard ERP — KPIs reais a partir de fluxoCaixa, contasPagar, recebimentos, estoque
 */
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  DollarSign, TrendingUp, TrendingDown, Package, ShoppingCart, Users, Building2, AlertCircle
} from 'lucide-react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../../firebase'
import { useTheme } from '../../contexts/ThemeContext'
import { useEmpresaId } from '../../hooks/useEmpresaId'
import { SkeletonCard } from '../../components/ui/Skeleton'

export default function DashboardERP() {
  const { darkMode } = useTheme()
  const navigate = useNavigate()
  const empresaId = useEmpresaId()
  const [fluxo, setFluxo] = useState<any[]>([])
  const [pagar, setPagar] = useState<any[]>([])
  const [receber, setReceber] = useState<any[]>([])
  const [estoque, setEstoque] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!empresaId) {
      setLoading(false)
      return
    }
    const unsubs = [
      onSnapshot(collection(db, 'empresas', empresaId, 'fluxoCaixa'), (s) => setFluxo(s.docs.map((d) => ({ id: d.id, ...d.data() })))),
      onSnapshot(collection(db, 'empresas', empresaId, 'contasPagar'), (s) => setPagar(s.docs.map((d) => ({ id: d.id, ...d.data() })))),
      onSnapshot(collection(db, 'empresas', empresaId, 'recebimentos'), (s) => setReceber(s.docs.map((d) => ({ id: d.id, ...d.data() })))),
      onSnapshot(collection(db, 'empresas', empresaId, 'estoque'), (s) => {
        setEstoque(s.docs.map((d) => ({ id: d.id, ...d.data() })))
        setLoading(false)
      }, () => setLoading(false)),
    ]
    return () => unsubs.forEach((u) => u())
  }, [empresaId])

  const kpis = useMemo(() => {
    const entradas = fluxo.filter((m) => m.tipo === 'entrada' && m.status === 'realizado')
      .reduce((s, m) => s + Number(m.valor || 0), 0)
    const saidas = fluxo.filter((m) => m.tipo === 'saida' && m.status === 'realizado')
      .reduce((s, m) => s + Number(m.valor || 0), 0)
    const aPagar = pagar.filter((c) => c.status !== 'pago').reduce((s, c) => s + Number(c.valor || c.valorLiquido || 0), 0)
    const aReceber = receber.filter((c) => c.status !== 'pago' && c.status !== 'recebido')
      .reduce((s, c) => s + Number(c.valor || c.valorLiquido || 0), 0)
    const estoqueBaixo = estoque.filter((p) => Number(p.quantidade || 0) <= Number(p.minimo || 0)).length
    return {
      receitaMes: entradas,
      despesasMes: saidas,
      margemLucro: entradas ? ((entradas - saidas) / entradas) * 100 : 0,
      aPagar,
      aReceber,
      estoqueTotal: estoque.length,
      estoqueBaixo,
      contasPagar: pagar.length,
      recebimentos: receber.length,
    }
  }, [fluxo, pagar, receber, estoque])

  const atalhos = [
    { label: 'Fluxo de Caixa', path: '/erp/financeiro-completo', icon: DollarSign },
    { label: 'Recebimentos', path: '/erp/recebimentos', icon: TrendingUp },
    { label: 'Contas a Pagar', path: '/erp/contas-pagar', icon: TrendingDown },
    { label: 'Estoque', path: '/erp/estoque', icon: Package },
    { label: 'Compras', path: '/erp/compras', icon: ShoppingCart },
    { label: 'Fornecedores', path: '/erp/fornecedores', icon: Building2 },
    { label: 'RH', path: '/erp/rh', icon: Users },
  ]

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className={`text-3xl font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>Dashboard ERP</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">Visão financeira em tempo real · CODE Tecnologia</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-code p-5 border-l-4 border-code-success">
          <p className="text-sm text-code-success font-medium">Receita (fluxo)</p>
          <p className="text-2xl font-bold mt-1">R$ {kpis.receitaMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="card-code p-5 border-l-4 border-code-danger">
          <p className="text-sm text-code-danger font-medium">Despesas (fluxo)</p>
          <p className="text-2xl font-bold mt-1">R$ {kpis.despesasMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="card-code p-5 border-l-4 border-code-primary">
          <p className="text-sm text-code-primary font-medium">Margem</p>
          <p className="text-2xl font-bold mt-1">{kpis.margemLucro.toFixed(1)}%</p>
        </div>
        <div className="card-code p-5 border-l-4 border-code-secondary">
          <p className="text-sm text-code-secondary font-medium">A receber / A pagar</p>
          <p className="text-lg font-bold mt-1">
            R$ {kpis.aReceber.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
            <span className="text-slate-400"> / </span>
            R$ {kpis.aPagar.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
          </p>
        </div>
      </div>

      {kpis.estoqueBaixo > 0 && (
        <div className="card-code p-4 flex items-center gap-3 border-l-4 border-code-warning">
          <AlertCircle className="w-5 h-5 text-code-warning" />
          <p className="text-sm">{kpis.estoqueBaixo} produto(s) abaixo do estoque mínimo</p>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {atalhos.map((a) => (
          <button
            key={a.path}
            type="button"
            onClick={() => navigate(a.path)}
            className="card-code p-4 flex items-center gap-3 text-left hover:-translate-y-1 transition"
          >
            <a.icon className="w-5 h-5 text-code-primary" />
            <span className="font-semibold text-sm">{a.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

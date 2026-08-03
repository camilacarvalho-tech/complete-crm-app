import { useState, useEffect, useMemo } from 'react'
import {
  TrendingUp, DollarSign, Target, Percent, Users, BarChart3, Save
} from 'lucide-react'
import { doc, getDoc, setDoc, collection, onSnapshot, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../contexts/AuthContext'

type Periodo = 'mes' | 'trimestre' | 'ano'

interface Investimentos {
  whatsapp: number
  sms: number
  email: number
  instagram: number
  facebook: number
  google: number
}

const DEFAULT_INV: Investimentos = {
  whatsapp: 1200,
  sms: 800,
  email: 500,
  instagram: 1500,
  facebook: 2500,
  google: 3500,
}

export default function MarketingROI() {
  const { empresa } = useAuth()
  const empresaId = empresa?.id || localStorage.getItem('empresaId') || 'default'
  const [periodo, setPeriodo] = useState<Periodo>('mes')
  const [inv, setInv] = useState<Investimentos>(DEFAULT_INV)
  const [clientes, setClientes] = useState<any[]>([])
  const [campanhas, setCampanhas] = useState<any[]>([])
  const [msg, setMsg] = useState('')

  const fator = periodo === 'mes' ? 1 : periodo === 'trimestre' ? 3 : 12

  useEffect(() => {
    getDoc(doc(db, 'empresas', empresaId, 'config', 'roi')).then((snap) => {
      if (snap.exists() && snap.data().investimentos) setInv({ ...DEFAULT_INV, ...snap.data().investimentos })
    }).catch(() => {})
    const u1 = onSnapshot(collection(db, 'empresas', empresaId, 'clientes'), (s) => {
      setClientes(s.docs.map((d) => ({ id: d.id, ...d.data() })))
    })
    const u2 = onSnapshot(collection(db, 'empresas', empresaId, 'campanhas'), (s) => {
      setCampanhas(s.docs.map((d) => ({ id: d.id, ...d.data() })))
    })
    return () => { u1(); u2() }
  }, [empresaId])

  const metrics = useMemo(() => {
    const totalInvestido = Object.values(inv).reduce((a, b) => a + b, 0) * fator
    const pagos = clientes.filter((c) => (c.pipeline || c.status) === 'Pago')
    const receita = pagos.reduce((s, c) => s + Number(c.valorProposta || 0), 0) * (fator > 1 ? fator * 0.85 : 1)
    const leads = Math.max(clientes.length, campanhas.reduce((s, c) => s + (c.enviadas || 0), 0) / 10)
    const vendas = pagos.length || Math.max(1, Math.floor(leads * 0.08))
    const lucro = receita - totalInvestido
    const roi = totalInvestido ? (lucro / totalInvestido) * 100 : 0
    const cpl = leads ? totalInvestido / leads : 0
    const cac = vendas ? totalInvestido / vendas : 0
    const ticket = vendas ? receita / vendas : 0
    const ltv = ticket * 3.2
    const conversao = leads ? (vendas / leads) * 100 : 0

    const porCanal = (Object.keys(inv) as (keyof Investimentos)[]).map((canal) => {
      const investimento = inv[canal] * fator
      const camp = campanhas.filter((c) => c.canal === canal)
      const leadsC = camp.reduce((s, c) => s + (c.enviadas || 0), 0) || Math.floor(leads / 6)
      const convC = camp.reduce((s, c) => s + (c.convertidas || 0), 0) || Math.floor(leadsC * 0.05)
      const receitaC = convC * ticket
      const roiC = investimento ? ((receitaC - investimento) / investimento) * 100 : 0
      return { canal, investimento, leads: leadsC, convertidas: convC, receita: receitaC, roi: roiC, conversao: leadsC ? (convC / leadsC) * 100 : 0 }
    })

    return { totalInvestido, receita, lucro, roi, cpl, cac, ltv, ticket, conversao, leads, vendas, porCanal }
  }, [inv, fator, clientes, campanhas])

  const salvar = async () => {
    await setDoc(doc(db, 'empresas', empresaId, 'config', 'roi'), {
      investimentos: inv,
      periodo,
      atualizadoEm: serverTimestamp(),
    }, { merge: true })
    setMsg('Investimentos salvos')
    setTimeout(() => setMsg(''), 2000)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-8 h-8 text-blue-500" /> Marketing ROI
          </h1>
          <p className="text-slate-500 text-sm">ROI · CAC · CPL · LTV · conversão por canal</p>
        </div>
        <div className="flex gap-2 items-center">
          {(['mes', 'trimestre', 'ano'] as Periodo[]).map((p) => (
            <button key={p} type="button" onClick={() => setPeriodo(p)} className={`px-3 py-1.5 rounded-lg text-sm capitalize ${periodo === p ? 'bg-blue-500 text-white' : 'bg-slate-100 dark:bg-slate-800 dark:text-slate-300'}`}>
              {p}
            </button>
          ))}
          <button type="button" onClick={salvar} className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm flex items-center gap-1">
            <Save className="w-3.5 h-3.5" /> Salvar
          </button>
        </div>
      </div>
      {msg && <p className="text-sm text-teal-500">{msg}</p>}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Kpi label="ROI" value={`${metrics.roi.toFixed(1)}%`} icon={TrendingUp} />
        <Kpi label="CAC" value={`R$ ${metrics.cac.toFixed(0)}`} icon={Users} />
        <Kpi label="CPL" value={`R$ ${metrics.cpl.toFixed(0)}`} icon={Target} />
        <Kpi label="LTV" value={`R$ ${metrics.ltv.toFixed(0)}`} icon={DollarSign} />
        <Kpi label="Receita" value={`R$ ${metrics.receita.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`} icon={DollarSign} />
        <Kpi label="Conversão" value={`${metrics.conversao.toFixed(1)}%`} icon={Percent} />
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
        <h3 className="font-bold dark:text-white mb-2">Gráfico de ROI (por canal)</h3>
        <div className="space-y-2">
          {metrics.porCanal.map((c) => (
            <div key={c.canal} className="flex items-center gap-3 text-sm">
              <span className="w-24 capitalize text-slate-600 dark:text-slate-400">{c.canal}</span>
              <div className="flex-1 h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full ${c.roi >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                  style={{ width: `${Math.min(100, Math.abs(c.roi) / 3)}%` }}
                />
              </div>
              <span className="w-16 text-right font-semibold dark:text-white">{c.roi.toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
          <h3 className="font-bold dark:text-white mb-3">Investimento por canal (base mensal)</h3>
          <div className="space-y-2">
            {(Object.keys(inv) as (keyof Investimentos)[]).map((k) => (
              <div key={k} className="flex items-center gap-3">
                <span className="w-24 text-sm capitalize text-slate-600 dark:text-slate-400">{k}</span>
                <input
                  type="number"
                  value={inv[k]}
                  onChange={(e) => setInv({ ...inv, [k]: Number(e.target.value) || 0 })}
                  className="flex-1 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 dark:text-white text-sm"
                />
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-3">
            Total período ({periodo}): R$ {metrics.totalInvestido.toLocaleString('pt-BR')}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
          <h3 className="font-bold dark:text-white mb-3">Conversão por canal</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-200 dark:border-slate-700">
                <th className="py-2">Canal</th>
                <th>Leads</th>
                <th>Conv.</th>
                <th>Taxa</th>
                <th>Receita</th>
              </tr>
            </thead>
            <tbody>
              {metrics.porCanal.map((c) => (
                <tr key={c.canal} className="border-b border-slate-100 dark:border-slate-700 dark:text-slate-200">
                  <td className="py-2 capitalize">{c.canal}</td>
                  <td>{c.leads}</td>
                  <td>{c.convertidas}</td>
                  <td>{c.conversao.toFixed(1)}%</td>
                  <td>R$ {c.receita.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-slate-500 mt-3">
            Comparativo: valores escalados pelo período selecionado · lucros R$ {metrics.lucro.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
          </p>
        </div>
      </div>
    </div>
  )
}

function Kpi({ label, value, icon: Icon }: { label: string; value: string; icon: typeof DollarSign }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
      <div className="flex justify-between text-xs text-slate-500 mb-1">
        <span>{label}</span>
        <Icon className="w-4 h-4" />
      </div>
      <div className="text-xl font-bold dark:text-white truncate">{value}</div>
    </div>
  )
}

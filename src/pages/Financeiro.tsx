import { useState, useEffect, useMemo } from 'react'
import {
  DollarSign, TrendingUp, TrendingDown, Plus, PieChart
} from 'lucide-react'
import {
  collection, onSnapshot, addDoc, serverTimestamp
} from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../contexts/AuthContext'

interface Lancamento {
  id: string
  tipo: 'receita' | 'despesa' | 'comissao' | 'pix' | 'mensalidade' | 'assinatura'
  descricao: string
  valor: number
  data: string
  categoria?: string
}

export default function Financeiro() {
  const { empresa, usuario } = useAuth()
  const empresaId = empresa?.id || localStorage.getItem('empresaId') || 'default'
  const [itens, setItens] = useState<Lancamento[]>([])
  const [form, setForm] = useState({
    tipo: 'receita' as Lancamento['tipo'],
    descricao: '',
    valor: '',
    data: new Date().toISOString().slice(0, 10),
    categoria: '',
  })

  useEffect(() => {
    return onSnapshot(collection(db, 'empresas', empresaId, 'financeiro'), (snap) => {
      if (snap.empty) {
        const seeds = [
          { tipo: 'receita', descricao: 'Venda fechada', valor: 5500, data: new Date().toISOString().slice(0, 10), categoria: 'Vendas' },
          { tipo: 'despesa', descricao: 'Ads Meta', valor: 1200, data: new Date().toISOString().slice(0, 10), categoria: 'Marketing' },
          { tipo: 'comissao', descricao: 'Comissão equipe', valor: 800, data: new Date().toISOString().slice(0, 10), categoria: 'RH' },
          { tipo: 'mensalidade', descricao: 'Assinatura plano Pro', valor: 250, data: new Date().toISOString().slice(0, 10), categoria: 'SaaS' },
        ]
        seeds.forEach((s) => addDoc(collection(db, 'empresas', empresaId, 'financeiro'), { ...s, criadoEm: serverTimestamp(), criadoPor: usuario?.nome }).catch(() => {}))
        return
      }
      setItens(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Lancamento)))
    })
  }, [empresaId, usuario?.nome])

  const totais = useMemo(() => {
    const receitas = itens.filter((i) => ['receita', 'pix', 'mensalidade', 'assinatura'].includes(i.tipo)).reduce((s, i) => s + Number(i.valor), 0)
    const despesas = itens.filter((i) => ['despesa', 'comissao'].includes(i.tipo)).reduce((s, i) => s + Number(i.valor), 0)
    return { receitas, despesas, lucro: receitas - despesas }
  }, [itens])

  const criar = async () => {
    if (!form.descricao || !form.valor) return
    await addDoc(collection(db, 'empresas', empresaId, 'financeiro'), {
      ...form,
      valor: Number(form.valor),
      criadoEm: serverTimestamp(),
      criadoPor: usuario?.nome,
    })
    setForm({ tipo: 'receita', descricao: '', valor: '', data: new Date().toISOString().slice(0, 10), categoria: '' })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <DollarSign className="w-8 h-8 text-green-500" /> Financeiro
        </h1>
        <p className="text-slate-500 text-sm">Fluxo · receitas · despesas · comissões · PIX · mensalidades · DRE</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card label="Receitas" value={totais.receitas} icon={TrendingUp} color="text-green-500" />
        <Card label="Despesas" value={totais.despesas} icon={TrendingDown} color="text-red-500" />
        <Card label="Lucro (DRE simplificado)" value={totais.lucro} icon={PieChart} color="text-blue-500" />
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
        <h3 className="font-bold dark:text-white mb-3 flex items-center gap-2"><Plus className="w-4 h-4" /> Novo lançamento</h3>
        <div className="grid md:grid-cols-5 gap-2">
          <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as Lancamento['tipo'] })} className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 dark:text-white text-sm">
            {['receita','despesa','comissao','pix','mensalidade','assinatura'].map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <input placeholder="Descrição" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 dark:text-white text-sm md:col-span-2" />
          <input type="number" placeholder="Valor" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 dark:text-white text-sm" />
          <button type="button" onClick={criar} className="px-3 py-2 bg-blue-500 text-white rounded-lg text-sm">Salvar</button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 border-b border-slate-200 dark:border-slate-700">
              <th className="px-4 py-3">Data</th>
              <th>Tipo</th>
              <th>Descrição</th>
              <th>Categoria</th>
              <th>Valor</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((i) => (
              <tr key={i.id} className="border-b border-slate-100 dark:border-slate-700 dark:text-slate-200">
                <td className="px-4 py-2">{i.data}</td>
                <td className="capitalize">{i.tipo}</td>
                <td>{i.descricao}</td>
                <td>{i.categoria || '—'}</td>
                <td className={['despesa','comissao'].includes(i.tipo) ? 'text-red-500' : 'text-green-600'}>
                  R$ {Number(i.valor).toLocaleString('pt-BR')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Card({ label, value, icon: Icon, color }: { label: string; value: number; icon: typeof DollarSign; color: string }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
      <div className="flex justify-between text-xs text-slate-500 mb-1"><span>{label}</span><Icon className={`w-4 h-4 ${color}`} /></div>
      <div className={`text-2xl font-bold ${color}`}>R$ {value.toLocaleString('pt-BR')}</div>
    </div>
  )
}

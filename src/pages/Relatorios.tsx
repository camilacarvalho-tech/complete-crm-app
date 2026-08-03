import { useState, useEffect, useMemo } from 'react'
import { BarChart3, Download, FileText } from 'lucide-react'
import { collection, onSnapshot } from 'firebase/firestore'
import * as XLSX from 'xlsx'
import { db } from '../firebase'
import { useAuth } from '../contexts/AuthContext'

type Secao = 'clientes' | 'vendas' | 'atendimento' | 'campanhas' | 'ia' | 'discadora' | 'financeiro'

export default function Relatorios() {
  const { empresa } = useAuth()
  const empresaId = empresa?.id || localStorage.getItem('empresaId') || 'default'
  const [secao, setSecao] = useState<Secao>('clientes')
  const [clientes, setClientes] = useState<any[]>([])
  const [campanhas, setCampanhas] = useState<any[]>([])
  const [conversas, setConversas] = useState<any[]>([])
  const [ia, setIa] = useState<any[]>([])
  const [chamadas, setChamadas] = useState<any[]>([])
  const [financeiro, setFinanceiro] = useState<any[]>([])

  useEffect(() => {
    const uns: Array<() => void> = []
    uns.push(onSnapshot(collection(db, 'empresas', empresaId, 'clientes'), (s) => setClientes(s.docs.map((d) => ({ id: d.id, ...d.data() })))))
    uns.push(onSnapshot(collection(db, 'empresas', empresaId, 'campanhas'), (s) => setCampanhas(s.docs.map((d) => ({ id: d.id, ...d.data() })))))
    uns.push(onSnapshot(collection(db, 'empresas', empresaId, 'conversas'), (s) => setConversas(s.docs.map((d) => ({ id: d.id, ...d.data() })))))
    uns.push(onSnapshot(collection(db, 'empresas', empresaId, 'iaPesquisas'), (s) => setIa(s.docs.map((d) => ({ id: d.id, ...d.data() })))))
    uns.push(onSnapshot(collection(db, 'empresas', empresaId, 'chamadas'), (s) => setChamadas(s.docs.map((d) => ({ id: d.id, ...d.data() })))))
    uns.push(onSnapshot(collection(db, 'empresas', empresaId, 'financeiro'), (s) => setFinanceiro(s.docs.map((d) => ({ id: d.id, ...d.data() })))))
    return () => uns.forEach((u) => u())
  }, [empresaId])

  const rows = useMemo(() => {
    switch (secao) {
      case 'clientes':
        return clientes.map((c) => ({
          Nome: c.nome, Telefone: c.telefone || c.whatsapp, Pipeline: c.pipeline || c.status,
          Origem: c.origem, Responsavel: c.atendente || c.responsavel, Score: c.score,
        }))
      case 'vendas':
        return clientes
          .filter((c) => ['Proposta', 'Negociação', 'Contrato', 'Pago'].includes(c.pipeline || c.status))
          .map((c) => ({
            Cliente: c.nome, Etapa: c.pipeline || c.status,
            Valor: c.valorProposta || 0, Responsavel: c.atendente || c.responsavel,
          }))
      case 'atendimento':
        return conversas.map((c) => ({
          Nome: c.nome, Telefone: c.telefone, Ultima: c.ultimaMensagem,
          NaoLidas: c.naoLidas, Tags: (c.tags || []).join(', '),
        }))
      case 'campanhas':
        return campanhas.map((c) => ({
          Nome: c.nome, Canal: c.canal, Status: c.status,
          Enviadas: c.enviadas, Entregues: c.entregues, Lidas: c.lidas,
          Respondidas: c.respondidas, Convertidas: c.convertidas, Erros: c.erros,
        }))
      case 'ia':
        return ia.map((p) => ({
          Nicho: p.nicho, Leads: p.leadsEncontrados, Score: p.scoreMedio,
          Oportunidade: p.oportunidade, Recomendacao: p.recomendacao,
        }))
      case 'discadora':
        return chamadas.map((c) => ({
          Nome: c.nome, Telefone: c.telefone, Status: c.status,
          Resultado: c.resultado, Duracao: c.duracaoSeg, Gravacao: c.gravacaoUrl ? 'Sim' : 'Não',
        }))
      case 'financeiro':
        return financeiro.map((f) => ({
          Tipo: f.tipo, Categoria: f.categoria, Descricao: f.descricao,
          Valor: f.valor, Status: f.status, Data: f.data,
        }))
      default:
        return []
    }
  }, [secao, clientes, campanhas, conversas, ia, chamadas, financeiro])

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, secao)
    XLSX.writeFile(wb, `Relatorio_${secao}_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  const exportCSV = () => {
    if (!rows.length) return
    const keys = Object.keys(rows[0])
    const lines = [keys.join(','), ...rows.map((r) => keys.map((k) => JSON.stringify((r as any)[k] ?? '')).join(','))]
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `Relatorio_${secao}.csv`
    a.click()
  }

  const exportPDF = () => {
    const w = window.open('', '_blank')
    if (!w) return
    const html = `<html><head><title>Relatório ${secao}</title>
      <style>body{font-family:sans-serif;padding:24px}table{border-collapse:collapse;width:100%;font-size:12px}
      th,td{border:1px solid #ccc;padding:6px;text-align:left}h1{font-size:18px}</style></head>
      <body><h1>Relatório — ${secao}</h1><table><thead><tr>${Object.keys(rows[0] || { Info: '' }).map((k) => `<th>${k}</th>`).join('')}</tr></thead>
      <tbody>${rows.map((r) => `<tr>${Object.values(r).map((v) => `<td>${v ?? ''}</td>`).join('')}</tr>`).join('')}</tbody></table>
      <script>window.print()</script></body></html>`
    w.document.write(html)
    w.document.close()
  }

  const secoes: { id: Secao; label: string }[] = [
    { id: 'clientes', label: 'Clientes' },
    { id: 'vendas', label: 'Vendas' },
    { id: 'atendimento', label: 'Atendimento' },
    { id: 'campanhas', label: 'Campanhas' },
    { id: 'ia', label: 'IA' },
    { id: 'discadora', label: 'Discadora' },
    { id: 'financeiro', label: 'Financeiro' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-8 h-8 text-blue-500" /> Relatórios
          </h1>
          <p className="text-slate-500 text-sm">Exportação PDF · Excel · CSV</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={exportPDF} className="px-3 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-sm flex items-center gap-1"><FileText className="w-4 h-4" /> PDF</button>
          <button type="button" onClick={exportExcel} className="px-3 py-2 rounded-lg bg-green-500 text-white text-sm flex items-center gap-1"><Download className="w-4 h-4" /> Excel</button>
          <button type="button" onClick={exportCSV} className="px-3 py-2 rounded-lg bg-blue-500 text-white text-sm flex items-center gap-1"><Download className="w-4 h-4" /> CSV</button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {secoes.map((s) => (
          <button key={s.id} type="button" onClick={() => setSecao(s.id)} className={`px-3 py-1.5 rounded-lg text-sm ${secao === s.id ? 'bg-blue-500 text-white' : 'bg-slate-100 dark:bg-slate-800 dark:text-slate-300'}`}>
            {s.label}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 border-b border-slate-200 dark:border-slate-700">
              {Object.keys(rows[0] || { Info: '' }).map((k) => (
                <th key={k} className="px-4 py-3">{k}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td className="px-4 py-6 text-slate-500" colSpan={8}>Sem dados nesta seção</td></tr>
            ) : (
              rows.map((r, i) => (
                <tr key={i} className="border-b border-slate-100 dark:border-slate-700 dark:text-slate-200">
                  {Object.values(r).map((v, j) => (
                    <td key={j} className="px-4 py-2">{String(v ?? '')}</td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

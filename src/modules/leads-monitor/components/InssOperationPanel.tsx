import type { FiltrosPesquisa } from '../types'
import { INSS_CAMPANHAS, INSS_PRODUTOS } from '../pipeline/inssQualify'
import { BANCO_TODOS, BANCOS_MONITOR, bancoOptionLabel } from '../catalog/bancosMonitor'
import { BENEFICIOS_CONSIGNAVEIS } from '../constants'

export function InssOperationPanel({
  filtros,
  onChange,
}: {
  filtros: FiltrosPesquisa
  onChange: (next: FiltrosPesquisa) => void
}) {
  if (filtros.operacao !== 'INSS') return null
  const produtos = filtros.produtos || []
  const toggle = (id: string) => {
    const next = produtos.includes(id) ? produtos.filter((p) => p !== id) : [...produtos, id]
    onChange({ ...filtros, produtos: next })
  }
  return (
    <div className="rounded-xl border border-violet-200 dark:border-violet-500/30 bg-violet-50/50 dark:bg-violet-500/5 p-4 space-y-3">
      <div className="text-sm font-semibold">Operação INSS</div>
      <p className="text-[11px] text-slate-500">
        Tipo de beneficiário vem da base autorizada. Idade não infere aposentado/pensionista. Quantidade de benefícios consignáveis não é inventada.
      </p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <label className="text-xs text-slate-500">Tipo de beneficiário</label>
          <select
            value={filtros.tipoBeneficiario || 'todos'}
            onChange={(e) => onChange({ ...filtros, tipoBeneficiario: e.target.value as FiltrosPesquisa['tipoBeneficiario'] })}
            className="w-full mt-1 px-3 py-2 rounded-lg bg-white dark:bg-slate-700 text-sm"
          >
            <option value="todos">Todos</option>
            <option value="aposentado">Aposentado</option>
            <option value="pensionista">Pensionista</option>
            <option value="outro">Outro</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500">Idade mínima</label>
          <input
            type="number"
            value={filtros.idadeMinima ?? ''}
            onChange={(e) => onChange({ ...filtros, idadeMinima: e.target.value ? Number(e.target.value) : null })}
            className="w-full mt-1 px-3 py-2 rounded-lg bg-white dark:bg-slate-700 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-slate-500">Idade máxima</label>
          <input
            type="number"
            value={filtros.idadeMaxima ?? ''}
            onChange={(e) => onChange({ ...filtros, idadeMaxima: e.target.value ? Number(e.target.value) : null })}
            className="w-full mt-1 px-3 py-2 rounded-lg bg-white dark:bg-slate-700 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-slate-500">Situação do benefício</label>
          <input
            value={filtros.situacaoBeneficio || ''}
            onChange={(e) => onChange({ ...filtros, situacaoBeneficio: e.target.value })}
            placeholder="Ex: Ativo"
            className="w-full mt-1 px-3 py-2 rounded-lg bg-white dark:bg-slate-700 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-slate-500">Nascimento de</label>
          <input
            type="date"
            value={filtros.dataNascimentoInicial || ''}
            onChange={(e) => onChange({ ...filtros, dataNascimentoInicial: e.target.value })}
            className="w-full mt-1 px-3 py-2 rounded-lg bg-white dark:bg-slate-700 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-slate-500">Nascimento até</label>
          <input
            type="date"
            value={filtros.dataNascimentoFinal || ''}
            onChange={(e) => onChange({ ...filtros, dataNascimentoFinal: e.target.value })}
            className="w-full mt-1 px-3 py-2 rounded-lg bg-white dark:bg-slate-700 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-slate-500">Banco</label>
          <select
            value={filtros.banco || BANCO_TODOS}
            onChange={(e) => onChange({ ...filtros, banco: e.target.value })}
            className="w-full mt-1 px-3 py-2 rounded-lg bg-white dark:bg-slate-700 text-sm"
          >
            <option value={BANCO_TODOS}>Todos</option>
            {BANCOS_MONITOR.map((b) => (
              <option key={b.bankId} value={b.bankId}>{bancoOptionLabel(b)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500">Número de benefícios consignáveis</label>
          <select
            value={filtros.beneficiosConsignaveis || 'todos'}
            onChange={(e) => onChange({ ...filtros, beneficiosConsignaveis: e.target.value as FiltrosPesquisa['beneficiosConsignaveis'] })}
            className="w-full mt-1 px-3 py-2 rounded-lg bg-white dark:bg-slate-700 text-sm"
          >
            {BENEFICIOS_CONSIGNAVEIS.map((o) => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500">Campanha pronta</label>
          <select
            value={filtros.campanha || ''}
            onChange={(e) => onChange({ ...filtros, campanha: e.target.value })}
            className="w-full mt-1 px-3 py-2 rounded-lg bg-white dark:bg-slate-700 text-sm"
          >
            <option value="">—</option>
            {INSS_CAMPANHAS.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {INSS_PRODUTOS.map((p) => (
          <label key={p.id} className="text-xs flex items-center gap-1.5 bg-white dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
            <input type="checkbox" checked={produtos.includes(p.id)} onChange={() => toggle(p.id)} />
            {p.label}
          </label>
        ))}
      </div>
    </div>
  )
}

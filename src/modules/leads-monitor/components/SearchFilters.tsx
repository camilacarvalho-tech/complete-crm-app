import { Search } from 'lucide-react'
import type { FiltrosPesquisa } from '../types'
import { FAIXAS_FUNCIONARIOS } from '../constants'
import { MonitorGeoFilters } from './MonitorGeoFilters'
import { InssOperationPanel } from './InssOperationPanel'
import { FontesCapturaCheckboxes } from './FontesCapturaCheckboxes'
import { SegmentContextPanel } from './SegmentContextPanel'
import { consultarCep } from '../services/locationService'

export function SearchFilters(props: {
  filtros: FiltrosPesquisa
  onChange: (next: FiltrosPesquisa) => void
  cepMsg: string
  onCepMsg: (msg: string) => void
}) {
  const { filtros, onChange } = props
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
        <Search className="w-4 h-4" /> Contexto da campanha
      </div>
      <p className="text-[11px] text-slate-500">
        Segmento → contexto → função/produto → localização → palavras-chave → fontes. Nada dispara busca sozinho.
      </p>

      <SegmentContextPanel filtros={filtros} onChange={onChange} />

      <div
        className="rounded-xl p-4 border space-y-3"
        style={{ background: 'var(--code-surface)', borderColor: 'var(--code-border)' }}
      >
        <div className="text-sm font-semibold text-white">Localização</div>
        <p className="text-[11px] text-slate-500">País → estado → cidade (IBGE) → bairro → CEP (ViaCEP). Bairros não são inventados.</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <MonitorGeoFilters filtros={filtros} onChange={onChange} />
          <div>
            <label className="text-xs text-slate-500">Bairro</label>
            <input
              value={filtros.bairro || ''}
              onChange={(e) => onChange({ ...filtros, bairro: e.target.value })}
              placeholder="Opcional"
              className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 dark:text-white text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500">CEP</label>
            <input
              value={filtros.cep || ''}
              onChange={(e) => {
                props.onCepMsg('')
                onChange({ ...filtros, cep: e.target.value })
              }}
              onBlur={async () => {
                const cep = (filtros.cep || '').replace(/\D/g, '')
                if (!cep) return
                const r = await consultarCep(filtros.cep || '')
                if (!r.ok) {
                  props.onCepMsg(r.erro || 'CEP não localizado.')
                  return
                }
                props.onCepMsg('')
                onChange({
                  ...filtros,
                  estado: r.uf || filtros.estado,
                  cidade: r.cidade || filtros.cidade,
                  bairro: r.bairro || filtros.bairro,
                })
              }}
              placeholder="00000-000"
              className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 dark:text-white text-sm"
            />
            {props.cepMsg ? <p className="text-[10px] text-amber-500 mt-1">{props.cepMsg}</p> : null}
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="sm:col-span-2">
          <label className="text-xs text-slate-500">Palavras-chave (editáveis)</label>
          <input
            value={filtros.palavraChave}
            onChange={(e) => onChange({ ...filtros, palavraChave: e.target.value })}
            placeholder="Sugestões mudam com o contexto — você pode editar"
            className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 dark:text-white text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-slate-500">Quantidade de funcionários</label>
          <select
            value={filtros.faixaFuncionarios || 'qualquer'}
            onChange={(e) =>
              onChange({
                ...filtros,
                faixaFuncionarios: e.target.value as (typeof FAIXAS_FUNCIONARIOS)[number]['id'],
              })
            }
            className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 dark:text-white text-sm"
          >
            {FAIXAS_FUNCIONARIOS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500">Score mínimo</label>
          <input
            type="number"
            min={0}
            max={100}
            value={filtros.scoreMinimo ?? 70}
            onChange={(e) => onChange({ ...filtros, scoreMinimo: Number(e.target.value) || 0 })}
            className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 dark:text-white text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-slate-500">Limite</label>
          <input
            type="number"
            min={1}
            max={100}
            value={filtros.maxResultsPerCycle ?? 10}
            onChange={(e) =>
              onChange({
                ...filtros,
                maxResultsPerCycle: Math.min(100, Math.max(1, Number(e.target.value) || 10)),
              })
            }
            className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 dark:text-white text-sm"
          />
        </div>
      </div>

      <FontesCapturaCheckboxes
        value={filtros.fontesHabilitadas || []}
        onChange={(fontesHabilitadas) => onChange({ ...filtros, fontesHabilitadas })}
      />
      <InssOperationPanel filtros={filtros} onChange={onChange} />
    </div>
  )
}

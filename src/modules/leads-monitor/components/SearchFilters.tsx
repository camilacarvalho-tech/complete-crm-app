import { Search } from 'lucide-react'
import type { FiltrosPesquisa } from '../types'
import { FAIXAS_FUNCIONARIOS } from '../constants'
import { MonitorGeoFilters } from './MonitorGeoFilters'
import { InssOperationPanel } from './InssOperationPanel'
import { FontesCapturaCheckboxes } from './FontesCapturaCheckboxes'
import { SegmentContextPanel } from './SegmentContextPanel'
import { consultarCep } from '../services/locationService'
import { LIMITES_BUSCA_PRESETS, produtoPorOperacao } from '../catalog/produtosMonitor'
import { listPersonSourceDescriptors } from '../person/personSourceRegistry'
import { cardIdFromFiltros } from '../catalog/segmentosMonitor'

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
          <label className="text-xs text-slate-500">Limite (por ciclo / fonte)</label>
          <div className="flex flex-wrap gap-1 mt-1">
            {LIMITES_BUSCA_PRESETS.map((n) => (
              <button
                key={n}
                type="button"
                className={`text-[11px] px-2 py-1 rounded-md border ${
                  (filtros.maxResultsPerCycle || 0) === n ? 'border-orange-400 text-orange-200' : 'border-slate-600 text-slate-400'
                }`}
                onClick={() => onChange({ ...filtros, maxResultsPerCycle: n })}
              >
                {n.toLocaleString('pt-BR')}
              </button>
            ))}
          </div>
          <input
            type="number"
            min={1}
            max={5000}
            value={filtros.maxResultsPerCycle ?? 100}
            onChange={(e) =>
              onChange({
                ...filtros,
                maxResultsPerCycle: Math.min(5000, Math.max(1, Number(e.target.value) || 100)),
              })
            }
            className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 dark:text-white text-sm"
          />
          <p className="text-[10px] text-slate-500 mt-1">
            Personalizado até 5.000. A fonte pode devolver menos (OSM ~80/cidade, Places ~100). Não completa com registros inventados.
          </p>
        </div>
      </div>

      <FontesCapturaCheckboxes
        value={filtros.fontesHabilitadas || []}
        onChange={(fontesHabilitadas) => onChange({ ...filtros, fontesHabilitadas })}
      />

      {cardIdFromFiltros(filtros) !== 'clinicas' ? (
      <div
        className="rounded-xl p-4 border space-y-3"
        style={{ background: 'var(--code-surface)', borderColor: 'var(--code-border)' }}
      >
        <div className="text-sm font-semibold text-white">Tipo de busca</div>
        <div className="flex flex-wrap gap-2">
          {(
            [
              { id: 'empresa' as const, label: 'Empresa' },
              { id: 'pessoa' as const, label: 'Pessoa' },
              { id: 'empresa_funcionarios' as const, label: 'Empresa → Funcionários' },
            ] as const
          ).map((opt) => {
            const checked = (filtros.tipoBusca || 'empresa') === opt.id
            return (
              <button
                key={opt.id}
                type="button"
                className={`text-[11px] px-3 py-1.5 rounded-lg border ${
                  checked ? 'border-orange-400 text-orange-100' : 'border-slate-600 text-slate-400'
                }`}
                onClick={() => onChange({ ...filtros, tipoBusca: opt.id })}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
        {(filtros.tipoBusca === 'pessoa' || filtros.tipoBusca === 'empresa_funcionarios') ? (
          <>
        <div className="text-sm font-semibold text-white pt-2">Fontes de pessoas</div>
        <div className="space-y-1.5">
          {listPersonSourceDescriptors().map((src) => {
            const selected = (filtros.personSourcesHabilitadas || []).includes(src.id)
            return (
              <label key={src.id} className="flex items-start gap-2 text-[11px] text-slate-300">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={selected}
                  onChange={(e) => {
                    const cur = filtros.personSourcesHabilitadas || []
                    const next = e.target.checked ? [...cur, src.id] : cur.filter((x) => x !== src.id)
                    onChange({ ...filtros, personSourcesHabilitadas: next })
                  }}
                />
                <span>
                  {src.label}{' '}
                  <span
                    className={
                      src.health === 'ATIVA' || src.health === 'CONFIGURADA'
                        ? 'text-emerald-400'
                        : src.health === 'ERRO'
                          ? 'text-red-400'
                          : 'text-amber-400'
                    }
                  >
                    {src.health === 'NAO_CONFIGURADA' ? 'NÃO CONFIGURADA' : src.health}
                  </span>
                  <span className="block text-slate-500">{src.note}</span>
                </span>
              </label>
            )
          })}
        </div>
          </>
        ) : null}
      </div>
      ) : (
        <p className="text-[11px] text-slate-500">
          Busca de clínicas: empresas do município. Pessoas entram depois por planilha + enriquecimento autorizado.
        </p>
      )}
      {(() => {
        const prod = produtoPorOperacao(filtros.operacao)
        if (!prod) return null
        return (
          <div className="rounded-xl border px-3 py-2 text-[11px] text-slate-400" style={{ borderColor: 'var(--code-border)' }}>
            <p>
              Produto <span className="text-slate-200 font-semibold">{prod.name}</span> · {prod.searchStrategy}
            </p>
            {prod.personSourceStatus === 'not_configured' ? (
              <p className="text-amber-400 mt-1">
                Fonte de pessoas não configurada.{' '}
                <a className="underline" href="/leads-monitor?aba=fontes">
                  Configurar fonte
                </a>
              </p>
            ) : (
              <p className="mt-1">{prod.personSourceNote}</p>
            )}
          </div>
        )
      })()}
      <InssOperationPanel filtros={filtros} onChange={onChange} />
    </div>
  )
}

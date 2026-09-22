import type { FiltrosPesquisa } from '../types'
import {
  GRUPOS_PRODUTO_CREDITO,
  aplicarCardSegmento,
  aplicarFuncaoInss,
  aplicarProdutoCredito,
  cardIdFromFiltros,
  defDoCard,
  funcoesDoContexto,
  keywordsSugeridas,
  segmentosDaBuscaManual,
  type SegmentoMonitorId,
} from '../catalog/segmentosMonitor'

function toggle(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id]
}

function Chip({
  id,
  label,
  checked,
  onToggle,
}: {
  id: string
  label: string
  checked: boolean
  onToggle: (id: string, next: boolean) => void
}) {
  return (
    <label
      className={`text-xs px-2.5 py-1.5 rounded-lg border cursor-pointer ${
        checked ? 'border-yellow-400 bg-yellow-400/10 text-yellow-100' : 'border-slate-600 text-slate-300'
      }`}
    >
      <input
        type="checkbox"
        className="mr-1.5 align-middle"
        checked={checked}
        onChange={(e) => onToggle(id, e.target.checked)}
      />
      {label}
    </label>
  )
}

export function SegmentContextPanel({
  filtros,
  onChange,
}: {
  filtros: FiltrosPesquisa
  onChange: (next: FiltrosPesquisa) => void
}) {
  const cardId = cardIdFromFiltros(filtros)
  const def = defDoCard(cardId)
  const contextos = filtros.contextosSegmento || []
  const produtos = filtros.produtos || []
  const cargos = filtros.cargos || []
  const funcoes = funcoesDoContexto(def, cardId === 'credito' ? produtos : contextos)

  const escolherCard = (id: SegmentoMonitorId) => {
    onChange(aplicarCardSegmento(filtros, id))
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="text-sm font-semibold text-white">Segmento</div>
        <p className="text-[11px] text-slate-500 mt-0.5">
          Escolha o contexto. Mercados e Empresas genéricos não são oferecidos; registros antigos permanecem.
        </p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {segmentosDaBuscaManual().map((s) => {
          const active = cardId === s.id
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => escolherCard(s.id)}
              className="rounded-xl p-3 text-left border transition-colors"
              style={{
                background: active ? 'color-mix(in srgb, var(--code-yellow) 14%, #0b1220)' : 'var(--code-surface)',
                borderColor: active ? s.accent : 'var(--code-border)',
              }}
            >
              <div className="text-xl">{s.emoji}</div>
              <div className="text-xs font-semibold text-white mt-1 uppercase tracking-wide">{s.label}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">{s.descricao}</div>
            </button>
          )
        })}
      </div>

      {def && (
        <div
          className="rounded-xl p-4 border space-y-3"
          style={{ background: 'var(--code-surface)', borderColor: def.accent }}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm font-semibold text-white">
              {def.emoji} {def.label}
              {def.pergunta ? ` · ${def.pergunta}` : ''}
            </div>
            <button type="button" className="text-[11px] text-slate-400 underline" onClick={() => onChange({ ...filtros, segmento: '', operacao: '', contextosSegmento: [], produtos: [] })}>
              Trocar segmento
            </button>
          </div>

          {def.opcoes && cardId !== 'credito' && (
            <div className="flex flex-wrap gap-2">
              {def.opcoes.filter((o) => !o.hidden).map((o) => (
                <Chip
                  key={o.id}
                  id={o.id}
                  label={o.label}
                  checked={contextos.includes(o.id)}
                  onToggle={(id, next) => {
                    const nextCtx = next ? [...contextos, id] : contextos.filter((x) => x !== id)
                    onChange({
                      ...filtros,
                      contextosSegmento: nextCtx,
                      subsegment: nextCtx[0] || '',
                      segmento: cardId === 'clinicas' ? 'clinicas' : filtros.segmento,
                      tipoBusca: cardId === 'clinicas' ? 'empresa' : filtros.tipoBusca,
                      palavraChave: keywordsSugeridas(def, nextCtx) || filtros.palavraChave,
                    })
                  }}
                />
              ))}
            </div>
          )}

          {cardId === 'clinicas' ? (
            <label className="flex items-center gap-2 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={filtros.campaignContext === 'MENTORIA_CLINICAS'}
                onChange={(e) =>
                  onChange({
                    ...filtros,
                    campaignContext: e.target.checked ? 'MENTORIA_CLINICAS' : '',
                    tipoBusca: 'empresa',
                    segmento: 'clinicas',
                  })
                }
              />
              Buscar clínicas para mentoria
            </label>
          ) : null}

          {cardId === 'credito' && def.opcoes && (
            <div className="space-y-3">
              {GRUPOS_PRODUTO_CREDITO.map((grupo) => {
                const ops = (def.opcoes || []).filter((o) => grupo.opcaoIds.includes(o.id))
                if (!ops.length) return null
                return (
                  <div key={grupo.label}>
                    <div className="text-[10px] font-semibold tracking-wide text-slate-400 mb-1.5">{grupo.label}</div>
                    <div className="flex flex-wrap gap-2">
                      {ops.map((o) => (
                        <Chip
                          key={o.id}
                          id={o.id}
                          label={o.label}
                          checked={produtos.includes(o.id)}
                          onToggle={(id, next) => onChange(aplicarProdutoCredito(filtros, id, next))}
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {funcoes.length > 0 && cardId !== 'clinicas' && (
            <div>
              <div className="text-xs text-slate-400 mb-2">Funções / contexto específico</div>
              <div className="flex flex-wrap gap-2">
                {funcoes.map((f) => (
                  <Chip
                    key={f.id}
                    id={f.id}
                    label={f.label}
                    checked={cargos.includes(f.id) || contextos.includes(f.id)}
                    onToggle={(id) => {
                      if (cardId === 'credito' && produtos.includes('INSS')) {
                        onChange(aplicarFuncaoInss(filtros, id))
                        return
                      }
                      const inCargos = cargos.includes(id)
                      onChange({
                        ...filtros,
                        cargos: toggle(cargos, id),
                        contextosSegmento: inCargos || contextos.includes(id) ? toggle(contextos, id) : [...contextos, id],
                        tipoBeneficiario:
                          id === 'Aposentado' ? 'aposentado' : id === 'Pensionista' ? 'pensionista' : filtros.tipoBeneficiario,
                      })
                    }}
                  />
                ))}
              </div>
              <p className="text-[10px] text-slate-500 mt-2">
                A busca empresarial localiza o estabelecimento. Dados pessoais de profissionais só entram se a fonte/finalidade permitir.
              </p>
            </div>
          )}

          {def.livre && (
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500">Nome do segmento</label>
                <input
                  value={filtros.segmentoCustomNome || ''}
                  onChange={(e) => onChange({ ...filtros, segmentoCustomNome: e.target.value, campanha: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-800 text-white text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500">Categoria</label>
                <input
                  value={filtros.segmentoCustomCategoria || ''}
                  onChange={(e) => onChange({ ...filtros, segmentoCustomCategoria: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-800 text-white text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs text-slate-500">Funções / termos</label>
                <input
                  value={(filtros.cargos || []).join(', ')}
                  onChange={(e) =>
                    onChange({
                      ...filtros,
                      cargos: e.target.value.split(',').map((x) => x.trim()).filter(Boolean),
                    })
                  }
                  placeholder="Separe por vírgula"
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-800 text-white text-sm"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

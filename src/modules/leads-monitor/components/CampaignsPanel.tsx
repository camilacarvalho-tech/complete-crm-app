import { useState } from 'react'
import { Pause, Play, Plus, RefreshCw, Trash2 } from 'lucide-react'
import type { PesquisaSalva } from '../types'
import { FontesCapturaCheckboxes } from './FontesCapturaCheckboxes'
import { FONTES_CAPTURA_CAMPANHA } from '../services/fontesCampanha'
import { formatMonitorDateTime } from '../utils/datetime'

export function CampaignsPanel(props: {
  pesquisas: PesquisaSalva[]
  buscando: boolean
  onNova: () => void
  onEdit: (p: PesquisaSalva) => void
  onToggleAuto: (p: PesquisaSalva) => void
  onRun: (p: PesquisaSalva) => void
  onRemove: (p: PesquisaSalva) => void
  onUpdateFontes: (p: PesquisaSalva, fontesHabilitadas: string[]) => void
}) {
  const ativas = props.pesquisas.filter((p) => p.ativa).length
  const pausadas = props.pesquisas.length - ativas
  const [aberta, setAberta] = useState<string | null>(props.pesquisas[0]?.id || null)
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-white">🎯 Campanhas</h2>
          <p className="text-xs text-slate-400">
            {ativas} ativas · {pausadas} pausadas · {props.pesquisas.length} no total. Base: pesquisas salvas.
          </p>
          <p className="text-xs text-amber-400 mt-1">
            A execução automática das campanhas do Leads Monitor depende deste navegador (AUTO_SEARCH_ENABLED). Não há worker persistente em produção neste repositório: se o computador for desligado, a campanha não continua sozinha.
          </p>
        </div>
        <button
          type="button"
          onClick={props.onNova}
          className="px-3 py-2 rounded-lg bg-nexus-orange text-white text-sm font-semibold flex items-center gap-1"
        >
          <Plus className="w-4 h-4" /> Nova campanha
        </button>
      </div>
      {!props.pesquisas.length ? (
        <div
          className="rounded-xl p-6 border text-sm text-slate-400"
          style={{ background: 'var(--code-surface)', borderColor: 'var(--code-border)' }}
        >
          Nenhuma campanha salva. Clique em Nova campanha para configurar segmento, localização e fontes.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {props.pesquisas.map((p) => (
            <CampaignCard
              key={p.id}
              pesquisa={p}
              aberta={aberta === p.id}
              onOpen={() => setAberta(p.id)}
              {...props}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function CampaignCard({
  pesquisa: p,
  buscando,
  aberta,
  onOpen,
  onEdit,
  onToggleAuto,
  onRun,
  onRemove,
  onUpdateFontes,
}: {
  pesquisa: PesquisaSalva
  aberta: boolean
  onOpen: () => void
} & Omit<Parameters<typeof CampaignsPanel>[0], 'pesquisas' | 'onNova'>) {
  const fontes = p.fontesHabilitadas || []
  return (
    <article
      className="rounded-xl p-4 border space-y-3"
      style={{ background: 'var(--code-surface)', borderColor: aberta ? 'var(--code-yellow)' : 'var(--code-border)' }}
    >
      <button type="button" className="w-full text-left" onClick={onOpen}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-sm font-semibold text-white">🎯 {p.nome}</div>
            <div className="text-[11px] text-slate-500 mt-1">
              {[p.segmento, p.operacao, p.estado, p.cidade, p.bairro, p.cep].filter(Boolean).join(' · ') || 'Sem localização'}
            </div>
          </div>
          <span className={`text-[10px] px-2 py-0.5 rounded-full ${p.ativa ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700 text-slate-400'}`}>
            {p.ativa ? 'Ativa' : 'Pausada'}
          </span>
        </div>
      </button>
      <div className="text-[11px] text-slate-500">
        Leads {p.encontrados || 0} · novos {p.novos || 0} · duplicados {p.duplicados || 0}
        {p.ultimaExecucao ? ` · última ${formatMonitorDateTime(p.ultimaExecucao)}` : ''}
        {p.proximaExecucao ? ` · próxima ${formatMonitorDateTime(p.proximaExecucao)}` : ''}
      </div>
      {aberta && (
        <>
          <FontesCapturaCheckboxes value={fontes} onChange={(next) => onUpdateFontes(p, next)} />
          <div className="text-[11px] text-slate-500">
            Fontes:{' '}
            {fontes.length
              ? FONTES_CAPTURA_CAMPANHA.filter((f) => fontes.includes(f.id)).map((f) => f.label).join(', ')
              : 'todas as executáveis'}
          </div>
        </>
      )}
      <div className="flex flex-wrap gap-1.5">
        <button type="button" onClick={() => onEdit(p)} className="text-xs px-2 py-1 rounded-md bg-slate-700 text-white">
          Editar
        </button>
        <button
          type="button"
          onClick={() => onToggleAuto(p)}
          className="text-xs px-2 py-1 rounded-md bg-slate-800 text-slate-200 flex items-center gap-1"
        >
          {p.ativa ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          {p.ativa ? 'Auto ON' : 'Auto OFF'}
        </button>
        <button
          type="button"
          disabled={buscando}
          onClick={() => onRun(p)}
          className="text-xs px-2 py-1 rounded-md bg-nexus-orange text-white flex items-center gap-1"
        >
          <RefreshCw className="w-3 h-3" /> Rodar
        </button>
        <button type="button" onClick={() => onRemove(p)} className="text-xs px-2 py-1 rounded-md text-slate-400">
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </article>
  )
}

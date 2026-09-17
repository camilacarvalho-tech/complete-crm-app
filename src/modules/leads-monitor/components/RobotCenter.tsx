import { ROBOS_MONITOR } from '../types/robot'
import { statusDoRobo } from '../services/robotService'
import type { ProcessRun } from '../types/processRun'

const DOT: Record<string, string> = {
  executando: '🟢 Executando',
  pausado: '🟡 Pausado',
  aguardando: '⚪ Aguardando',
  erro: '🔴 Erro',
  parado: '⚫ Parado',
}

export function RobotCenter({ run }: { run: ProcessRun | null }) {
  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold text-white">🤖 Central de robôs</h2>
        <p className="text-xs text-slate-400 mt-1">
          Fluxo do mesmo ProcessRun: Busca → Enriquecimento → Classificação → CRM. Um único RobotPanel.
        </p>
        <div className="text-xs text-yellow-200/80 mt-2">🔎 Busca → 🧠 Enriquecimento → 🎯 Classificação → 🔗 CRM</div>
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        {ROBOS_MONITOR.map((robo) => {
          const status = statusDoRobo(run, robo.id)
          return (
            <div
              key={robo.id}
              className="rounded-xl p-4 border"
              style={{ background: 'var(--code-surface)', borderColor: 'var(--code-border)' }}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="font-semibold text-white text-sm">🤖 {robo.nome}</div>
                <span className="text-[11px] text-slate-300">{DOT[status]}</span>
              </div>
              <p className="text-xs text-slate-400 mt-2">{robo.responsabilidade}</p>
              {robo.futuro ? (
                <p className="text-[11px] text-amber-400 mt-2">Preparado para o futuro — sem ação automática.</p>
              ) : (
                <div className="mt-3 text-[11px] text-slate-500 space-y-0.5">
                  <div>Campanha: {run?.nome || '—'}</div>
                  <div>
                    Local: {String(run?.filtrosSnapshot?.estado || '—')} → {run?.cidadeAtual || '—'}
                    {run?.geoBairro ? ` → ${run.geoBairro}` : ''}
                  </div>
                  <div>CEP: {String(run?.geoCep || run?.filtrosSnapshot?.cep || '—')}</div>
                  <div>Progresso: {run?.progresso || 0}%</div>
                  <div>
                    Encontrados {run?.validos || 0} · duplicados {run?.duplicados || 0} · erros {run?.erros || 0}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

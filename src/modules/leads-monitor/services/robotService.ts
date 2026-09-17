import type { ProcessRun } from '../types/processRun'
import { ROBOS_MONITOR, robotStatusFromProcess, type RobotKind, type RobotUiStatus } from '../types/robot'

export { ROBOS_MONITOR, robotStatusFromProcess }

export function etapaDoRobo(run: ProcessRun | null, kind: RobotKind): boolean {
  const etapa = String(run?.etapaAtual || '').toLowerCase()
  if (!run) return false
  if (kind === 'busca') return /busc|receb|normal|valid|dedup|cidade|osm/.test(etapa) || run.status === 'processando'
  if (kind === 'enriquecimento') return /enriq/.test(etapa)
  if (kind === 'classificacao') return /qualif|classif|score/.test(etapa)
  if (kind === 'crm') return /finaliz|crm/.test(etapa)
  return false
}

export function statusDoRobo(run: ProcessRun | null, kind: RobotKind): RobotUiStatus {
  if (kind === 'followup') return 'parado'
  const base = robotStatusFromProcess(run?.status)
  if (base === 'executando' && !etapaDoRobo(run, kind) && kind !== 'busca') return 'aguardando'
  return base
}

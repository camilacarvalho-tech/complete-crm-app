import type { LogCanal, LogLinha } from '../types/logs'

const SECRET = /token|secret|password|senha|apikey|api_key|bearer/i

function canalFromAction(action: string, level?: string): LogCanal {
  const a = action.toLowerCase()
  if (level === 'error' || /fail|erro/.test(a)) return 'erro'
  if (/warn|aviso/.test(a)) return 'aviso'
  if (/lgpd|consent|titular/.test(a)) return 'lgpd'
  if (/esc|overlay/.test(a)) return 'esc'
  if (/crm|send_crm|approve/.test(a)) return 'crm'
  if (/enriq|enrich/.test(a)) return 'enriquecimento'
  if (/classif|score|qualif/.test(a)) return 'classificacao'
  if (/search|job|geo|osm|busca/.test(a)) return 'busca'
  return 'sistema'
}

export function linhasDeLog(items: Array<Record<string, unknown> & { id: string }>): LogLinha[] {
  return items
    .map((item) => {
      const acao = String(item.action || item.acao || item.level || 'evento')
      const mensagem = String(item.message || item.mensagem || acao)
      if (SECRET.test(mensagem) || SECRET.test(acao)) {
        return null
      }
      const meta = (item.meta || {}) as Record<string, unknown>
      return {
        id: item.id,
        timestamp: item.at || item.criadoEm,
        hora: String(item.hora || ''),
        canal: canalFromAction(`${acao} ${mensagem} ${item.connectorId || ''} ${item.level || ''}`, String(item.level || '')),
        robotId: String(meta.robotId || ''),
        campaignId: String(meta.processRunId || meta.campaignId || item.entidadeId || ''),
        estado: String(meta.estado || ''),
        cidade: String(meta.cidade || ''),
        bairro: String(meta.bairro || ''),
        cep: String(meta.cep || ''),
        acao,
        resultado: String(meta.resultado || ''),
        status: String(item.status || meta.status || ''),
        mensagem: mensagem.slice(0, 280),
        erro: String(item.lastError || item.erro || ''),
      } as LogLinha
    })
    .filter((x): x is LogLinha => Boolean(x))
}

export function filtrarLogs(linhas: LogLinha[], canal: LogCanal): LogLinha[] {
  if (canal === 'todos') return linhas
  if (canal === 'robo') return linhas.filter((l) => l.canal === 'busca' || Boolean(l.robotId))
  return linhas.filter((l) => l.canal === canal)
}

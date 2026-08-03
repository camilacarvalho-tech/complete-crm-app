import { Shield, Eye, Clock, AlertTriangle, Plus, Activity } from 'lucide-react'

export default function AuditoriaERP() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Shield className="w-8 h-8 text-purple-400" />
            Auditoria e Logs
          </h1>
          <p className="text-slate-400 mt-1">Rastreabilidade completa de ações e alterações no sistema</p>
        </div>
        <button className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Gerar Relatório
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { icon: Activity, label: 'Ações Hoje', value: '1,247', color: 'purple' },
          { icon: Eye, label: 'Acessos', value: '89', color: 'blue' },
          { icon: AlertTriangle, label: 'Alertas', value: '3', color: 'yellow' },
          { icon: Clock, label: 'Tempo Médio', value: '2.3s', color: 'green' }
        ].map((kpi, i) => (
          <div key={i} className="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">{kpi.label}</p>
                <p className="text-2xl font-bold text-white mt-1">{kpi.value}</p>
              </div>
              <div className={`bg-${kpi.color}-500/10 p-3 rounded-lg`}>
                <kpi.icon className={`w-6 h-6 text-${kpi.color}-400`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-lg p-12 text-center">
        <Shield className="w-16 h-16 mx-auto text-slate-600 mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">Módulo de Auditoria</h3>
        <p className="text-slate-400 mb-6">Sistema de auditoria e conformidade com:</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto text-left">
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-purple-400 rounded-full mt-2" />
            <div>
              <p className="text-white font-medium">Log de Todas as Ações</p>
              <p className="text-slate-400 text-sm">Registro detalhado com timestamp</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-purple-400 rounded-full mt-2" />
            <div>
              <p className="text-white font-medium">Rastreamento de Alterações</p>
              <p className="text-slate-400 text-sm">Histórico completo (antes/depois)</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-purple-400 rounded-full mt-2" />
            <div>
              <p className="text-white font-medium">Conformidade LGPD</p>
              <p className="text-slate-400 text-sm">Relatórios de acesso a dados</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-purple-400 rounded-full mt-2" />
            <div>
              <p className="text-white font-medium">Alertas de Segurança</p>
              <p className="text-slate-400 text-sm">Detecção de ações suspeitas</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

import { Package, TrendingUp, AlertCircle, CheckCircle, Plus } from 'lucide-react'

export default function PatrimonioERP() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Package className="w-8 h-8 text-purple-400" />
            Gestão de Patrimônio
          </h1>
          <p className="text-slate-400 mt-1">Controle completo de bens e ativos da empresa</p>
        </div>
        <button className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Cadastrar Bem
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { icon: Package, label: 'Total de Bens', value: '127', color: 'purple' },
          { icon: TrendingUp, label: 'Valor Total', value: 'R$ 450K', color: 'green' },
          { icon: AlertCircle, label: 'Manutenção Pendente', value: '8', color: 'yellow' },
          { icon: CheckCircle, label: 'Em Bom Estado', value: '119', color: 'blue' }
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
        <Package className="w-16 h-16 mx-auto text-slate-600 mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">Módulo de Patrimônio</h3>
        <p className="text-slate-400 mb-6">Controle patrimonial integrado com:</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto text-left">
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-purple-400 rounded-full mt-2" />
            <div>
              <p className="text-white font-medium">Cadastro de Bens</p>
              <p className="text-slate-400 text-sm">Equipamentos, móveis, veículos</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-purple-400 rounded-full mt-2" />
            <div>
              <p className="text-white font-medium">Depreciação Automática</p>
              <p className="text-slate-400 text-sm">Cálculo por método contábil</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-purple-400 rounded-full mt-2" />
            <div>
              <p className="text-white font-medium">Manutenções Programadas</p>
              <p className="text-slate-400 text-sm">Agenda preventiva e corretiva</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-purple-400 rounded-full mt-2" />
            <div>
              <p className="text-white font-medium">Etiquetas e QR Codes</p>
              <p className="text-slate-400 text-sm">Rastreamento físico dos bens</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

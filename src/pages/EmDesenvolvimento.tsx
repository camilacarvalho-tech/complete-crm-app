import { useLocation } from 'react-router-dom'
import { Construction } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'

const LABELS: Record<string, string> = {
  '/bancos-convenios': 'Bancos/Convênios',
  '/agenda': 'Agenda',
  '/convenios': 'Convênios',
  '/profissionais': 'Profissionais',
  '/prontuario': 'Prontuário',
  '/exames': 'Exames',
  '/estoque': 'Estoque',
  '/odontograma': 'Odontograma',
  '/tratamentos': 'Tratamentos',
  '/radiografias': 'Radiografias',
  '/sessoes': 'Sessões',
  '/prontuario-psicologico': 'Prontuário Psicológico',
  '/recibos': 'Recibos',
  '/avaliacao-antropometrica': 'Avaliação Antropométrica',
  '/plano-alimentar': 'Plano Alimentar',
  '/receitas': 'Receitas',
  '/planos-mensalidades': 'Planos/Mensalidades',
  '/avaliacoes-fisicas': 'Avaliações Físicas',
  '/treinos': 'Treinos',
  '/personal-trainers': 'Personal Trainers',
}

export default function EmDesenvolvimento() {
  const { pathname } = useLocation()
  const { darkMode } = useTheme()
  const titulo = LABELS[pathname] || 'Módulo'

  return (
    <div className={`flex flex-col items-center justify-center min-h-[60vh] rounded-2xl border-2 border-dashed p-12 ${
      darkMode ? 'border-slate-600 bg-slate-800/50' : 'border-orange-200 bg-white'
    }`}>
      <Construction className="w-16 h-16 text-[#FFA500] mb-4" />
      <h1 className={`text-2xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-slate-800'}`}>
        {titulo}
      </h1>
      <p className={`text-center max-w-md ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
        Este módulo está em desenvolvimento e será disponibilizado em breve no Nexus CRM.
      </p>
    </div>
  )
}

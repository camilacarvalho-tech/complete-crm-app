import { Smartphone } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'

export default function SMS() {
  const { darkMode } = useTheme()

  return (
    <div>
      <h1 className={`text-3xl font-bold flex items-center gap-3 mb-2 ${darkMode ? 'text-white' : 'text-slate-800'}`}>
        <Smartphone className="w-8 h-8 text-[#0047FF]" />
        SMS
      </h1>
      <p className={`mb-8 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
        Disparos e respostas SMS — em desenvolvimento.
      </p>
      <div className={`rounded-xl border p-8 text-center ${
        darkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-600'
      }`}>
        Módulo SMS será integrado com campanhas e remarketing em breve.
      </div>
    </div>
  )
}

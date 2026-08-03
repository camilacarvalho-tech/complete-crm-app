import { useTheme } from '../../contexts/ThemeContext'
import { Construction } from 'lucide-react'

interface Props {
  modulo: string
}

export default function EmDesenvolvimentoERP({ modulo }: Props) {
  const { darkMode } = useTheme()

  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <Construction className={`w-16 h-16 mx-auto mb-4 ${
          darkMode ? 'text-slate-400' : 'text-slate-400'
        }`} />
        <h2 className={`text-2xl font-bold mb-2 ${
          darkMode ? 'text-white' : 'text-slate-900'
        }`}>
          {modulo}
        </h2>
        <p className={darkMode ? 'text-slate-400' : 'text-slate-600'}>
          Módulo em desenvolvimento...
        </p>
        <p className={`text-sm mt-2 ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
          Este módulo será implementado nas próximas tasks
        </p>
      </div>
    </div>
  )
}

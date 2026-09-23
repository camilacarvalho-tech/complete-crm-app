import { Moon, Sun } from 'lucide-react'
import { useAppearance } from '../../contexts/ThemeContext'

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { resolved, toggleTheme } = useAppearance()
  const dark = resolved === 'dark'
  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`nexus-btn-secondary p-2 rounded-lg ${className}`}
      aria-label={dark ? 'Tema escuro. Clique para claro' : 'Tema claro. Clique para escuro'}
      title={dark ? 'Escuro' : 'Claro'}
    >
      <span className="inline-flex items-center gap-1 text-xs font-semibold">
        {dark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        {dark ? 'Escuro' : 'Claro'}
      </span>
    </button>
  )
}

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
      aria-label={dark ? 'Ativar modo claro' : 'Ativar modo escuro'}
      title={dark ? 'Modo claro' : 'Modo escuro'}
    >
      {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  )
}

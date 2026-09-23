import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

type Appearance = 'light' | 'dark' | 'system'
type Density = 'confortavel' | 'compacta'

interface AppearanceState {
  appearance: Appearance
  primary: string
  secondary: string
  density: Density
  fontPx: number
  sidebarCollapsed: boolean
  resolved: 'light' | 'dark'
  setAppearance: (v: Appearance) => void
  setPrimary: (v: string) => void
  setSecondary: (v: string) => void
  setDensity: (v: Density) => void
  setFontPx: (v: number) => void
  setSidebarCollapsed: (v: boolean) => void
  toggleTheme: () => void
}

const KEY = 'nexus-appearance-v1'
const THEME_KEY = 'nexus-theme'
const AppearanceContext = createContext<AppearanceState | undefined>(undefined)

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || '{}') as Partial<AppearanceState> & { theme?: string }
    const theme = localStorage.getItem(THEME_KEY)
    if (theme === 'light' || theme === 'dark') saved.appearance = theme
    return saved
  } catch {
    return {}
  }
}

function resolve(appearance: Appearance): 'light' | 'dark' {
  if (appearance === 'light' || appearance === 'dark') return appearance
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return 'dark'
}

function applyDom(next: 'light' | 'dark', primary: string, secondary: string, density: string, fontPx: number) {
  const root = document.documentElement
  root.setAttribute('data-theme', next)
  root.classList.toggle('dark', next === 'dark')
  root.style.colorScheme = next
  root.style.fontSize = `${fontPx}px`
  root.style.setProperty('--code-primary', primary)
  root.style.setProperty('--code-cyan', primary)
  root.style.setProperty('--code-secondary', secondary)
  root.style.setProperty('--code-purple', secondary)
  root.setAttribute('data-density', density)
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const initial = load()
  const [appearance, setAppearance] = useState<Appearance>(() => {
    const saved = initial.appearance
    return saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'dark'
  })
  const [primary, setPrimary] = useState(initial.primary || '#06b6d4')
  const [secondary, setSecondary] = useState(initial.secondary || '#7c3aed')
  const [density, setDensity] = useState<Density>(initial.density || 'confortavel')
  const [fontPx, setFontPxState] = useState(() => {
    const n = Number(initial.fontPx)
    return n >= 12 && n <= 18 ? n : 13
  })
  const [sidebarCollapsed, setSidebarCollapsed] = useState(Boolean(initial.sidebarCollapsed))
  const [resolved, setResolved] = useState<'light' | 'dark'>(() => {
    const start = resolve(initial.appearance === 'light' || initial.appearance === 'dark' || initial.appearance === 'system' ? initial.appearance : 'dark')
    const n = Number(initial.fontPx)
    applyDom(start, initial.primary || '#06b6d4', initial.secondary || '#7c3aed', initial.density || 'confortavel', n >= 12 && n <= 18 ? n : 13)
    return start
  })

  const setFontPx = useCallback((v: number) => {
    setFontPxState(Math.min(18, Math.max(12, v)))
  }, [])

  useEffect(() => {
    const next = resolve(appearance)
    setResolved(next)
    applyDom(next, primary, secondary, density, fontPx)
    localStorage.setItem(KEY, JSON.stringify({ appearance, primary, secondary, density, fontPx, sidebarCollapsed }))
    if (appearance !== 'system') localStorage.setItem(THEME_KEY, appearance)
  }, [appearance, primary, secondary, density, fontPx, sidebarCollapsed])

  useEffect(() => {
    if (appearance !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const fn = () => {
      const next = mq.matches ? 'dark' : 'light'
      setResolved(next)
      applyDom(next, primary, secondary, density, fontPx)
    }
    mq.addEventListener('change', fn)
    return () => mq.removeEventListener('change', fn)
  }, [appearance, primary, secondary, density, fontPx])

  const toggleTheme = useCallback(() => setAppearance(resolved === 'dark' ? 'light' : 'dark'), [resolved])

  const value = useMemo(
    () => ({ appearance, primary, secondary, density, fontPx, sidebarCollapsed, resolved, setAppearance, setPrimary, setSecondary, setDensity, setFontPx, setSidebarCollapsed, toggleTheme }),
    [appearance, primary, secondary, density, fontPx, sidebarCollapsed, resolved, setFontPx, toggleTheme]
  )
  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>
}

export function useTheme() {
  const ctx = useContext(AppearanceContext)
  if (!ctx) throw new Error('useTheme requer ThemeProvider')
  return { theme: ctx.resolved }
}

export function useAppearance() {
  const ctx = useContext(AppearanceContext)
  if (!ctx) {
    return {
      appearance: 'dark' as Appearance,
      primary: '#06b6d4',
      secondary: '#7c3aed',
      density: 'confortavel' as Density,
      fontPx: 13,
      sidebarCollapsed: false,
      resolved: 'dark' as const,
      setAppearance: () => {},
      setPrimary: () => {},
      setSecondary: () => {},
      setDensity: () => {},
      setFontPx: () => {},
      setSidebarCollapsed: () => {},
      toggleTheme: () => {},
    }
  }
  return ctx
}

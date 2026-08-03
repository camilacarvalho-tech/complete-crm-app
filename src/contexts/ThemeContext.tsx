import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface ThemeContextType {
  darkMode: boolean
  setDarkMode: (value: boolean) => void
  zoomLevel: number
  setZoomLevel: (value: number) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode')
    return saved ? JSON.parse(saved) : false
  })

  const [zoomLevel, setZoomLevel] = useState(() => {
    const saved = localStorage.getItem('zoomLevel')
    return saved ? parseFloat(saved) : 0.85 // Padrão 85% (mais compacto)
  })

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode))
    const root = document.documentElement
    if (darkMode) {
      root.classList.add('dark')
      document.body.classList.add('dark')
      document.body.style.backgroundColor = '#0F172A'
      document.body.style.color = '#F8FAFC'
    } else {
      root.classList.remove('dark')
      document.body.classList.remove('dark')
      document.body.style.backgroundColor = ''
      document.body.style.color = ''
    }
  }, [darkMode])

  useEffect(() => {
    localStorage.setItem('zoomLevel', zoomLevel.toString())
    document.documentElement.style.fontSize = `${zoomLevel * 16}px`
  }, [zoomLevel])

  return (
    <ThemeContext.Provider value={{ darkMode, setDarkMode, zoomLevel, setZoomLevel }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

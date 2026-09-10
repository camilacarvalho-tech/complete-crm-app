import { createContext, useContext, type ReactNode } from 'react'

interface ThemeContextValue {
  theme: 'light' | 'dark'
}

const ThemeContext = createContext<ThemeContextValue>({ theme: 'light' })

export function ThemeProvider({ children }: { children: ReactNode }) {
  return <ThemeContext.Provider value={{ theme: 'light' }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  return useContext(ThemeContext)
}

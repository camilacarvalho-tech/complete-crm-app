import { createContext, useContext, type ReactNode } from 'react'

interface LeadsContextValue {
  leads: unknown[]
}

const LeadsContext = createContext<LeadsContextValue>({ leads: [] })

export function LeadsProvider({ children }: { children: ReactNode }) {
  return <LeadsContext.Provider value={{ leads: [] }}>{children}</LeadsContext.Provider>
}

export function useLeads() {
  return useContext(LeadsContext)
}

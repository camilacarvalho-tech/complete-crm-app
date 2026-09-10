import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

type ToastKind = 'success' | 'info' | 'error'
interface ToastItem { id: number; kind: ToastKind; title: string; description?: string }
interface ToastContextValue {
  success: (title: string, description?: string) => void
  info: (title: string, description?: string) => void
  error: (title: string, description?: string) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)
const COLORS: Record<ToastKind, string> = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  info: 'border-sky-200 bg-sky-50 text-sky-900',
  error: 'border-red-200 bg-red-50 text-red-900',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const add = useCallback((kind: ToastKind, title: string, description?: string) => {
    const id = Date.now() + Math.floor(Math.random() * 1000)
    setItems((current) => [...current, { id, kind, title, description }].slice(-4))
    window.setTimeout(() => setItems((current) => current.filter((item) => item.id !== id)), 4500)
  }, [])
  const value = useMemo<ToastContextValue>(() => ({
    success: (title, description) => add('success', title, description),
    info: (title, description) => add('info', title, description),
    error: (title, description) => add('error', title, description),
  }), [add])
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed right-4 top-4 z-[100] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2" aria-live="polite">
        {items.map((item) => <div key={item.id} className={`rounded-lg border p-3 shadow-lg ${COLORS[item.kind]}`}><p className="text-sm font-semibold">{item.title}</p>{item.description && <p className="mt-1 text-xs opacity-80">{item.description}</p>}</div>)}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast deve ser usado dentro de ToastProvider')
  return context
}

import { createContext, useCallback, useContext, useMemo, useState, ReactNode } from 'react'
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface ToastItem {
  id: string
  type: ToastType
  title: string
  message?: string
}

interface ToastContextValue {
  toast: (opts: { type?: ToastType; title: string; message?: string }) => void
  success: (title: string, message?: string) => void
  error: (title: string, message?: string) => void
  warning: (title: string, message?: string) => void
  info: (title: string, message?: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const icons = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
}

const styles: Record<ToastType, string> = {
  success: 'border-code-success/40 bg-[#1E293B] text-code-success',
  error: 'border-code-danger/40 bg-[#1E293B] text-code-danger',
  warning: 'border-code-warning/40 bg-[#1E293B] text-code-warning',
  info: 'border-code-info/40 bg-[#1E293B] text-code-info',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback(
    ({ type = 'info', title, message }: { type?: ToastType; title: string; message?: string }) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      setItems((prev) => [...prev, { id, type, title, message }])
      setTimeout(() => remove(id), 4200)
    },
    [remove]
  )

  const value = useMemo<ToastContextValue>(
    () => ({
      toast,
      success: (title, message) => toast({ type: 'success', title, message }),
      error: (title, message) => toast({ type: 'error', title, message }),
      warning: (title, message) => toast({ type: 'warning', title, message }),
      info: (title, message) => toast({ type: 'info', title, message }),
    }),
    [toast]
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {items.map((t) => {
          const Icon = icons[t.type]
          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex gap-3 items-start rounded-xl border px-4 py-3 shadow-card animate-fade-in ${styles[t.type]}`}
            >
              <Icon className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">{t.title}</p>
                {t.message && <p className="text-xs text-slate-300 mt-0.5">{t.message}</p>}
              </div>
              <button type="button" onClick={() => remove(t.id)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast deve ser usado dentro de ToastProvider')
  return ctx
}

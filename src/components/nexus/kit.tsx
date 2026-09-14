import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { Loader2 } from 'lucide-react'

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string
  subtitle?: string
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-4">
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--code-text)' }}>{title}</h1>
        {subtitle && <p className="text-sm mt-0.5" style={{ color: 'var(--code-muted)' }}>{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export function MetricCard({
  label,
  value,
  hint,
}: {
  label: string
  value: string | number
  hint?: string
}) {
  return (
    <div className="nexus-card p-3">
      <p className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--code-muted)' }}>{label}</p>
      <p className="text-lg font-bold mt-1 leading-tight" style={{ color: 'var(--code-text)' }}>{value}</p>
      {hint && <p className="text-[11px] mt-1" style={{ color: 'var(--code-placeholder)' }}>{hint}</p>}
    </div>
  )
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="nexus-card p-8 text-center border-dashed">
      <p className="font-semibold" style={{ color: 'var(--code-text)' }}>{title}</p>
      <p className="text-sm mt-1" style={{ color: 'var(--code-muted)' }}>{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 text-red-800 px-3 py-2 text-sm mb-3">
      {message}
    </div>
  )
}

export function LoadingBlock({ label = 'Carregando...' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16" style={{ color: 'var(--code-muted)' }}>
      <Loader2 className="w-5 h-5 animate-spin" />
      <span className="text-sm">{label}</span>
    </div>
  )
}

export function SkeletonGrid({ n = 8 }: { n?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background: 'var(--code-surface-muted)', border: '1px solid var(--code-border)' }} />
      ))}
    </div>
  )
}

export function PrimaryButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className = '', ...rest } = props
  return (
    <button
      {...rest}
      className={`nexus-cta px-3 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50 ${className}`}
    />
  )
}

export function GhostButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className = '', ...rest } = props
  return (
    <button
      {...rest}
      className={`nexus-btn-secondary px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-50 ${className}`}
    />
  )
}

export function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <span className="block text-xs font-semibold leading-none" style={{ color: 'var(--code-muted)' }}>{label}</span>
      {children}
    </div>
  )
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className = '', ...rest } = props
  return (
    <input
      {...rest}
      className={`block w-full min-w-0 px-3 py-2 rounded-lg border text-sm nexus-field ${className}`}
      style={{ borderColor: 'var(--code-input-border)', background: 'var(--code-input-bg)', color: 'var(--code-text)' }}
    />
  )
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className = '', ...rest } = props
  return (
    <textarea
      {...rest}
      className={`block w-full min-w-0 px-3 py-2 rounded-lg border text-sm nexus-field ${className}`}
      style={{ borderColor: 'var(--code-input-border)', background: 'var(--code-input-bg)', color: 'var(--code-text)' }}
    />
  )
}

export function SelectInput(props: SelectHTMLAttributes<HTMLSelectElement>) {
  const { className = '', ...rest } = props
  return (
    <select
      {...rest}
      className={`block w-full min-w-0 px-3 py-2 rounded-lg border text-sm nexus-field ${className}`}
      style={{ borderColor: 'var(--code-input-border)', background: 'var(--code-input-bg)', color: 'var(--code-text)' }}
    />
  )
}

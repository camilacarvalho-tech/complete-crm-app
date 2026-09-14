import type { SelectHTMLAttributes } from 'react'
import { SelectInput, TextInput } from './kit'

export function FilterSelect(props: SelectHTMLAttributes<HTMLSelectElement> & { label?: string }) {
  const { label, className, children, ...rest } = props
  return (
    <label className="text-[10px] font-bold uppercase tracking-wide text-[color:var(--code-muted)]">
      {label}
      <SelectInput className={`w-full ${className || ''}`} {...rest}>{children}</SelectInput>
    </label>
  )
}

export function FilterSearch({ value, onChange, placeholder = 'Pesquisar' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <TextInput value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="min-w-[180px]" />
}

export function FilterDateRange({ from, to, onFrom, onTo }: { from: string; to: string; onFrom: (v: string) => void; onTo: (v: string) => void }) {
  return (
    <span className="flex gap-1 items-end">
      <TextInput type="date" value={from} onChange={(e) => onFrom(e.target.value)} />
      <TextInput type="date" value={to} onChange={(e) => onTo(e.target.value)} />
    </span>
  )
}

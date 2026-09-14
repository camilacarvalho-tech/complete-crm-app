import { Link } from 'react-router-dom'

export function ClienteLink({ id, nome, className = '' }: { id?: unknown; nome?: unknown; className?: string }) {
  const label = String(nome || 'Cliente')
  const cid = String(id || '')
  if (!cid) return <span className={className}>{label}</span>
  return (
    <Link to={`/clientes?id=${encodeURIComponent(cid)}`} className={`font-semibold hover:underline ${className}`} style={{ color: 'var(--code-cyan)' }} onClick={(e) => e.stopPropagation()}>
      {label}
    </Link>
  )
}

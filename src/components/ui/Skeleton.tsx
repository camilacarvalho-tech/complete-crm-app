/** Skeleton loading CODE */

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-slate-200 dark:bg-[#273449] ${className}`}
      aria-hidden
    />
  )
}

export function SkeletonCard() {
  return (
    <div className="card-code p-6 space-y-4">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
    </div>
  )
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="card-code p-4 space-y-3">
      <Skeleton className="h-10 w-full" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  )
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="card-code flex flex-col items-center justify-center py-16 px-6 text-center">
      <p className="text-lg font-semibold text-[var(--text-main)]">{title}</p>
      {description && <p className="mt-2 text-sm text-[var(--text-secondary)] max-w-md">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}

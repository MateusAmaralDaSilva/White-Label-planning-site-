import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/** Chip de filtro de agenda (com bolinha de cor opcional). */
export function FilterChip({
  active,
  onClick,
  color,
  children,
}: {
  active: boolean
  onClick: () => void
  color?: string
  children: ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
        active
          ? 'border-accent/20 bg-accent/10 text-accent'
          : 'border-border text-ink-muted hover:bg-surface hover:text-ink',
      )}
    >
      {color && <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />}
      {children}
    </button>
  )
}

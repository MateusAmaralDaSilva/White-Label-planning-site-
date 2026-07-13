import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn('overflow-hidden rounded-xl border border-border bg-surface', className)}>
      {children}
    </div>
  )
}

export function CardHeader({ action, children }: { action?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-border px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
      {children}
      {action}
    </div>
  )
}

export function CardBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('p-4', className)}>{children}</div>
}

import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'
import { toneTint, type Tone } from './tones'

export interface StatCardProps {
  label: string
  value: string
  icon: LucideIcon
  tone?: Tone
  /** e.g. "+12,4%" — colored green when up, red when down. */
  delta?: string
  trend?: 'up' | 'down'
  deltaLabel?: string
  /** Linha secundária neutra, usada quando NÃO há delta (ex.: "12 contas ativas"). */
  hint?: string
  /** Prefixa "Parabéns, " na linha de variação (ex.: crescimento relevante). */
  celebrate?: boolean
}

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = 'accent',
  delta,
  trend = 'up',
  deltaLabel = 'vs. mês anterior',
  hint,
  celebrate = false,
}: StatCardProps) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <span
        className={cn(
          'mb-2.5 inline-flex h-7 w-7 items-center justify-center rounded-lg',
          toneTint[tone],
        )}
      >
        <Icon size={14} />
      </span>
      <div className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">{label}</div>
      <div className="mt-1 text-2xl font-bold tabular-nums tracking-tight text-ink">{value}</div>
      {delta ? (
        <div
          className={cn(
            'mt-1 text-xs font-medium',
            trend === 'up' ? 'text-success' : 'text-danger',
          )}
        >
          {celebrate && 'Parabéns, '}
          {trend === 'up' ? '↑' : '↓'} {delta} {deltaLabel}
        </div>
      ) : (
        hint && <div className="mt-1 text-xs text-ink-faint">{hint}</div>
      )}
    </div>
  )
}

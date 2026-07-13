import { ChevronDown } from 'lucide-react'
import { formatBRL } from '@/lib/format'
import type { CustomerRank } from '@contracts'
import { fmtDate } from './utils'

/** Uma linha do ranking de clientes: resumo + (ao expandir) o que comprou. */
export function CustomerRow({
  rank,
  index,
  value,
  formatValue,
  max,
  open,
  onToggle,
}: {
  rank: CustomerRank
  index: number
  value: number
  formatValue: (n: number) => string
  max: number
  open: boolean
  onToggle: () => void
}) {
  const anon = rank.email === null
  const label = anon ? 'Sem identificação' : rank.name || rank.email!

  return (
    <div className="border-b border-border/50 last:border-0">
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface-hover"
      >
        <span className="w-4 shrink-0 text-right text-xs font-semibold tabular-nums text-ink-faint">
          {anon ? '·' : index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span
              className={`min-w-0 flex-1 truncate text-sm font-medium ${anon ? 'italic text-ink-faint' : 'text-ink'}`}
              title={anon ? undefined : rank.email ?? undefined}
            >
              {label}
            </span>
            <span className="shrink-0 text-sm font-semibold tabular-nums text-ink">{formatValue(value)}</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full bg-accent"
              style={{ width: `${Math.max(2, (Math.max(0, value) / max) * 100)}%` }}
            />
          </div>
          <div className="mt-1 text-[10px] text-ink-faint">
            {rank.orders} {rank.orders === 1 ? 'compra' : 'compras'} · {rank.units}{' '}
            {rank.units === 1 ? 'un' : 'un'} · ticket {formatBRL(rank.avgTicket)}
            {rank.lastPurchase && ` · última ${fmtDate(rank.lastPurchase)}`}
          </div>
        </div>
        <ChevronDown
          size={15}
          className={`shrink-0 text-ink-faint transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="bg-surface-hover/30 px-4 pb-3 pl-11">
          <p className="py-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
            O que comprou
          </p>
          {rank.products.length === 0 ? (
            <p className="pb-1 text-xs text-ink-faint">Sem itens.</p>
          ) : (
            rank.products.map((p, pi) => (
              <div key={`${p.name}-${pi}`} className="flex items-baseline gap-2 py-1 text-xs">
                <span className="min-w-0 flex-1 truncate text-ink-muted" title={p.name}>
                  {p.name}
                </span>
                <span className="shrink-0 tabular-nums text-ink-faint">
                  {p.qty} {p.qty === 1 ? 'un' : 'un'}
                </span>
                <span className="w-20 shrink-0 text-right font-medium tabular-nums text-ink">
                  {formatBRL(p.value)}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

import { Card, CardHeader } from '@/components/ui'
import { formatBRL } from '@/lib/format'
import type { PlatformMonth } from '@contracts'
import { fmtMonth, pctFmt } from './utils'

const COLS = 'grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2'
const margin = (m: PlatformMonth) => (m.revenue > 0 ? (m.profit / m.revenue) * 100 : 0)

/** Tabela de resultado mensal da plataforma, com totais do período. */
export function ResultTable({ months }: { months: PlatformMonth[] }) {
  if (months.length === 0) return null
  const totals = months.reduce(
    (a, m) => ({ revenue: a.revenue + m.revenue, costs: a.costs + m.costs, profit: a.profit + m.profit }),
    { revenue: 0, costs: 0, profit: 0 },
  )
  const totalMargin = totals.revenue > 0 ? (totals.profit / totals.revenue) * 100 : 0

  return (
    <Card>
      <CardHeader>Resultado Mensal</CardHeader>
      <div
        className={`${COLS} border-b border-border px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-ink-faint`}
      >
        <span>Mês</span>
        <span className="text-right">Receita</span>
        <span className="text-right">Custos</span>
        <span className="text-right">Lucro</span>
        <span className="w-14 text-right">Margem</span>
      </div>
      <div className="max-h-72 overflow-y-auto">
        {[...months].reverse().map((m) => (
          <div key={m.ym} className={`${COLS} border-b border-border/50 px-4 py-2 text-sm last:border-0`}>
            <span className="text-ink-muted">{fmtMonth(m.ym)}</span>
            <span className="text-right tabular-nums text-ink">{formatBRL(m.revenue)}</span>
            <span className="text-right tabular-nums text-ink-muted">{formatBRL(m.costs)}</span>
            <span
              className={`text-right font-medium tabular-nums ${m.profit >= 0 ? 'text-success' : 'text-danger'}`}
            >
              {formatBRL(m.profit)}
            </span>
            <span className="w-14 text-right tabular-nums text-ink-faint">{pctFmt(margin(m))}</span>
          </div>
        ))}
      </div>
      <div className={`${COLS} border-t border-border bg-surface-hover/40 px-4 py-2 text-sm font-semibold`}>
        <span className="text-ink">Total</span>
        <span className="text-right tabular-nums text-ink">{formatBRL(totals.revenue)}</span>
        <span className="text-right tabular-nums text-ink-muted">{formatBRL(totals.costs)}</span>
        <span className={`text-right tabular-nums ${totals.profit >= 0 ? 'text-success' : 'text-danger'}`}>
          {formatBRL(totals.profit)}
        </span>
        <span className="w-14 text-right tabular-nums text-ink-muted">{pctFmt(totalMargin)}</span>
      </div>
    </Card>
  )
}

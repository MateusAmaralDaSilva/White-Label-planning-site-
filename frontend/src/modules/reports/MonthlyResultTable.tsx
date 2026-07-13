import { Card, CardHeader } from '@/components/ui'
import { formatBRL } from '@/lib/format'
import type { MonthResult } from '@contracts'
import { fmtMonth, margin, pctFmt } from './utils'

const COLS = 'grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2'

/**
 * Resultado mês a mês em tabela, com coluna de Margem e uma linha de TOTAIS
 * (soma do período). Cabeçalho fixo; as linhas rolam dentro do limite de altura.
 */
export function MonthlyResultTable({ months }: { months: MonthResult[] }) {
  const totals = months.reduce(
    (acc, m) => ({
      revenue: acc.revenue + m.revenue,
      costs: acc.costs + m.cogs + m.expenses,
      profit: acc.profit + m.profit,
    }),
    { revenue: 0, costs: 0, profit: 0 },
  )
  const totalMargin = totals.revenue > 0 ? (totals.profit / totals.revenue) * 100 : 0

  return (
    <Card>
      <CardHeader>Resultado Mensal</CardHeader>
      {months.length === 0 ? (
        <p className="px-4 py-6 text-center text-xs text-ink-faint">Sem dados ainda.</p>
      ) : (
        <>
          <div
            className={`${COLS} border-b border-border px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-ink-faint`}
          >
            <span>Mês</span>
            <span className="text-right">Receita</span>
            <span className="text-right" title="CMV + gastos do mês">
              Custos
            </span>
            <span className="text-right">Lucro</span>
            <span className="w-14 text-right">Margem</span>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {months.map((m) => (
              <div key={m.ym} className={`${COLS} border-b border-border/50 px-4 py-2 text-sm last:border-0`}>
                <span className="text-ink-muted">{fmtMonth(m.ym)}</span>
                <span className="text-right tabular-nums text-ink">{formatBRL(m.revenue)}</span>
                <span className="text-right tabular-nums text-ink-muted">{formatBRL(m.cogs + m.expenses)}</span>
                <span
                  className={`text-right font-medium tabular-nums ${m.profit >= 0 ? 'text-success' : 'text-danger'}`}
                >
                  {formatBRL(m.profit)}
                </span>
                <span className="w-14 text-right tabular-nums text-ink-faint">{pctFmt(margin(m))}</span>
              </div>
            ))}
          </div>
          {/* Linha de totais do período. */}
          <div className={`${COLS} border-t border-border bg-surface-hover/40 px-4 py-2 text-sm font-semibold`}>
            <span className="text-ink">Total</span>
            <span className="text-right tabular-nums text-ink">{formatBRL(totals.revenue)}</span>
            <span className="text-right tabular-nums text-ink-muted">{formatBRL(totals.costs)}</span>
            <span className={`text-right tabular-nums ${totals.profit >= 0 ? 'text-success' : 'text-danger'}`}>
              {formatBRL(totals.profit)}
            </span>
            <span className="w-14 text-right tabular-nums text-ink-muted">{pctFmt(totalMargin)}</span>
          </div>
        </>
      )}
    </Card>
  )
}

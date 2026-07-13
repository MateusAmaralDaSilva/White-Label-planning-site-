import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Card, CardHeader, CardBody, type Tone } from '@/components/ui'
import { BarChart, type BarDatum } from '@/components/charts'
import { compactBRL, formatBRL } from '@/lib/format'
import type { MonthResult } from '@contracts'
import { fmtMonth, margin, pctFmt, WINDOW } from './utils'

/**
 * Receita × Lucro mês a mês, com janela navegável (◀ passado · ▶ presente).
 * Usa o BarChart compartilhado: eixo Y com escala, tooltip com o detalhamento do
 * mês (receita, custos, lucro, margem) e barra de prejuízo abaixo do zero.
 * `offset` = quantos meses atrás do mais recente a janela termina (0 = atual).
 */
export function RevenueChart({ months }: { months: MonthResult[] }) {
  const [offset, setOffset] = useState(0)

  if (months.length === 0) {
    return (
      <Card>
        <CardHeader>Receita × Lucro por mês</CardHeader>
        <CardBody>
          <p className="py-6 text-center text-xs text-ink-faint">Sem vendas registradas.</p>
        </CardBody>
      </Card>
    )
  }

  const end = months.length - Math.min(offset, months.length - 1)
  const start = Math.max(0, end - WINDOW)
  const visible = months.slice(start, end)
  const canOlder = start > 0
  const canNewer = offset > 0
  const rangeLabel =
    visible.length === 1
      ? fmtMonth(visible[0].ym)
      : `${fmtMonth(visible[0].ym)} – ${fmtMonth(visible[visible.length - 1].ym)}`

  const navBtn =
    'rounded-md p-1 text-ink-muted transition-colors hover:bg-surface-hover disabled:opacity-30 disabled:hover:bg-transparent'

  const data: BarDatum[] = visible.map((m) => ({
    label: m.label,
    values: [m.revenue, m.profit],
    tooltip: [
      { label: 'Receita', value: formatBRL(m.revenue), tone: 'accent' as Tone },
      { label: 'Custos', value: formatBRL(m.cogs + m.expenses), tone: 'neutral' as Tone },
      { label: 'Lucro', value: formatBRL(m.profit), tone: (m.profit >= 0 ? 'success' : 'danger') as Tone },
      { label: 'Margem', value: pctFmt(margin(m)) },
    ],
  }))

  return (
    <Card>
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
          Receita × Lucro por mês
        </span>
        <div className="flex items-center gap-2">
          <button
            className={navBtn}
            disabled={!canOlder}
            onClick={() => setOffset((o) => o + 1)}
            aria-label="Meses anteriores"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="min-w-[110px] text-center text-xs font-medium text-ink">{rangeLabel}</span>
          <button
            className={navBtn}
            disabled={!canNewer}
            onClick={() => setOffset((o) => Math.max(0, o - 1))}
            aria-label="Meses seguintes"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
      <CardBody>
        <BarChart
          data={data}
          series={[
            { name: 'Receita', tone: 'accent' },
            { name: 'Lucro', tone: 'success' },
          ]}
          formatValue={compactBRL}
        />
      </CardBody>
    </Card>
  )
}

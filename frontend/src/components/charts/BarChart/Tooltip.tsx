import { toneSolid } from '@/components/ui'
import { cn } from '@/lib/cn'
import type { BarDatum, BarSeries } from './types'

/**
 * Tooltip do período no hover: título (rótulo do X) + linhas de detalhamento.
 * Usa as linhas do próprio datum (`tooltip`) ou, na ausência, gera uma linha por
 * série a partir de `formatValue`.
 */
export function BarTooltip({
  datum,
  series,
  formatValue,
}: {
  datum: BarDatum
  series: BarSeries[]
  formatValue: (n: number) => string
}) {
  const rows =
    datum.tooltip ??
    series.map((s, si) => ({ label: s.name, value: formatValue(datum.values[si]), tone: s.tone }))

  return (
    <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 w-max -translate-x-1/2 rounded-lg border border-border bg-surface px-3 py-2 text-xs shadow-lg">
      <div className="mb-1 font-semibold text-ink">{datum.label}</div>
      {rows.map((row) => (
        <div key={row.label} className="flex items-center gap-2">
          {row.tone && <span className={cn('h-2 w-2 rounded-sm', toneSolid[row.tone])} />}
          <span className="text-ink-muted">{row.label}</span>
          <span className="ml-auto pl-3 font-medium tabular-nums text-ink">{row.value}</span>
        </div>
      ))}
    </div>
  )
}

import { toneSolid } from '@/components/ui'
import { cn } from '@/lib/cn'
import type { BarSeries } from './types'

/**
 * Legenda do gráfico (embaixo): as séries + "Prejuízo" (vermelho) quando há barra
 * negativa. Não renderiza nada com menos de 2 itens (série única dispensa legenda).
 */
export function ChartLegend({ items }: { items: BarSeries[] }) {
  if (items.length < 2) return null
  return (
    <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
      {items.map((s) => (
        <span key={s.name} className="flex items-center gap-1.5 text-xs text-ink-muted">
          <span className={cn('h-2.5 w-2.5 rounded-sm', toneSolid[s.tone])} />
          {s.name}
        </span>
      ))}
    </div>
  )
}

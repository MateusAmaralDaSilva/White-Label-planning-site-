import { toneSolid, type Tone } from '@/components/ui'
import { cn } from '@/lib/cn'

/**
 * Ranking em barras horizontais (Top Categorias / Top Produtos). Melhora a lista
 * antiga (uma barrinha de 1px, só %) mostrando, por item:
 *   • posição no ranking;
 *   • nome + valor absoluto (R$);
 *   • barra proporcional AO MAIOR do ranking (dá a proporção relativa, não só %);
 *   • participação (%) e uma linha de meta opcional (ex.: unidades · lucro).
 *
 * A largura da barra usa o MAIOR valor como 100% (comparação entre itens); o `pct`
 * de participação no total é exibido como texto — os dois juntos evitam a leitura
 * ambígua de quando a barra é "% do total" vs "% do líder".
 */

export interface RankItem {
  name: string
  /** Valor absoluto (base da barra e do rótulo). */
  value: number
  /** Participação (%) no total — exibida como texto. */
  pct: number
  /** Linha auxiliar opcional (ex.: "12 un · lucro R$ 300"). */
  meta?: string
}

interface RankBarsProps {
  items: RankItem[]
  formatValue: (n: number) => string
  tone?: Tone
  showRank?: boolean
  emptyLabel?: string
}

export function RankBars({
  items,
  formatValue,
  tone = 'accent',
  showRank = true,
  emptyLabel = 'Sem dados ainda.',
}: RankBarsProps) {
  if (items.length === 0) {
    return <p className="py-6 text-center text-xs text-ink-faint">{emptyLabel}</p>
  }
  const max = Math.max(...items.map((i) => i.value), 1)

  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={`${item.name}-${i}`}>
          <div className="flex items-baseline gap-2 text-xs">
            {showRank && (
              <span className="w-4 shrink-0 text-right font-semibold tabular-nums text-ink-faint">
                {i + 1}
              </span>
            )}
            <span className="min-w-0 flex-1 truncate font-medium text-ink" title={item.name}>
              {item.name}
            </span>
            <span className="shrink-0 font-semibold tabular-nums text-ink">
              {formatValue(item.value)}
            </span>
          </div>
          <div className={cn('mt-1 flex items-center gap-2', showRank && 'pl-6')}>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
              <div
                className={cn('h-full rounded-full', toneSolid[tone])}
                style={{ width: `${Math.max(2, (item.value / max) * 100)}%` }}
              />
            </div>
            <span className="w-9 shrink-0 text-right text-[10px] tabular-nums text-ink-faint">
              {item.pct}%
            </span>
          </div>
          {item.meta && (
            <div className={cn('mt-0.5 text-[10px] text-ink-faint', showRank && 'pl-6')}>
              {item.meta}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

import { useMemo, useState } from 'react'
import { Card, CardHeader } from '@/components/ui'
import { formatBRL } from '@/lib/format'
import type { CustomerRank } from '@contracts'
import { CustomerRow } from './CustomerRow'

type CustomerMetric = 'revenue' | 'profit' | 'orders'

const CUSTOMER_METRICS: {
  key: CustomerMetric
  label: string
  get: (c: CustomerRank) => number
  fmt: (n: number) => string
}[] = [
  { key: 'revenue', label: 'Receita', get: (c) => c.revenue, fmt: formatBRL },
  { key: 'profit', label: 'Lucro', get: (c) => c.profit, fmt: formatBRL },
  { key: 'orders', label: 'Compras', get: (c) => c.orders, fmt: (n) => `${n}` },
]

/**
 * Melhores clientes no período, agregados das vendas. Toggle de critério
 * (Receita · Lucro · Nº de compras) reordena a lista; cada linha expande para
 * mostrar o que o cliente comprou. Vendas sem e-mail viram "Sem identificação",
 * sempre fixadas no fim (não competem no ranking).
 */
export function CustomersSection({ customers }: { customers: CustomerRank[] }) {
  const [metric, setMetric] = useState<CustomerMetric>('revenue')
  const [expanded, setExpanded] = useState<string | null>(null)

  const active = CUSTOMER_METRICS.find((m) => m.key === metric)!

  const sorted = useMemo(() => {
    const get = CUSTOMER_METRICS.find((m) => m.key === metric)!.get
    // Ordena pelo critério; depois empurra os não identificados para o fim
    // (segundo sort é estável → preserva a ordem por métrica dentro de cada grupo).
    return [...customers]
      .sort((a, b) => get(b) - get(a))
      .sort((a, b) => Number(a.email === null) - Number(b.email === null))
  }, [customers, metric])

  const max = Math.max(...sorted.map((c) => active.get(c)), 1)

  return (
    <Card>
      <CardHeader
        action={
          <div className="flex gap-1">
            {CUSTOMER_METRICS.map((m) => (
              <button
                key={m.key}
                onClick={() => setMetric(m.key)}
                className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
                  m.key === metric
                    ? 'bg-accent/15 text-accent'
                    : 'text-ink-faint hover:bg-surface-hover hover:text-ink'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        }
      >
        Melhores Clientes
      </CardHeader>
      {customers.length === 0 ? (
        <p className="px-4 py-6 text-center text-xs text-ink-faint">
          Nenhuma venda no período. Informe o e-mail do comprador ao registrar vendas para ver o
          ranking de clientes.
        </p>
      ) : (
        <div className="max-h-[28rem] overflow-y-auto">
          {sorted.map((c, i) => {
            const key = c.email ?? '__none__'
            return (
              <CustomerRow
                key={key}
                rank={c}
                index={i}
                value={active.get(c)}
                formatValue={active.fmt}
                max={max}
                open={expanded === key}
                onToggle={() => setExpanded(expanded === key ? null : key)}
              />
            )
          })}
        </div>
      )}
    </Card>
  )
}

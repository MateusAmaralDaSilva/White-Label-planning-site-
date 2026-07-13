import { useMemo, useState } from 'react'
import { ShoppingBag, CalendarDays, UserPlus, DollarSign } from 'lucide-react'
import { SearchInput, StatCard } from '@/components/ui'
import { cn } from '@/lib/cn'
import { formatBRL } from '@/lib/format'
import type { ActivityEvent } from '@/config/activity'
import { FILTERS, groupByDate, type Filter } from './utils'
import { ActivityFeed } from './ActivityFeed'

/** Resumo + filtros + busca sobre os eventos já carregados; delega a lista ao Feed. */
export function ActivityView({ events }: { events: ActivityEvent[] }) {
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')

  const summary = useMemo(() => {
    const sales = events.filter((e) => e.type === 'sale')
    return {
      revenue: sales.reduce((sum, e) => sum + (e.amount ?? 0), 0),
      sales: sales.length,
      appointments: events.filter((e) => e.type === 'appointment').length,
      customers: events.filter((e) => e.type === 'customer').length,
    }
  }, [events])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return events.filter((e) => {
      if (filter !== 'all' && e.type !== filter) return false
      if (!q) return true
      return e.title.toLowerCase().includes(q) || (e.customer?.toLowerCase().includes(q) ?? false)
    })
  }, [events, filter, query])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Receita" value={formatBRL(summary.revenue)} icon={DollarSign} tone="success" />
        <StatCard label="Vendas" value={String(summary.sales)} icon={ShoppingBag} tone="accent" />
        <StatCard label="Agendamentos" value={String(summary.appointments)} icon={CalendarDays} tone="info" />
        <StatCard label="Novos Clientes" value={String(summary.customers)} icon={UserPlus} tone="warning" />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                'rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                filter === f.key
                  ? 'border-accent/20 bg-accent/10 text-accent'
                  : 'border-border text-ink-muted hover:bg-surface hover:text-ink',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <SearchInput
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por cliente ou evento…"
          className="sm:w-64"
        />
      </div>

      <ActivityFeed groups={groupByDate(filtered)} />
    </div>
  )
}

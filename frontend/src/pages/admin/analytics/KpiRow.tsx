import { StatCard } from '@/components/ui'
import { iconFor } from '@/lib/icons'
import { formatDelta, formatKpiValue } from '@/lib/format'
import type { PlatformKpi } from '@contracts'

/** Grade de KPIs do painel financeiro (MRR, receita, lucro, inadimplência). */
export function KpiRow({ kpis }: { kpis: PlatformKpi[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {kpis.map((kpi) => (
        <StatCard
          key={kpi.label}
          label={kpi.label}
          value={formatKpiValue(kpi.value, kpi.format)}
          delta={kpi.delta !== null ? formatDelta(kpi.delta) : undefined}
          trend={kpi.trend}
          hint={kpi.hint ?? undefined}
          tone={kpi.tone}
          icon={iconFor(kpi.iconKey)}
        />
      ))}
    </div>
  )
}

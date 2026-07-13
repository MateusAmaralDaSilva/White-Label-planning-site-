import { StatCard } from '@/components/ui'
import { iconFor } from '@/lib/icons'
import { formatDelta, formatKpiValue } from '@/lib/format'
import type { ReportKpi } from '@contracts'

/** Linha de KPIs do topo (receita / lucro / margem do mês). */
export function KpiRow({ kpis }: { kpis: ReportKpi[] }) {
  if (kpis.length === 0) return null
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {kpis.map((kpi) => (
        <StatCard
          key={kpi.label}
          label={kpi.label}
          value={formatKpiValue(kpi.value, kpi.format)}
          delta={formatDelta(kpi.delta)}
          trend={kpi.trend}
          tone={kpi.tone}
          icon={iconFor(kpi.iconKey)}
          // Parabeniza quando a métrica cresceu mais de 1% vs. o mês anterior.
          celebrate={kpi.trend === 'up' && (kpi.delta ?? 0) > 1}
        />
      ))}
    </div>
  )
}

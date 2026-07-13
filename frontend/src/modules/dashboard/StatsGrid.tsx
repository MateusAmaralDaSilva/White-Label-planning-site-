import { StatCard } from '@/components/ui'
import { iconFor } from '@/lib/icons'
import type { DashboardStat } from '@contracts'

/** Grade de KPIs do dashboard (valores já vêm formatados do backend). */
export function StatsGrid({ stats }: { stats: DashboardStat[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {stats.map((stat) => (
        <StatCard
          key={stat.label}
          label={stat.label}
          value={stat.value}
          delta={stat.delta}
          tone={stat.tone}
          icon={iconFor(stat.iconKey)}
        />
      ))}
    </div>
  )
}

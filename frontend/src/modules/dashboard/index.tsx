import { Async, PageHeader } from '@/components/ui'
import { useApi } from '@/hooks/useApi'
import type { DashboardData } from '@contracts'
import { StatsGrid } from './StatsGrid'
import { RecentActivity } from './RecentActivity'
import { TasksCard } from './TasksCard'

/** Dashboard (casca): KPIs + atividade recente + tarefas. */
export default function DashboardModule() {
  const state = useApi<DashboardData>('/api/dashboard')

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" subtitle="Visão geral · Jul 2026" />

      <Async state={state}>
        {({ stats, tasks }) => (
          <>
            <StatsGrid stats={stats} />
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              <RecentActivity />
              <TasksCard tasks={tasks} onChanged={state.reload} />
            </div>
          </>
        )}
      </Async>
    </div>
  )
}

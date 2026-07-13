import { Async, Card, CardHeader, StatusDot } from '@/components/ui'
import { useApi } from '@/hooks/useApi'
import { ACTIVITY_TYPE, type ActivityEvent } from '@/config/activity'

/** Card "Atividade Recente": mini-feed da mesma fonte do módulo Atividades. */
export function RecentActivity() {
  const state = useApi<ActivityEvent[]>('/api/activity')
  return (
    <Card>
      <CardHeader>Atividade Recente</CardHeader>
      <Async state={state}>
        {(activity) => (
          // Altura máxima + rolagem interna: a lista cresce sem empurrar a página.
          <div className="max-h-72 overflow-y-auto">
            {activity.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 border-b border-border/50 px-4 py-2.5 text-sm last:border-0"
              >
                <StatusDot tone={ACTIVITY_TYPE[item.type].tone} size="xs" />
                <span className="flex-1 truncate text-xs text-ink-muted">{item.title}</span>
                <span className="whitespace-nowrap text-xs text-ink-faint">{item.time}</span>
              </div>
            ))}
          </div>
        )}
      </Async>
    </Card>
  )
}

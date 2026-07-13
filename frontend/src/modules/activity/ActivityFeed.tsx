import { Badge, Card, IconChip, ListRow } from '@/components/ui'
import { ACTIVITY_TYPE, type ActivityEvent } from '@/config/activity'
import { formatBRL } from '@/lib/format'

/** Lista de atividades agrupada por dia (ou o estado vazio do filtro). */
export function ActivityFeed({ groups }: { groups: [string, ActivityEvent[]][] }) {
  if (groups.length === 0) {
    return (
      <Card>
        <div className="px-4 py-12 text-center text-sm text-ink-muted">
          Nenhuma atividade encontrada para esse filtro.
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {groups.map(([date, dayEvents]) => (
        <div key={date}>
          <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
            {date}
          </h2>
          <Card>
            {dayEvents.map((ev) => {
              const cat = ACTIVITY_TYPE[ev.type]
              const Icon = cat.icon
              return (
                <ListRow
                  key={ev.id}
                  leading={
                    <IconChip tone={cat.tone}>
                      <Icon size={15} />
                    </IconChip>
                  }
                  trailing={
                    <div className="text-right">
                      {ev.amount != null && (
                        <div className="text-sm font-semibold tabular-nums text-ink">
                          {formatBRL(ev.amount)}
                        </div>
                      )}
                      <div className="text-xs text-ink-faint">{ev.time}</div>
                    </div>
                  }
                >
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-ink">{ev.title}</span>
                    <Badge tone={cat.tone}>{cat.label}</Badge>
                  </div>
                  {ev.customer && (
                    <div className="mt-0.5 truncate text-xs text-ink-faint">{ev.customer}</div>
                  )}
                </ListRow>
              )
            })}
          </Card>
        </div>
      ))}
    </div>
  )
}

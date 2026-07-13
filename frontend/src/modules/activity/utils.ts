import { ACTIVITY_ORDER, ACTIVITY_TYPE, type ActivityType, type ActivityEvent } from '@/config/activity'

export type Filter = ActivityType | 'all'

export const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Todos' },
  ...ACTIVITY_ORDER.map((t) => ({ key: t, label: ACTIVITY_TYPE[t].label })),
]

/** Agrupa os eventos por dia preservando a ordem cronológica. */
export function groupByDate(events: ActivityEvent[]): [string, ActivityEvent[]][] {
  const groups = new Map<string, ActivityEvent[]>()
  for (const ev of events) {
    const bucket = groups.get(ev.date) ?? []
    bucket.push(ev)
    groups.set(ev.date, bucket)
  }
  return [...groups.entries()]
}

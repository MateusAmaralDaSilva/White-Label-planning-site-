import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Card } from '@/components/ui'
import { cn } from '@/lib/cn'
import { hexTint } from '@/lib/color'
import type { CalendarEvent } from '@contracts'
import { MONTHS, WEEKDAYS, eventsByDay } from './utils'

/** Card do calendário: navegação de mês + grade de dias com os eventos. */
export function MonthGrid({
  view,
  events,
  onPrev,
  onNext,
  onEventClick,
}: {
  view: { month: number; year: number }
  events: CalendarEvent[]
  onPrev: () => void
  onNext: () => void
  onEventClick: (ev: CalendarEvent) => void
}) {
  const today = new Date()
  const firstWeekday = new Date(view.year, view.month, 1).getDay()
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate()
  const cells = [
    ...Array<null>(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  const byDay = eventsByDay(events, view.year, view.month)
  const isToday = (day: number) =>
    day === today.getDate() && view.month === today.getMonth() && view.year === today.getFullYear()

  const navBtn = 'rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-surface-hover'

  return (
    <Card>
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <button onClick={onPrev} className={navBtn}>
          <ChevronLeft size={18} />
        </button>
        <span className="text-sm font-semibold text-ink">
          {MONTHS[view.month]} {view.year}
        </span>
        <button onClick={onNext} className={navBtn}>
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="grid grid-cols-7">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="border-b border-border py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-ink-faint"
          >
            {d}
          </div>
        ))}
        {cells.map((day, i) => (
          <div
            key={i}
            className={cn(
              'min-h-[72px] border-b border-r border-border p-1.5 [&:nth-child(7n)]:border-r-0',
              day !== null && 'transition-colors hover:bg-surface-hover',
            )}
          >
            {day && (
              <>
                <span
                  className={cn(
                    'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium',
                    isToday(day) ? 'bg-accent font-bold text-white' : 'text-ink-muted',
                  )}
                >
                  {day}
                </span>
                <div className="mt-1 space-y-1">
                  {(byDay[day] ?? []).map((ev) => (
                    <button
                      key={ev.id}
                      onClick={() => onEventClick(ev)}
                      title="Clique para editar"
                      className="block w-full truncate rounded border-l-2 px-1.5 py-0.5 text-left text-[10px] font-medium"
                      style={{ ...hexTint(ev.color), borderColor: ev.color }}
                    >
                      {ev.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </Card>
  )
}

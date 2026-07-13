import { useState } from 'react'
import { Async, PageHeader } from '@/components/ui'
import { useApi } from '@/hooks/useApi'
import type { CalendarEvent, Calendar as Agenda } from '@contracts'
import { toDateInput } from './utils'
import { AgendaBar } from './AgendaBar'
import { MonthGrid } from './MonthGrid'
import { EventForm } from './EventForm'
import { ManageAgendasModal } from './ManageAgendasModal'

/** Aba Agendamentos (casca): estado do mês/filtro + wiring das peças (ver ./*.tsx). */
export default function CalendarModule() {
  const today = new Date()
  const [view, setView] = useState({ month: today.getMonth(), year: today.getFullYear() })
  // null = fechado · 'new' = criando · CalendarEvent = editando aquele evento.
  const [editing, setEditing] = useState<CalendarEvent | 'new' | null>(null)
  const [managing, setManaging] = useState(false)
  // 'all' = todas as agendas visíveis · id = filtra por uma agenda.
  const [selected, setSelected] = useState<string>('all')
  const agendasState = useApi<Agenda[]>('/api/calendar/calendars')
  const eventsState = useApi<CalendarEvent[]>('/api/calendar/events')

  const step = (delta: number) =>
    setView(({ month, year }) => {
      const next = month + delta
      if (next < 0) return { month: 11, year: year - 1 }
      if (next > 11) return { month: 0, year: year + 1 }
      return { month: next, year }
    })

  const onCurrentMonth = view.month === today.getMonth() && view.year === today.getFullYear()
  const defaultDate = onCurrentMonth
    ? toDateInput(today.getFullYear(), today.getMonth(), today.getDate())
    : toDateInput(view.year, view.month, 1)

  return (
    <div className="space-y-5">
      <PageHeader title="Agendamentos" subtitle="Gerencie suas agendas e compromissos" />

      <Async state={agendasState}>
        {(agendas) => {
          // Agenda usada ao criar: a filtrada (se houver) ou a primeira.
          const defaultAgendaId = selected !== 'all' ? selected : agendas[0]?.id
          return (
            <div className="space-y-4">
              <AgendaBar
                agendas={agendas}
                selected={selected}
                onSelect={setSelected}
                onManage={() => setManaging(true)}
                onNew={() => (agendas.length ? setEditing('new') : setManaging(true))}
              />

              <Async state={eventsState}>
                {(events) => (
                  <MonthGrid
                    view={view}
                    events={selected === 'all' ? events : events.filter((e) => e.calendarId === selected)}
                    onPrev={() => step(-1)}
                    onNext={() => step(1)}
                    onEventClick={setEditing}
                  />
                )}
              </Async>

              {editing !== null && (
                <EventForm
                  initial={editing === 'new' ? undefined : editing}
                  agendas={agendas}
                  defaultDate={defaultDate}
                  defaultAgendaId={defaultAgendaId}
                  onClose={() => setEditing(null)}
                  onSaved={(ev) => {
                    setEditing(null)
                    if (ev) setView({ month: ev.month, year: ev.year })
                    eventsState.reload()
                  }}
                />
              )}

              {managing && (
                <ManageAgendasModal
                  agendas={agendas}
                  onClose={() => setManaging(false)}
                  onChanged={() => {
                    setSelected('all') // evita filtro apontando para agenda removida
                    agendasState.reload()
                    eventsState.reload()
                  }}
                />
              )}
            </div>
          )
        }}
      </Async>
    </div>
  )
}

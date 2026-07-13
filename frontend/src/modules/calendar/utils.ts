import type { CalendarEvent } from '@contracts'

export const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export const MONTHS = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

/** Indexa os eventos do mês/ano visíveis por dia. */
export function eventsByDay(events: CalendarEvent[], year: number, month: number) {
  const map: Record<number, CalendarEvent[]> = {}
  for (const ev of events) {
    if (ev.year !== year || ev.month !== month) continue
    ;(map[ev.day] ??= []).push(ev)
  }
  return map
}

/** Monta o valor de <input type="date"> (YYYY-MM-DD) a partir de mês 0-based. */
export const toDateInput = (year: number, month: number, day: number) =>
  `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`

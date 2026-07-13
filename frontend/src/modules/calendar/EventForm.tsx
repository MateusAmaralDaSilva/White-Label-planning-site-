import { useState, type FormEvent } from 'react'
import { FormActions, Modal, SelectField, TextField } from '@/components/ui'
import { api } from '@/lib/api'
import { useResourceForm } from '@/hooks/useResourceForm'
import type { CalendarEvent, Calendar as Agenda } from '@contracts'
import { toDateInput } from './utils'
import { ColorField } from './ColorField'

/**
 * Modal de criar/editar um agendamento. Assume ≥1 agenda — a casca só abre este
 * modal quando há agendas (senão manda o usuário para "Agendas").
 */
export function EventForm({
  initial,
  agendas,
  defaultDate,
  defaultAgendaId,
  onClose,
  onSaved,
}: {
  initial?: CalendarEvent
  agendas: Agenda[]
  defaultDate: string
  defaultAgendaId?: string
  onClose: () => void
  onSaved: (ev?: CalendarEvent) => void
}) {
  const editing = initial !== undefined
  const [label, setLabel] = useState(initial?.label ?? '')
  const [calendarId, setCalendarId] = useState(
    initial?.calendarId ?? defaultAgendaId ?? agendas[0]?.id ?? '',
  )
  const [date, setDate] = useState(
    initial ? toDateInput(initial.year, initial.month, initial.day) : defaultDate,
  )
  const agendaColor = agendas.find((a) => a.id === calendarId)?.color ?? '#4F78FF'
  const [color, setColor] = useState(initial?.color ?? agendaColor)
  const { busy, error, run } = useResourceForm()

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    run(async () => {
      const [year, month, day] = date.split('-').map(Number)
      const body = { calendarId, label: label.trim(), year, month: month - 1, day, color }
      const ev = editing
        ? await api.put<CalendarEvent>(`/api/calendar/events/${initial.id}`, body)
        : await api.post<CalendarEvent>('/api/calendar/events', body)
      onSaved(ev)
    }, 'Não foi possível salvar o agendamento.')
  }

  function handleDelete() {
    if (!initial || !window.confirm(`Excluir "${initial.label}"?`)) return
    run(async () => {
      await api.del(`/api/calendar/events/${initial.id}`)
      onSaved()
    }, 'Não foi possível excluir o agendamento.')
  }

  return (
    <Modal
      title={editing ? 'Editar agendamento' : 'Novo agendamento'}
      subtitle={editing ? 'Atualize o compromisso' : 'Adicione um evento a uma agenda'}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <SelectField label="Agenda" id="event-agenda" value={calendarId} onChange={setCalendarId}>
          {agendas.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
              {a.isPrivate ? ' (privada)' : ''}
            </option>
          ))}
        </SelectField>

        <TextField
          label="Descrição"
          id="event-label"
          value={label}
          onChange={setLabel}
          placeholder="Reunião com cliente"
          required
          autoFocus
        />

        <div className="grid grid-cols-[1fr_auto] gap-3">
          <TextField label="Data" id="event-date" type="date" value={date} onChange={setDate} required />
          <ColorField id="event-color" value={color} onChange={setColor} />
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <FormActions
          editing={editing}
          busy={busy}
          onCancel={onClose}
          onDelete={handleDelete}
          submitLabel="Criar agendamento"
        />
      </form>
    </Modal>
  )
}

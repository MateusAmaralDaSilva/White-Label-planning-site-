import { useState, type FormEvent } from 'react'
import { Lock } from 'lucide-react'
import { Button, TextField } from '@/components/ui'
import { api } from '@/lib/api'
import { useResourceForm } from '@/hooks/useResourceForm'
import type { Calendar as Agenda } from '@contracts'
import { ColorField } from './ColorField'

/** Formulário inline de agenda (novo/editar), dentro do modal de agendas. */
export function AgendaForm({
  initial,
  onCancel,
  onSaved,
}: {
  initial?: Agenda
  onCancel: () => void
  onSaved: () => void
}) {
  const editing = initial !== undefined
  const [name, setName] = useState(initial?.name ?? '')
  const [color, setColor] = useState(initial?.color ?? '#4F78FF')
  const [isPrivate, setIsPrivate] = useState(initial?.isPrivate ?? false)
  const { busy, error, run } = useResourceForm()

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    run(async () => {
      const body = { name: name.trim(), color, isPrivate }
      if (editing) await api.put(`/api/calendar/calendars/${initial.id}`, body)
      else await api.post('/api/calendar/calendars', body)
      onSaved()
    }, 'Não foi possível salvar a agenda.')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-border p-3">
      <div className="grid grid-cols-[1fr_auto] gap-3">
        <TextField
          label="Nome da agenda"
          id="agenda-name"
          value={name}
          onChange={setName}
          placeholder="Ex.: Dr. João, Sala 1, Minha agenda"
          required
          autoFocus
        />
        <ColorField id="agenda-color" value={color} onChange={setColor} />
      </div>

      <label className="flex cursor-pointer items-start gap-2.5">
        <input
          type="checkbox"
          checked={isPrivate}
          onChange={(e) => setIsPrivate(e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-accent"
        />
        <span className="text-sm text-ink-muted">
          <span className="flex items-center gap-1 font-medium text-ink">
            <Lock size={12} /> Agenda privada
          </span>
          Só você vê e edita esta agenda. Sem marcar, toda a conta enxerga.
        </span>
      </label>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={busy}>
          Cancelar
        </Button>
        <Button type="submit" loading={busy}>
          {editing ? 'Salvar' : 'Criar agenda'}
        </Button>
      </div>
    </form>
  )
}

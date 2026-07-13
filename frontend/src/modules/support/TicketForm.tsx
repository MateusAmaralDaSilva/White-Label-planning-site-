import { useState, type FormEvent } from 'react'
import { FormActions, Modal, SelectField, TextField } from '@/components/ui'
import { api } from '@/lib/api'
import { useResourceForm } from '@/hooks/useResourceForm'
import type { Ticket } from '@contracts'

const STATUSES = ['Aberto', 'Em andamento', 'Resolvido'] as const

/** Modal de abrir/editar um chamado. Na edição inclui o status (o tom deriva dele no server). */
export function TicketForm({
  initial,
  onClose,
  onSaved,
}: {
  initial?: Ticket
  onClose: () => void
  onSaved: () => void
}) {
  const editing = initial !== undefined
  const [subject, setSubject] = useState(initial?.subject ?? '')
  const [customer, setCustomer] = useState(initial?.customer ?? '')
  const [status, setStatus] = useState(initial?.status ?? 'Aberto')
  const { busy, error, run } = useResourceForm()

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    run(async () => {
      // encodeURIComponent: o id ("#083") tem '#', que na URL viraria fragmento.
      if (editing) {
        await api.put(`/api/support/tickets/${encodeURIComponent(initial.id)}`, {
          subject: subject.trim(),
          customer: customer.trim(),
          status,
        })
      } else {
        await api.post('/api/support/tickets', { subject: subject.trim(), customer: customer.trim() })
      }
      onSaved()
    }, 'Não foi possível salvar o chamado.')
  }

  function handleDelete() {
    if (!initial || !window.confirm(`Excluir o chamado ${initial.id}?`)) return
    run(async () => {
      await api.del(`/api/support/tickets/${encodeURIComponent(initial.id)}`)
      onSaved()
    }, 'Não foi possível excluir o chamado.')
  }

  return (
    <Modal
      title={editing ? `Editar chamado ${initial.id}` : 'Novo chamado'}
      subtitle={editing ? 'Atualize ou mude o status' : 'Abra um chamado de suporte'}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <TextField label="Assunto" id="ticket-subject" value={subject} onChange={setSubject} placeholder="Produto não chegou" required autoFocus />
        <TextField label="Cliente" id="ticket-customer" value={customer} onChange={setCustomer} placeholder="Ana Paula S." required />

        {editing && (
          <SelectField label="Status" id="ticket-status" value={status} onChange={setStatus}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </SelectField>
        )}

        {error && <p className="text-sm text-danger">{error}</p>}

        <FormActions
          editing={editing}
          busy={busy}
          onCancel={onClose}
          onDelete={handleDelete}
          submitLabel="Abrir chamado"
        />
      </form>
    </Modal>
  )
}

import { useState, type FormEvent } from 'react'
import { FormActions, Modal, TextField } from '@/components/ui'
import { api } from '@/lib/api'
import { useResourceForm } from '@/hooks/useResourceForm'
import type { DashboardTask } from '@contracts'

/** Modal de criar/editar uma tarefa do dashboard. */
export function TaskForm({
  initial,
  onClose,
  onSaved,
}: {
  initial?: DashboardTask
  onClose: () => void
  onSaved: () => void
}) {
  const editing = initial !== undefined
  const [label, setLabel] = useState(initial?.label ?? '')
  const { busy, error, run } = useResourceForm()

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    run(async () => {
      const body = { label: label.trim() }
      if (editing) await api.put(`/api/dashboard/tasks/${initial.id}`, body)
      else await api.post('/api/dashboard/tasks', body)
      onSaved()
    }, 'Não foi possível salvar a tarefa.')
  }

  function handleDelete() {
    if (!initial || !window.confirm(`Excluir "${initial.label}"?`)) return
    run(async () => {
      await api.del(`/api/dashboard/tasks/${initial.id}`)
      onSaved()
    }, 'Não foi possível excluir a tarefa.')
  }

  return (
    <Modal
      title={editing ? 'Editar tarefa' : 'Nova tarefa'}
      subtitle={editing ? 'Atualize a descrição' : 'Adicione uma tarefa ao dashboard'}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <TextField
          label="Descrição"
          id="task-label"
          value={label}
          onChange={setLabel}
          placeholder="Aprovar 3 pedidos pendentes"
          required
          autoFocus
        />

        {error && <p className="text-sm text-danger">{error}</p>}

        <FormActions
          editing={editing}
          busy={busy}
          onCancel={onClose}
          onDelete={handleDelete}
          submitLabel="Criar tarefa"
        />
      </form>
    </Modal>
  )
}

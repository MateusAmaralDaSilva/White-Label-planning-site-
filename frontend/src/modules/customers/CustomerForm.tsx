import { useState, type FormEvent } from 'react'
import { FormActions, Modal, TextField } from '@/components/ui'
import { api } from '@/lib/api'
import { useResourceForm } from '@/hooks/useResourceForm'
import type { Customer } from '@contracts'

/** Modal de criar/editar um cliente. */
export function CustomerForm({
  initial,
  onClose,
  onSaved,
}: {
  initial?: Customer
  onClose: () => void
  onSaved: () => void
}) {
  const editing = initial !== undefined
  const [name, setName] = useState(initial?.name ?? '')
  const [email, setEmail] = useState(initial?.email ?? '')
  const [phone, setPhone] = useState(initial?.phone ?? '')
  const [responsible, setResponsible] = useState(initial?.responsible ?? '')
  const { busy, error, run } = useResourceForm()

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    run(async () => {
      const body = {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        responsible: responsible.trim(),
      }
      if (editing) await api.put(`/api/customers/${initial.id}`, body)
      else await api.post('/api/customers', body)
      onSaved()
    }, 'Não foi possível salvar o cliente.')
  }

  function handleDelete() {
    if (!initial || !window.confirm(`Excluir "${initial.name}"?`)) return
    run(async () => {
      await api.del(`/api/customers/${initial.id}`)
      onSaved()
    }, 'Não foi possível excluir o cliente.')
  }

  return (
    <Modal
      title={editing ? 'Editar cliente' : 'Novo cliente'}
      subtitle={editing ? 'Atualize os dados do cliente' : 'Cadastre um cliente no seu tenant'}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <TextField label="Nome" id="customer-name" value={name} onChange={setName} placeholder="Ana Paula Souza" required autoFocus />
        <TextField label="E-mail" id="customer-email" type="email" value={email} onChange={setEmail} placeholder="ana@email.com" required />
        <TextField label="Telefone" id="customer-phone" value={phone} onChange={setPhone} placeholder="(11) 99999-0000" required />
        <TextField
          label="Responsável (opcional)"
          id="customer-responsible"
          value={responsible}
          onChange={setResponsible}
          placeholder="Nome do responsável / contato"
        />

        {error && <p className="text-sm text-danger">{error}</p>}

        <FormActions
          editing={editing}
          busy={busy}
          onCancel={onClose}
          onDelete={handleDelete}
          submitLabel="Criar cliente"
        />
      </form>
    </Modal>
  )
}

import { useState, type FormEvent } from 'react'
import { Button, Modal, NumberField, TextField } from '@/components/ui'
import { api } from '@/lib/api'
import { useResourceForm } from '@/hooks/useResourceForm'

/** Modal de cadastro de um custo mensal da plataforma (entra no cálculo de lucro). */
export function ExpenseForm({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const now = new Date()
  const [refMonth, setRefMonth] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
  )
  const [label, setLabel] = useState('')
  const [amount, setAmount] = useState('')
  const { busy, error, run } = useResourceForm()

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    run(async () => {
      await api.post('/api/admin/platform-expenses', { refMonth, label: label.trim(), amount: Number(amount) })
      onCreated()
    }, 'Não foi possível salvar o custo.')
  }

  return (
    <Modal title="Novo custo" subtitle="Entra no cálculo do lucro da plataforma" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-[auto_1fr] gap-3">
          <TextField label="Mês" id="pexp-month" type="month" value={refMonth} onChange={setRefMonth} required />
          <TextField
            label="Descrição"
            id="pexp-label"
            value={label}
            onChange={setLabel}
            placeholder="Servidor, domínio, ferramentas…"
            required
            autoFocus
          />
        </div>

        <NumberField label="Valor (R$)" id="pexp-amount" value={amount} onChange={setAmount} placeholder="250.00" required />

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button type="submit" loading={busy}>
            Adicionar custo
          </Button>
        </div>
      </form>
    </Modal>
  )
}

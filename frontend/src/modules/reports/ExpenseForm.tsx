import { useState, type FormEvent } from 'react'
import { Button, Modal, NumberField, TextField } from '@/components/ui'
import { api } from '@/lib/api'
import { useResourceForm } from '@/hooks/useResourceForm'

/** Modal de cadastro de um gasto mensal (entra no cálculo de lucro/prejuízo). */
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
      await api.post('/api/expenses', { refMonth, label: label.trim(), amount: Number(amount) })
      onCreated()
    }, 'Não foi possível salvar o gasto.')
  }

  return (
    <Modal title="Novo gasto" subtitle="Entra no cálculo de lucro/prejuízo do mês" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-[auto_1fr] gap-3">
          <TextField label="Mês" id="expense-month" type="month" value={refMonth} onChange={setRefMonth} required />
          <TextField
            label="Descrição"
            id="expense-label"
            value={label}
            onChange={setLabel}
            placeholder="Aluguel, fornecedores, folha…"
            required
            autoFocus
          />
        </div>

        <NumberField
          label="Valor (R$)"
          id="expense-amount"
          value={amount}
          onChange={setAmount}
          placeholder="1500.00"
          required
        />

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button type="submit" loading={busy}>
            Adicionar gasto
          </Button>
        </div>
      </form>
    </Modal>
  )
}

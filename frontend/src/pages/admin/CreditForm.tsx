import { useState, type FormEvent } from 'react'
import { Button, Modal, NumberField, SelectField } from '@/components/ui'
import { api } from '@/lib/api'
import { useResourceForm } from '@/hooks/useResourceForm'
import { PLANS } from '@/config/plans'
import type { AdminAccount } from '@contracts'
import { formatDate } from './utils'

/** Creditar meses de assinatura a uma conta (soma ao saldo restante). */
export function CreditForm({
  account,
  onClose,
  onSaved,
}: {
  account: AdminAccount
  onClose: () => void
  onSaved: () => void
}) {
  const [plan, setPlan] = useState<string>(account.plan ?? PLANS[0].id)
  const [amount, setAmount] = useState('')
  const { busy, error, run } = useResourceForm()

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const months = PLANS.find((p) => p.id === plan)?.months ?? 1
    run(async () => {
      await api.post(`/api/admin/accounts/${account.tenantId}/credit`, {
        months,
        plan,
        amount: amount.trim() === '' ? undefined : Number(amount),
      })
      onSaved()
    }, 'Não foi possível creditar.')
  }

  return (
    <Modal
      title="Creditar assinatura"
      subtitle={`${account.brandName} — pago até ${formatDate(account.paidUntil)}`}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-ink-muted">
          Os meses do plano são somados ao saldo restante — pagar antes de vencer não perde os dias
          que sobraram.
        </p>
        <SelectField label="Plano a creditar" id="credit-plan" value={plan} onChange={setPlan}>
          {PLANS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} — +{p.months} {p.months === 1 ? 'mês' : 'meses'}
            </option>
          ))}
        </SelectField>

        <NumberField
          label="Valor cobrado pelo período (R$)"
          id="credit-amount"
          value={amount}
          onChange={setAmount}
          min={0}
          placeholder="vazio = preco padrao"
        />

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button type="submit" loading={busy}>
            Creditar
          </Button>
        </div>
      </form>
    </Modal>
  )
}

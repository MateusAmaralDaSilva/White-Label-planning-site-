import { useState, type FormEvent } from 'react'
import { Button, Modal, NumberField, SelectField, TextField } from '@/components/ui'
import { api } from '@/lib/api'
import { formatBRL } from '@/lib/format'
import { useResourceForm } from '@/hooks/useResourceForm'
import type { Product } from '@contracts'

const todayInput = () => {
  const t = new Date()
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
}

/** Modal de registrar venda: item + quantidade + data + e-mail, com prévia de receita/lucro. */
export function SaleForm({
  products,
  onClose,
  onCreated,
}: {
  products: Product[]
  onClose: () => void
  onCreated: () => void
}) {
  const [productId, setProductId] = useState(String(products[0]?.id ?? ''))
  const [quantity, setQuantity] = useState('1')
  const [soldAt, setSoldAt] = useState(todayInput())
  const [email, setEmail] = useState('')
  const { busy, error, run } = useResourceForm()

  const selected = products.find((p) => String(p.id) === productId)
  const qty = Number(quantity) || 0
  const previewRevenue = selected ? selected.price * qty : 0
  const previewProfit = selected ? (selected.price - selected.cost) * qty : 0

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    run(async () => {
      await api.post('/api/sales', {
        productId: Number(productId),
        quantity: Number(quantity),
        soldAt,
        email: email.trim() || undefined,
      })
      onCreated()
    }, 'Não foi possível registrar a venda.')
  }

  return (
    <Modal title="Registrar venda" subtitle="Lança receita e lucro nos relatórios" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <SelectField label="Item" id="sale-product" value={productId} onChange={setProductId} required>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} — {formatBRL(p.price)}
            </option>
          ))}
        </SelectField>

        <div className="grid grid-cols-2 gap-3">
          <NumberField label="Quantidade" id="sale-qty" value={quantity} onChange={setQuantity} min={1} step={1} required />
          <TextField label="Data" id="sale-date" type="date" value={soldAt} onChange={setSoldAt} required />
        </div>

        <TextField
          label="E-mail (opcional)"
          id="sale-email"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="cliente@email.com — para análise posterior"
        />

        <div className="flex justify-between border-t border-border pt-3 text-sm">
          <span className="text-ink-muted">
            Receita <span className="font-semibold text-ink">{formatBRL(previewRevenue)}</span>
          </span>
          <span className="text-ink-muted">
            Lucro{' '}
            <span className={`font-semibold ${previewProfit >= 0 ? 'text-success' : 'text-danger'}`}>
              {formatBRL(previewProfit)}
            </span>
          </span>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button type="submit" loading={busy}>
            Registrar
          </Button>
        </div>
      </form>
    </Modal>
  )
}

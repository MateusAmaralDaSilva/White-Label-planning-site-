import { useState, type FormEvent } from 'react'
import { FormActions, Modal, NumberField, TextField } from '@/components/ui'
import { api } from '@/lib/api'
import { useResourceForm } from '@/hooks/useResourceForm'
import type { Product, ProductKind } from '@contracts'
import { LABELS } from './labels'

/** Modal de criar/editar um item (produto ou serviço). `kind` vem fixado pela aba. */
export function ItemForm({
  kind,
  categories,
  initial,
  onClose,
  onSaved,
}: {
  kind: ProductKind
  categories: string[]
  initial?: Product
  onClose: () => void
  onSaved: () => void
}) {
  const L = LABELS[kind]
  const isProduct = kind === 'produto'
  const editing = initial !== undefined
  const [name, setName] = useState(initial?.name ?? '')
  const [category, setCategory] = useState(initial?.category ?? '')
  const [price, setPrice] = useState(initial ? String(initial.price) : '')
  const [cost, setCost] = useState(initial ? String(initial.cost) : '')
  const [stock, setStock] = useState(initial ? String(initial.stock) : '')
  const { busy, error, run } = useResourceForm()

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    run(async () => {
      const body = {
        name: name.trim(),
        category: category.trim(),
        kind, // fixado pela aba
        price: Number(price),
        cost: Number(cost),
        stock: isProduct ? Number(stock) : 0,
      }
      if (editing) await api.put(`/api/products/${initial.id}`, body)
      else await api.post('/api/products', body)
      onSaved()
    }, `Não foi possível salvar o ${L.one}.`)
  }

  function handleDelete() {
    if (!initial || !window.confirm(`Excluir "${initial.name}"?`)) return
    run(async () => {
      await api.del(`/api/products/${initial.id}`)
      onSaved()
    }, `Não foi possível excluir o ${L.one}.`)
  }

  return (
    <Modal
      title={editing ? `Editar ${L.one}` : `Novo ${L.one}`}
      subtitle={editing ? `Atualize os dados do ${L.one}` : `Cadastre ${L.a}`}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <TextField
          label="Nome"
          id="item-name"
          value={name}
          onChange={setName}
          placeholder={isProduct ? 'Camiseta Básica P' : 'Corte de Cabelo'}
          required
          autoFocus
        />
        <TextField
          label="Categoria"
          id="item-category"
          value={category}
          onChange={setCategory}
          placeholder={isProduct ? 'Vestuário' : 'Serviços'}
          required
          suggestions={categories}
        />
        <div className="grid grid-cols-2 gap-3">
          <NumberField label="Preço (R$)" id="item-price" value={price} onChange={setPrice} placeholder="79.90" required />
          <NumberField
            label={isProduct ? 'Custo (R$)' : 'Custo de prestar (R$)'}
            id="item-cost"
            value={cost}
            onChange={setCost}
            placeholder="42.00"
            required
          />
        </div>
        {isProduct && (
          <NumberField label="Estoque" id="item-stock" value={stock} onChange={setStock} placeholder="32" required step={1} />
        )}

        {error && <p className="text-sm text-danger">{error}</p>}

        <FormActions
          editing={editing}
          busy={busy}
          onCancel={onClose}
          onDelete={handleDelete}
          submitLabel={`Criar ${L.one}`}
        />
      </form>
    </Modal>
  )
}

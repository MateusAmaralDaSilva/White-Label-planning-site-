import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Async, Button, Card, PageHeader, SearchInput } from '@/components/ui'
import { useApi } from '@/hooks/useApi'
import type { Customer } from '@contracts'
import { CustomerRow } from './CustomerRow'
import { CustomerForm } from './CustomerForm'

/** Aba Clientes (casca): busca + lista + modal de cadastro/edição. */
export default function CustomersModule() {
  const [search, setSearch] = useState('')
  // null = fechado · 'new' = criando · Customer = editando aquele registro.
  const [editing, setEditing] = useState<Customer | 'new' | null>(null)
  const state = useApi<Customer[]>('/api/customers')
  const term = search.toLowerCase()

  return (
    <Async state={state}>
      {(customers) => {
        const filtered = customers.filter(
          (c) => c.name.toLowerCase().includes(term) || c.email.toLowerCase().includes(term),
        )

        return (
          <div className="space-y-6">
            <PageHeader
              title="Clientes"
              subtitle={`${customers.length} clientes cadastrados`}
              action={
                <Button onClick={() => setEditing('new')}>
                  <Plus size={16} /> Novo Cliente
                </Button>
              }
            />

            <Card>
              <div className="border-b border-border p-3">
                <SearchInput
                  placeholder="Buscar por nome ou e-mail..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              {filtered.map((customer) => (
                <CustomerRow key={customer.id} customer={customer} onClick={() => setEditing(customer)} />
              ))}
            </Card>

            {editing !== null && (
              <CustomerForm
                initial={editing === 'new' ? undefined : editing}
                onClose={() => setEditing(null)}
                onSaved={() => {
                  setEditing(null)
                  state.reload()
                }}
              />
            )}
          </div>
        )
      }}
    </Async>
  )
}

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Async, Button, Card, PageHeader, SearchInput } from '@/components/ui'
import { useApi } from '@/hooks/useApi'
import type { Product, ProductKind } from '@contracts'
import { LABELS } from './labels'
import { ItemTable } from './ItemTable'
import { ItemForm } from './ItemForm'

/** Catálogo genérico de itens, filtrado por `kind`. Base das abas Produtos e Serviços. */
export default function Catalog({ kind }: { kind: ProductKind }) {
  const L = LABELS[kind]
  const [search, setSearch] = useState('')
  // null = fechado · 'new' = criando · Product = editando aquele registro.
  const [editing, setEditing] = useState<Product | 'new' | null>(null)
  const state = useApi<Product[]>(`/api/products?kind=${kind}`)

  return (
    <Async state={state}>
      {(items) => {
        const filtered = items.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
        // Categorias já usadas neste tipo — viram as sugestões do campo Categoria.
        const categories = [...new Set(items.map((i) => i.category).filter(Boolean))].sort((a, b) =>
          a.localeCompare(b, 'pt-BR'),
        )

        return (
          <div className="space-y-6">
            <PageHeader
              title={L.title}
              subtitle={`${items.length} ${items.length === 1 ? L.one : L.title.toLowerCase()} cadastrados`}
              action={
                <Button onClick={() => setEditing('new')}>
                  <Plus size={16} /> Novo {L.one}
                </Button>
              }
            />

            <Card>
              <div className="border-b border-border p-3">
                <SearchInput
                  placeholder={`Buscar ${L.one}...`}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <ItemTable items={filtered} isProduct={kind === 'produto'} onEdit={setEditing} />
            </Card>

            {editing !== null && (
              <ItemForm
                kind={kind}
                categories={categories}
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

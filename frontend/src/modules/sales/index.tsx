import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Async, Button, Card, PageHeader } from '@/components/ui'
import { useApi } from '@/hooks/useApi'
import { api } from '@/lib/api'
import { formatBRL } from '@/lib/format'
import type { Product, Sale } from '@contracts'
import { SaleRow } from './SaleRow'
import { SaleForm } from './SaleForm'

/** Aba Vendas (casca): lista de vendas + modal de registro. */
export default function SalesModule() {
  const [creating, setCreating] = useState(false)
  const sales = useApi<Sale[]>('/api/sales')
  const products = useApi<Product[]>('/api/products')

  async function remove(sale: Sale) {
    if (!window.confirm(`Excluir a venda de "${sale.description}"?`)) return
    try {
      await api.del(`/api/sales/${sale.id}`)
      sales.reload()
    } catch {
      /* silencioso: o item permanece na lista se falhar */
    }
  }

  return (
    <Async state={sales}>
      {(list) => {
        const totalRevenue = list.reduce((s, v) => s + v.revenue, 0)
        const totalProfit = list.reduce((s, v) => s + v.profit, 0)
        const hasProducts = (products.data?.length ?? 0) > 0

        return (
          <div className="space-y-6">
            <PageHeader
              title="Vendas"
              subtitle={`${list.length} vendas · receita ${formatBRL(totalRevenue)} · lucro ${formatBRL(totalProfit)}`}
              action={
                <Button onClick={() => setCreating(true)} disabled={!hasProducts}>
                  <Plus size={16} /> Registrar venda
                </Button>
              }
            />

            {!hasProducts && (
              <Card>
                <p className="px-4 py-6 text-center text-sm text-ink-muted">
                  Cadastre um produto ou serviço primeiro para registrar vendas.
                </p>
              </Card>
            )}

            <Card>
              {list.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm text-ink-faint">
                  Nenhuma venda registrada.
                </p>
              ) : (
                list.map((sale) => <SaleRow key={sale.id} sale={sale} onRemove={remove} />)
              )}
            </Card>

            {creating && (
              <SaleForm
                products={products.data ?? []}
                onClose={() => setCreating(false)}
                onCreated={() => {
                  setCreating(false)
                  sales.reload()
                }}
              />
            )}
          </div>
        )
      }}
    </Async>
  )
}

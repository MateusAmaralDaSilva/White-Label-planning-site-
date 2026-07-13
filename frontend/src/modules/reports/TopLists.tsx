import { Card, CardHeader, CardBody } from '@/components/ui'
import { RankBars } from '@/components/charts'
import { formatBRL } from '@/lib/format'
import type { CategoryShare, ProductShare } from '@contracts'

/** Top Categorias e Top Produtos, lado a lado (por receita no período). */
export function TopLists({
  categories,
  products,
}: {
  categories: CategoryShare[]
  products: ProductShare[]
}) {
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      <Card>
        <CardHeader>Top Categorias</CardHeader>
        <CardBody>
          <RankBars
            items={categories.map((c) => ({ name: c.name, value: c.value, pct: c.pct }))}
            formatValue={formatBRL}
            tone="accent"
            emptyLabel="Sem vendas ainda."
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>Top Produtos</CardHeader>
        <CardBody>
          <RankBars
            items={products.map((p) => ({
              name: p.name,
              value: p.value,
              pct: p.pct,
              meta: `${p.qty} ${p.qty === 1 ? 'unidade' : 'unidades'} · lucro ${formatBRL(p.profit)}`,
            }))}
            formatValue={formatBRL}
            tone="info"
            emptyLabel="Sem vendas ainda."
          />
        </CardBody>
      </Card>
    </div>
  )
}

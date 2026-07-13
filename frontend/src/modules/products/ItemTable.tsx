import { Badge, type Tone } from '@/components/ui'
import { formatBRL } from '@/lib/format'
import type { Product } from '@contracts'

function stockStatus(stock: number): { label: string; tone: Tone } {
  if (stock === 0) return { label: 'Sem estoque', tone: 'danger' }
  if (stock < 10) return { label: 'Baixo estoque', tone: 'warning' }
  return { label: 'Ativo', tone: 'success' }
}

const TH = 'px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-faint'
const TD = 'px-4 py-3 text-ink-muted'

/** Tabela de itens do catálogo; clicar numa linha abre a edição. */
export function ItemTable({
  items,
  isProduct,
  onEdit,
}: {
  items: Product[]
  isProduct: boolean
  onEdit: (item: Product) => void
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className={TH}>{isProduct ? 'Produto' : 'Serviço'}</th>
            <th className={TH}>Categoria</th>
            <th className={TH}>Preço</th>
            <th className={TH}>Custo</th>
            <th className={TH}>Lucro un.</th>
            {isProduct && <th className={TH}>Estoque</th>}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const status = stockStatus(item.stock)
            return (
              <tr
                key={item.id}
                onClick={() => onEdit(item)}
                title="Clique para editar"
                className="cursor-pointer border-b border-border/50 transition-colors last:border-0 hover:bg-surface-hover"
              >
                <td className={`${TD} font-medium text-ink`}>{item.name}</td>
                <td className={TD}>{item.category}</td>
                <td className={`${TD} tabular-nums`}>{formatBRL(item.price)}</td>
                <td className={`${TD} tabular-nums`}>{formatBRL(item.cost)}</td>
                <td className={`${TD} tabular-nums text-ink`}>{formatBRL(item.price - item.cost)}</td>
                {isProduct && (
                  <td className={TD}>
                    <Badge tone={status.tone}>{status.label}</Badge>
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

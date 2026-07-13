import { Trash2 } from 'lucide-react'
import { ListRow } from '@/components/ui'
import { formatBRL } from '@/lib/format'
import type { Sale } from '@contracts'

const fmtDate = (s: string) => {
  const [y, m, d] = s.split('-')
  return `${d}/${m}/${y}`
}

/** Uma venda na lista: descrição + detalhes, com receita/lucro e excluir à direita. */
export function SaleRow({ sale, onRemove }: { sale: Sale; onRemove: (sale: Sale) => void }) {
  return (
    <ListRow
      trailing={
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-sm font-semibold tabular-nums text-ink">{formatBRL(sale.revenue)}</div>
            <div className={`text-xs tabular-nums ${sale.profit >= 0 ? 'text-success' : 'text-danger'}`}>
              {sale.profit >= 0 ? 'lucro ' : 'prejuízo '}
              {formatBRL(sale.profit)}
            </div>
          </div>
          <button
            onClick={() => onRemove(sale)}
            aria-label="Excluir venda"
            className="rounded-md p-1.5 text-ink-faint transition-colors hover:bg-danger/10 hover:text-danger"
          >
            <Trash2 size={15} />
          </button>
        </div>
      }
    >
      <div className="text-sm font-medium text-ink">{sale.description}</div>
      <div className="mt-0.5 text-xs text-ink-faint">
        {fmtDate(sale.soldAt)} · {sale.quantity}× {formatBRL(sale.unitPrice)} · {sale.category}
        {sale.email && <> · {sale.email}</>}
      </div>
    </ListRow>
  )
}

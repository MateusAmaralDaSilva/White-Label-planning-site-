import { Mail, Phone, UserCog } from 'lucide-react'
import { IconChip, ListRow } from '@/components/ui'
import { hexTint } from '@/lib/color'
import { formatBRL } from '@/lib/format'
import type { Customer } from '@contracts'

/** Uma linha da lista de clientes; clicar abre a edição. */
export function CustomerRow({ customer, onClick }: { customer: Customer; onClick: () => void }) {
  return (
    <ListRow
      onClick={onClick}
      leading={
        <IconChip style={hexTint(customer.accent)} className="text-xs font-bold">
          {customer.name.charAt(0)}
        </IconChip>
      }
      trailing={
        <div className="text-right">
          <div className="text-sm font-semibold tabular-nums text-ink">{formatBRL(customer.spent)}</div>
          <div className="text-xs text-ink-faint">{customer.orders} pedidos</div>
        </div>
      }
    >
      <div className="text-sm font-semibold text-ink">{customer.name}</div>
      <div className="mt-0.5 flex items-center gap-3 text-xs text-ink-faint">
        <span className="flex items-center gap-1">
          <Mail size={11} /> {customer.email}
        </span>
        <span className="hidden items-center gap-1 sm:flex">
          <Phone size={11} /> {customer.phone}
        </span>
        {customer.responsible && (
          <span className="hidden items-center gap-1 sm:flex">
            <UserCog size={11} /> {customer.responsible}
          </span>
        )}
      </div>
    </ListRow>
  )
}

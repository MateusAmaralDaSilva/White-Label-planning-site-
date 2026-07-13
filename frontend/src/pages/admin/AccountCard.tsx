import { Building2, CalendarClock, CreditCard, Pencil, Users } from 'lucide-react'
import { Badge, Button, Card } from '@/components/ui'
import type { AdminAccount } from '@contracts'
import { PLAN_LABEL, formatDate } from './utils'

/** Card de uma conta na lista do admin: marca, status, métricas e ações. */
export function AccountCard({
  account: acc,
  onEdit,
  onCredit,
  onManageUsers,
}: {
  account: AdminAccount
  onEdit: () => void
  onCredit: () => void
  onManageUsers: () => void
}) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {acc.logo ? (
              <img src={acc.logo} alt="" className="h-5 w-5 shrink-0 rounded object-contain" />
            ) : (
              <Building2 size={15} className="shrink-0 text-ink-faint" />
            )}
            <span className="truncate text-sm font-semibold text-ink">{acc.brandName}</span>
            <Badge tone={acc.active ? 'success' : 'danger'}>{acc.active ? 'Ativa' : 'Expirada'}</Badge>
          </div>
          <div className="mt-1 text-xs text-ink-faint">
            <code className="rounded bg-surface-hover px-1 py-0.5">{acc.tenantId}</code>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-muted">
            <span className="flex items-center gap-1">
              <Users size={12} />{' '}
              {acc.maxUsers !== null
                ? `${acc.userCount}/${acc.maxUsers} logins`
                : `${acc.userCount} ${acc.userCount === 1 ? 'login' : 'logins'}`}
            </span>
            <span className="flex items-center gap-1">
              <CalendarClock size={12} /> Pago até {formatDate(acc.paidUntil)}
            </span>
            {acc.plan && <span>Plano: {PLAN_LABEL[acc.plan] ?? acc.plan}</span>}
            {acc.industry && <span>Ramo: {acc.industry}</span>}
          </div>
          {acc.active && acc.daysLeft !== null && acc.daysLeft <= 7 && (
            <p className="mt-2 text-xs font-medium text-warning">
              Vence em {acc.daysLeft} {acc.daysLeft === 1 ? 'dia' : 'dias'}
            </p>
          )}
        </div>
        <button
          onClick={onEdit}
          aria-label="Editar marca e logo"
          title="Editar marca e logo"
          className="shrink-0 rounded-md p-1.5 text-ink-faint transition-colors hover:bg-surface-hover hover:text-ink"
        >
          <Pencil size={15} />
        </button>
      </div>
      <div className="flex gap-2 border-t border-border p-3">
        <Button variant="secondary" onClick={onCredit} className="flex-1">
          <CreditCard size={14} /> Creditar
        </Button>
        <Button variant="secondary" onClick={onManageUsers} className="flex-1">
          <Users size={14} /> Logins
        </Button>
      </div>
    </Card>
  )
}

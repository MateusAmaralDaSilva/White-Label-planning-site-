import { AlertTriangle } from 'lucide-react'
import { Badge, Card, CardHeader } from '@/components/ui'
import { formatBRL } from '@/lib/format'
import type { OverdueAccount } from '@contracts'
import { formatDate } from '../utils'

/** Card de inadimplência: contas com assinatura vencida + valor mensal em risco. */
export function OverdueCard({
  overdue,
  totalOverdue,
}: {
  overdue: OverdueAccount[]
  totalOverdue: number
}) {
  return (
    <Card>
      <CardHeader
        action={totalOverdue > 0 ? <Badge tone="warning">{totalOverdue} vencidas</Badge> : undefined}
      >
        Inadimplência
      </CardHeader>
      {overdue.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
          <span className="text-sm font-medium text-success">Nenhuma conta vencida</span>
          <span className="text-xs text-ink-faint">Todas as assinaturas em dia.</span>
        </div>
      ) : (
        <div className="max-h-72 overflow-y-auto">
          {overdue.map((o) => (
            <div
              key={o.tenantId}
              className="flex items-center gap-3 border-b border-border/50 px-4 py-2.5 last:border-0"
            >
              <AlertTriangle size={15} className="shrink-0 text-warning" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-ink">{o.brandName}</div>
                <div className="text-xs text-ink-faint">
                  Venceu em {formatDate(o.paidUntil)} · {o.daysOverdue}{' '}
                  {o.daysOverdue === 1 ? 'dia' : 'dias'} em atraso
                </div>
              </div>
              <span className="shrink-0 text-right text-sm font-medium tabular-nums text-warning">
                {formatBRL(o.monthlyValue)}
                <span className="block text-[10px] font-normal text-ink-faint">/mês</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

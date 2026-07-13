import { Card, CardHeader, CardBody } from '@/components/ui'
import { RankBars } from '@/components/charts'
import { formatBRL } from '@/lib/format'
import type { IndustrySlice, PlanSlice, TopAccount } from '@contracts'

/** Top contas por receita acumulada (lifetime). */
export function TopAccountsCard({ accounts }: { accounts: TopAccount[] }) {
  return (
    <Card>
      <CardHeader>Top Contas (receita acumulada)</CardHeader>
      <CardBody>
        <RankBars
          items={accounts.map((t) => ({ name: t.brandName, value: t.total, pct: t.pct }))}
          formatValue={formatBRL}
          tone="accent"
          emptyLabel="Sem cobranças registradas ainda."
        />
      </CardBody>
    </Card>
  )
}

/** Distribuição do MRR por plano (contas ativas). */
export function PlansCard({ plans }: { plans: PlanSlice[] }) {
  return (
    <Card>
      <CardHeader>Distribuição por plano (MRR)</CardHeader>
      <CardBody>
        {plans.length === 0 ? (
          <p className="py-6 text-center text-xs text-ink-faint">Nenhuma conta ativa no momento.</p>
        ) : (
          <RankBars
            items={plans.map((p) => ({
              name: p.label,
              value: p.mrr,
              pct: p.pct,
              meta: `${p.activeAccounts} ${p.activeAccounts === 1 ? 'conta ativa' : 'contas ativas'}`,
            }))}
            formatValue={formatBRL}
            tone="info"
            showRank={false}
          />
        )}
      </CardBody>
    </Card>
  )
}

/** Ramos (setores) que mais usam a plataforma, por nº de contas. */
export function IndustriesCard({
  industries,
  totalAccounts,
}: {
  industries: IndustrySlice[]
  totalAccounts: number
}) {
  return (
    <Card>
      <CardHeader
        action={
          <span className="text-xs text-ink-faint">
            {totalAccounts} {totalAccounts === 1 ? 'conta' : 'contas'}
          </span>
        }
      >
        Ramos que mais usam a plataforma
      </CardHeader>
      <CardBody>
        <RankBars
          items={industries.map((i) => ({ name: i.label, value: i.accounts, pct: i.pct }))}
          formatValue={(n) => `${n} ${n === 1 ? 'conta' : 'contas'}`}
          tone="accent"
          emptyLabel="Nenhuma conta cadastrada ainda."
        />
      </CardBody>
    </Card>
  )
}

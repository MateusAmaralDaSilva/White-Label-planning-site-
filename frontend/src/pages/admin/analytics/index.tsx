import { useState } from 'react'
import { Async } from '@/components/ui'
import { useApi } from '@/hooks/useApi'
import type { PlatformAnalytics } from '@contracts'
import { KpiRow } from './KpiRow'
import { RevenueChart } from './RevenueChart'
import { OverdueCard } from './OverdueCard'
import { TopAccountsCard, PlansCard, IndustriesCard } from './RankCards'
import { PlatformExpensesCard } from './PlatformExpensesCard'
import { ResultTable } from './ResultTable'
import { ExpenseForm } from './ExpenseForm'

/**
 * Painel FINANCEIRO do admin de plataforma (casca) — o "Power BI" do dono. Consome
 * GET /api/admin/analytics e compõe KPIs + gráfico + cards + tabela. Cada peça mora
 * no seu arquivo (ver ./*.tsx).
 */
export default function AdminAnalytics() {
  const [addingExpense, setAddingExpense] = useState(false)
  const state = useApi<PlatformAnalytics>('/api/admin/analytics')

  return (
    <>
      <Async state={state}>
        {(data) => (
          <div className="space-y-6">
            <KpiRow kpis={data.kpis} />
            <RevenueChart months={data.months} />

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              <OverdueCard overdue={data.overdue} totalOverdue={data.totals.overdue} />
              <TopAccountsCard accounts={data.topAccounts} />
            </div>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              <PlansCard plans={data.plans} />
              <PlatformExpensesCard
                expenses={data.expenses}
                onAdd={() => setAddingExpense(true)}
                onReload={state.reload}
              />
            </div>

            <IndustriesCard industries={data.industries} totalAccounts={data.totals.accounts} />
            <ResultTable months={data.months} />
          </div>
        )}
      </Async>

      {addingExpense && (
        <ExpenseForm
          onClose={() => setAddingExpense(false)}
          onCreated={() => {
            setAddingExpense(false)
            state.reload()
          }}
        />
      )}
    </>
  )
}

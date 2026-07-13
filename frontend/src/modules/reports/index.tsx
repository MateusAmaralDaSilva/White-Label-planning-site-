import { useState } from 'react'
import { Download } from 'lucide-react'
import { Async, Button, Card, PageHeader } from '@/components/ui'
import { useApi } from '@/hooks/useApi'
import type { ReportsData } from '@contracts'
import { exportCsv } from './utils'
import { KpiRow } from './KpiRow'
import { RevenueChart } from './RevenueChart'
import { TopLists } from './TopLists'
import { MonthlyResultTable } from './MonthlyResultTable'
import { CustomersSection } from './CustomersSection'
import { ExpensesCard } from './ExpensesCard'
import { ExpenseForm } from './ExpenseForm'

/**
 * Aba Relatórios: KPIs + gráfico Receita×Lucro + top categorias/produtos +
 * ranking de clientes + resultado mensal + gastos. Este arquivo é só a CASCA de
 * composição; cada seção mora no seu próprio arquivo (ver ./*.tsx).
 */
export default function ReportsModule() {
  const [addingExpense, setAddingExpense] = useState(false)
  const state = useApi<ReportsData>('/api/reports')

  return (
    <div className="space-y-6">
      <PageHeader
        title="Relatórios"
        subtitle="Lucro e desempenho — calculado das vendas"
        action={
          <Button
            onClick={() => exportCsv(state.data?.months ?? [])}
            disabled={!state.data?.months.length}
          >
            <Download size={16} /> Exportar CSV
          </Button>
        }
      />

      <Async state={state}>
        {({ kpis, months, categories, topProducts, topCustomers, expenses }) => {
          const isEmpty = kpis.length === 0 && expenses.length === 0
          return (
            <div className="space-y-6">
              {isEmpty && (
                <Card>
                  <p className="px-4 py-8 text-center text-sm text-ink-muted">
                    Ainda não há dados. Registre vendas na aba <strong>Vendas</strong> e cadastre os{' '}
                    <strong>gastos mensais</strong> abaixo.
                  </p>
                </Card>
              )}

              <KpiRow kpis={kpis} />
              <RevenueChart months={months} />
              <TopLists categories={categories} products={topProducts} />
              <CustomersSection customers={topCustomers} />

              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <MonthlyResultTable months={months} />
                <ExpensesCard
                  expenses={expenses}
                  onAdd={() => setAddingExpense(true)}
                  onReload={state.reload}
                />
              </div>
            </div>
          )
        }}
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
    </div>
  )
}

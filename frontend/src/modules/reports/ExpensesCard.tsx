import { Plus, Trash2 } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui'
import { api } from '@/lib/api'
import { formatBRL } from '@/lib/format'
import type { Expense } from '@contracts'
import { fmtMonth } from './utils'

/** Card dos gastos mensais cadastrados (a listagem vem junto de GET /api/reports). */
export function ExpensesCard({
  expenses,
  onAdd,
  onReload,
}: {
  expenses: Expense[]
  onAdd: () => void
  onReload: () => void
}) {
  async function removeExpense(exp: Expense) {
    if (!window.confirm(`Excluir o gasto "${exp.label}"?`)) return
    try {
      await api.del(`/api/expenses/${exp.id}`)
      onReload()
    } catch {
      /* mantém na lista se falhar */
    }
  }

  return (
    <Card>
      <CardHeader
        action={
          <button
            onClick={onAdd}
            aria-label="Novo gasto"
            className="rounded-md p-1 text-ink-faint transition-colors hover:bg-surface-hover hover:text-ink"
          >
            <Plus size={14} />
          </button>
        }
      >
        Gastos Mensais
      </CardHeader>
      {expenses.length === 0 ? (
        <p className="px-4 py-6 text-center text-xs text-ink-faint">Nenhum gasto cadastrado.</p>
      ) : (
        // Altura máxima + rolagem interna: a lista de gastos não estica o card.
        <div className="max-h-72 overflow-y-auto">
          {expenses.map((exp) => (
            <div
              key={exp.id}
              className="flex items-center gap-3 border-b border-border/50 px-4 py-2.5 last:border-0"
            >
              <span className="w-16 text-xs tabular-nums text-ink-faint">{fmtMonth(exp.refMonth)}</span>
              <span className="flex-1 truncate text-sm text-ink-muted">{exp.label}</span>
              <span className="text-sm font-medium tabular-nums text-ink">{formatBRL(exp.amount)}</span>
              <button
                onClick={() => removeExpense(exp)}
                aria-label="Excluir gasto"
                className="rounded-md p-1.5 text-ink-faint transition-colors hover:bg-danger/10 hover:text-danger"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

import { Plus, Trash2 } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui'
import { api } from '@/lib/api'
import { formatBRL } from '@/lib/format'
import type { PlatformExpense } from '@contracts'
import { fmtMonth } from './utils'

/** Custos mensais da plataforma (entram no cálculo de lucro): lista + excluir + novo. */
export function PlatformExpensesCard({
  expenses,
  onAdd,
  onReload,
}: {
  expenses: PlatformExpense[]
  onAdd: () => void
  onReload: () => void
}) {
  async function remove(exp: PlatformExpense) {
    if (!window.confirm(`Excluir o custo "${exp.label}"?`)) return
    try {
      await api.del(`/api/admin/platform-expenses/${exp.id}`)
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
            aria-label="Novo custo"
            className="rounded-md p-1 text-ink-faint transition-colors hover:bg-surface-hover hover:text-ink"
          >
            <Plus size={14} />
          </button>
        }
      >
        Custos da Plataforma
      </CardHeader>
      {expenses.length === 0 ? (
        <p className="px-4 py-6 text-center text-xs text-ink-faint">
          Nenhum custo cadastrado. Adicione servidor, ferramentas etc. para calcular o lucro.
        </p>
      ) : (
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
                onClick={() => remove(exp)}
                aria-label="Excluir custo"
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

// ── Expenses (gastos mensais) ─────────────────────────────────────────────────

export interface Expense {
  id: number
  /** Mês de competência no formato 'YYYY-MM'. */
  refMonth: string
  label: string
  amount: number
}

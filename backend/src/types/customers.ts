// ── Customers ─────────────────────────────────────────────────────────────────

export interface Customer {
  id: number
  name: string
  email: string
  phone: string
  orders: number
  /** Total gasto em BRL como número. */
  spent: number
  accent: string
  /** Nome do responsável/contato (opcional; texto livre). */
  responsible: string | null
}

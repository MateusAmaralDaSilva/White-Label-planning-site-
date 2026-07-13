// ── Sales (vendas registradas) ────────────────────────────────────────────────

export interface Sale {
  id: number
  productId: number | null
  description: string
  category: string
  quantity: number
  /** Preço e custo unitários no momento da venda (snapshot). */
  unitPrice: number
  unitCost: number
  /** Data da venda no formato 'YYYY-MM-DD'. */
  soldAt: string
  /** E-mail associado à venda (opcional), para análises posteriores. */
  email: string | null
  /** Derivados: receita = unitPrice*qty; lucro = (unitPrice-unitCost)*qty. */
  revenue: number
  profit: number
}

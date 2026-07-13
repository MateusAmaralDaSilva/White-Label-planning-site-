// ── Products ──────────────────────────────────────────────────────────────────

export type ProductKind = 'produto' | 'servico'

export interface Product {
  id: number
  name: string
  category: string
  /** Preço em BRL como número; o frontend formata (Intl.NumberFormat). */
  price: number
  /** Custo em BRL como número; lucro unitário = price - cost. */
  cost: number
  kind: ProductKind
  stock: number
}

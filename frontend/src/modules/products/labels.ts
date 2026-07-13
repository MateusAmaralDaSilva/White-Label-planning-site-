import type { ProductKind } from '@contracts'

/** Rótulos por tipo — o Catálogo serve tanto para Produtos quanto Serviços. */
export const LABELS: Record<ProductKind, { title: string; one: string; a: string }> = {
  produto: { title: 'Produtos', one: 'produto', a: 'um produto' },
  servico: { title: 'Serviços', one: 'serviço', a: 'um serviço' },
}

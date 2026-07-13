import type { IconKey, KpiFormat, Tone } from './common.js'
import type { Expense } from './expenses.js'

// ── Reports (relatórios do tenant) ────────────────────────────────────────────

export interface ReportKpi {
  label: string
  /** Valor cru da métrica; o front formata conforme `format`. */
  value: number
  format: KpiFormat
  /** Variação % vs período anterior; null quando não há base. */
  delta: number | null
  trend: 'up' | 'down'
  tone: Tone
  iconKey: IconKey
}

export interface RevenuePoint {
  month: string
  value: number
}

export interface CategoryShare {
  name: string
  pct: number
  value: number
}

/** Produto mais vendido no período (agrupado pela descrição da venda). */
export interface ProductShare {
  name: string
  /** Participação (%) na receita total do período. */
  pct: number
  /** Receita acumulada do produto no período. */
  value: number
  /** Unidades vendidas. */
  qty: number
  /** Lucro acumulado (receita − CMV) do produto no período. */
  profit: number
}

/** Uma linha do resultado mensal (base do gráfico, da tabela e do CSV). */
export interface MonthResult {
  /** Mês no formato 'YYYY-MM' (chave estável, sem ambiguidade de ano). */
  ym: string
  /** Rótulo curto para exibição (ex.: 'Jul'). */
  label: string
  revenue: number
  /** CMV — custo dos itens vendidos no mês. */
  cogs: number
  expenses: number
  /** Lucro líquido = revenue − cogs − expenses (pode ser negativo). */
  profit: number
}

/** Produto comprado por um cliente (linha do detalhe "o que comprou"). */
export interface CustomerProduct {
  name: string
  qty: number
  value: number
}

/**
 * Um cliente no ranking do relatório, agregado das VENDAS do período (não das
 * colunas manuais customers.orders/spent). Vendas sem `buyer_email` caem numa
 * única linha "Sem identificação" (email = null, name = '').
 */
export interface CustomerRank {
  /** E-mail do comprador; null = linha de vendas não identificadas. */
  email: string | null
  /** Nome do cliente cadastrado com esse e-mail; '' quando não há cadastro. */
  name: string
  /** Nº de vendas (linhas) do cliente no período. */
  orders: number
  /** Unidades compradas (Σ quantidade). */
  units: number
  /** Receita acumulada (Σ preço·qtd). */
  revenue: number
  /** Lucro acumulado (Σ (preço−custo)·qtd). */
  profit: number
  /** Ticket médio = revenue / orders. */
  avgTicket: number
  /** Data da última compra ('YYYY-MM-DD') ou null. */
  lastPurchase: string | null
  /** O que comprou: produtos por receita (top itens). */
  products: CustomerProduct[]
}

export interface ReportsData {
  kpis: ReportKpi[]
  /** Resultado mês a mês (dentro do período selecionado). */
  months: MonthResult[]
  categories: CategoryShare[]
  /** Produtos mais vendidos no período (por receita). */
  topProducts: ProductShare[]
  /** Melhores clientes no período (agregado das vendas). */
  topCustomers: CustomerRank[]
  /** Gastos cadastrados (lista completa, para gerenciar na aba). */
  expenses: Expense[]
}

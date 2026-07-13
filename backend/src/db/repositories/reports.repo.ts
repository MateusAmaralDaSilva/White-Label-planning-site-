import { withTenant } from '../tenant-context.js'
import { readExpenses } from './expenses.repo.js'
import type {
  CategoryShare,
  CustomerRank,
  MonthResult,
  ProductShare,
  ReportKpi,
  ReportsData,
} from '../../types/index.js'

/**
 * Relatórios CALCULADOS a partir de dados reais (vendas + gastos), não do seed.
 * Aceita um período opcional [from, to] (ambos 'YYYY-MM') que filtra os agregados
 * — a lista de gastos (para gerenciar) volta sempre completa. Sempre retorna uma
 * estrutura (arrays vazios quando não há dados); nunca 404.
 *
 *   receita(mês) = Σ preço·qtd das vendas do mês
 *   CMV(mês)     = Σ custo·qtd das vendas do mês
 *   lucro(mês)   = receita − CMV − gastos do mês   (negativo = prejuízo)
 */

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const monthLabel = (ym: string) => MESES[Number(ym.slice(5, 7)) - 1] ?? ym


/**
 * Converte um valor NUMERIC vindo do banco para número em reais, arredondado a
 * centavos. O `pg` devolve NUMERIC como STRING; somamos o dinheiro EXATAMENTE no
 * banco (em numeric) e convertemos só uma vez aqui, na borda — sem aritmética de
 * ponto flutuante acumulando nas somas.
 */
const money = (v: string | number | null | undefined): number =>
  Math.round(Number(v ?? 0) * 100) / 100

/** Variação percentual (número) vs base; null quando não há base — o front formata. */
function pctDelta(cur: number, prev: number): number | null {
  if (prev === 0) return cur === 0 ? 0 : null
  return ((cur - prev) / Math.abs(prev)) * 100
}

export async function getReports(
  tenantId: string,
  from?: string,
  to?: string,
): Promise<ReportsData> {
  // Limites do período como DATAS reais (indexáveis): intervalo [lo, hi) meia-aberto.
  // Comparar to_char(sold_at) envolvia a coluna numa função e impedia o índice
  // (tenant_id, sold_at) de fazer range scan — cada relatório varria TODAS as vendas
  // do tenant. Com bounds de data o índice poda o período. `lo` = 1º dia do mês
  // inicial; o SQL soma +1 mês ao mês final para obter o limite superior exclusivo.
  const lo = `${from ?? '0001-01'}-01` // 'YYYY-MM-01'
  const hi = to ?? '9999-12' // mês final (o SQL faz +1 mês → exclusivo)

  return withTenant(tenantId, async (query) => {
    const salesByMonth = await query<{ ym: string; revenue: string; cogs: string }>(
      `select to_char(sold_at, 'YYYY-MM') as ym,
              sum(unit_price * quantity) as revenue,
              sum(unit_cost * quantity) as cogs
         from app.sales
        where tenant_id = $1
          and sold_at >= $2::date
          and sold_at <  (($3 || '-01')::date + interval '1 month')
        group by 1`,
      [tenantId, lo, hi],
    )
    const expensesByMonth = await query<{ ym: string; expenses: string }>(
      `select to_char(ref_month, 'YYYY-MM') as ym, sum(amount) as expenses
         from app.expenses
        where tenant_id = $1
          and ref_month >= $2::date
          and ref_month <  (($3 || '-01')::date + interval '1 month')
        group by 1`,
      [tenantId, lo, hi],
    )
    const byCategory = await query<{ name: string; value: string }>(
      `select category as name, sum(unit_price * quantity) as value
         from app.sales
        where tenant_id = $1
          and sold_at >= $2::date
          and sold_at <  (($3 || '-01')::date + interval '1 month')
        group by 1 order by value desc`,
      [tenantId, lo, hi],
    )
    // Top produtos por receita no período (agrupa pela descrição = nome no snapshot).
    // Traz também unidades e lucro para a linha de meta do card.
    const byProduct = await query<{ name: string; value: string; qty: number; profit: string }>(
      `select description as name,
              sum(unit_price * quantity) as value,
              sum(quantity)::int as qty,
              sum((unit_price - unit_cost) * quantity) as profit
         from app.sales
        where tenant_id = $1
          and sold_at >= $2::date
          and sold_at <  (($3 || '-01')::date + interval '1 month')
        group by 1 order by value desc limit 8`,
      [tenantId, lo, hi],
    )
    // ── Clientes ────────────────────────────────────────────────────────────
    // Agregado POR VENDA (não usa customers.orders/spent, que são manuais).
    // Vendas sem buyer_email agrupam numa única linha (email = null) → depois
    // vira "Sem identificação" no frontend. O nome do cliente é resolvido à
    // parte (mapa e-mail→nome) para não arriscar fan-out do join caso dois
    // cadastros dividam o mesmo e-mail.
    const byCustomer = await query<{
      email: string | null
      orders: number
      units: number
      revenue: string
      profit: string
      last_purchase: string | null
    }>(
      `select buyer_email as email,
              count(*)::int as orders,
              sum(quantity)::int as units,
              sum(unit_price * quantity) as revenue,
              sum((unit_price - unit_cost) * quantity) as profit,
              to_char(max(sold_at), 'YYYY-MM-DD') as last_purchase
         from app.sales
        where tenant_id = $1
          and sold_at >= $2::date
          and sold_at <  (($3 || '-01')::date + interval '1 month')
        group by buyer_email`,
      [tenantId, lo, hi],
    )
    // Produtos comprados por e-mail (para o detalhe "o que comprou").
    const custProducts = await query<{
      email: string | null
      name: string
      qty: number
      value: string
    }>(
      `select buyer_email as email, description as name,
              sum(quantity)::int as qty,
              sum(unit_price * quantity) as value
         from app.sales
        where tenant_id = $1
          and sold_at >= $2::date
          and sold_at <  (($3 || '-01')::date + interval '1 month')
        group by buyer_email, description`,
      [tenantId, lo, hi],
    )
    // Mapa e-mail→nome do cadastro (case-insensitive; citext no banco).
    const custNames = await query<{ email: string; name: string }>(
      `select email, min(name) as name from app.customers where tenant_id = $1 group by email`,
      [tenantId],
    )

    // Lista de gastos para gerenciar: sempre completa (independe do período).
    const expenses = await readExpenses(query, tenantId)

    const topCustomers = buildCustomers(byCustomer, custProducts, custNames)

    // Une meses de vendas e de gastos (um mês só com gasto vira prejuízo).
    const map = new Map<string, MonthResult>()
    const touch = (ym: string) =>
      map.get(ym) ??
      map.set(ym, { ym, label: monthLabel(ym), revenue: 0, cogs: 0, expenses: 0, profit: 0 }).get(ym)!
    for (const s of salesByMonth) {
      const m = touch(s.ym)
      m.revenue = money(s.revenue)
      m.cogs = money(s.cogs)
    }
    for (const e of expensesByMonth) touch(e.ym).expenses = money(e.expenses)
    const months = [...map.values()].sort((a, b) => a.ym.localeCompare(b.ym))
    for (const m of months) m.profit = money(m.revenue - m.cogs - m.expenses)

    const catValues = byCategory.map((c) => ({ name: c.name, value: money(c.value) }))
    const totalRevenue = catValues.reduce((s, c) => s + c.value, 0)
    const categories: CategoryShare[] = catValues.map((c) => ({
      name: c.name,
      pct: totalRevenue > 0 ? Math.round((c.value / totalRevenue) * 100) : 0,
      value: c.value,
    }))

    const topProducts: ProductShare[] = byProduct.map((p) => {
      const value = money(p.value)
      return {
        name: p.name,
        pct: totalRevenue > 0 ? Math.round((value / totalRevenue) * 100) : 0,
        value,
        qty: Number(p.qty),
        profit: money(p.profit),
      }
    })

    return { kpis: buildKpis(months), months, categories, topProducts, topCustomers, expenses }
  })
}

/** Quantos produtos ("o que comprou") detalhar por cliente. */
const PRODUCTS_PER_CUSTOMER = 5
/** Teto de clientes no ranking (mantém o payload dos produtos limitado). */
const MAX_CUSTOMERS = 50

/**
 * Monta o ranking de clientes a partir dos agregados de venda. Junta nome do
 * cadastro (por e-mail, case-insensitive) e anexa os produtos mais comprados de
 * cada um. A linha sem e-mail (email = null) fica com name = '' — o frontend a
 * rotula como "Sem identificação". Ordena por receita desc (o frontend permite
 * reordenar por lucro / nº de compras).
 */
function buildCustomers(
  rows: { email: string | null; orders: number; units: number; revenue: string; profit: string; last_purchase: string | null }[],
  productRows: { email: string | null; name: string; qty: number; value: string }[],
  nameRows: { email: string; name: string }[],
): CustomerRank[] {
  // Sentinela para a chave nula (buyer_email ausente) nos mapas.
  const NULL_KEY = ' '
  const keyOf = (email: string | null) => (email === null ? NULL_KEY : email.toLowerCase())

  const nameByEmail = new Map<string, string>()
  for (const n of nameRows) nameByEmail.set(n.email.toLowerCase(), n.name)

  // Agrupa produtos por cliente, já ordenados por receita desc.
  const productsByKey = new Map<string, { name: string; qty: number; value: number }[]>()
  for (const p of productRows) {
    const k = keyOf(p.email)
    const list = productsByKey.get(k) ?? productsByKey.set(k, []).get(k)!
    list.push({ name: p.name, qty: Number(p.qty), value: money(p.value) })
  }
  for (const list of productsByKey.values()) list.sort((a, b) => b.value - a.value)

  return rows
    .map((r) => {
      const revenue = money(r.revenue)
      const orders = Number(r.orders)
      return {
        email: r.email,
        name: r.email === null ? '' : nameByEmail.get(r.email.toLowerCase()) ?? '',
        orders,
        units: Number(r.units),
        revenue,
        profit: money(r.profit),
        avgTicket: orders > 0 ? money(revenue / orders) : 0,
        lastPurchase: r.last_purchase,
        products: (productsByKey.get(keyOf(r.email)) ?? []).slice(0, PRODUCTS_PER_CUSTOMER),
      }
    })
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, MAX_CUSTOMERS)
}

/** KPIs do mês mais recente vs o anterior (dentro do período). */
function buildKpis(months: MonthResult[]): ReportKpi[] {
  if (months.length === 0) return []
  const cur = months[months.length - 1]
  const prev =
    months[months.length - 2] ?? { revenue: 0, cogs: 0, expenses: 0, profit: 0, ym: '', label: '' }

  const lucro = cur.profit >= 0
  const margem = cur.revenue > 0 ? (cur.profit / cur.revenue) * 100 : 0
  const margemPrev = prev.revenue > 0 ? (prev.profit / prev.revenue) * 100 : 0

  return [
    {
      label: 'Receita (mês)',
      value: cur.revenue,
      format: 'currency',
      delta: pctDelta(cur.revenue, prev.revenue),
      trend: cur.revenue >= prev.revenue ? 'up' : 'down',
      tone: 'accent',
      iconKey: 'revenue',
    },
    {
      label: lucro ? 'Lucro (mês)' : 'Prejuízo (mês)',
      value: cur.profit,
      format: 'currency',
      delta: pctDelta(cur.profit, prev.profit),
      trend: cur.profit >= prev.profit ? 'up' : 'down',
      tone: lucro ? 'success' : 'danger',
      iconKey: 'trend',
    },
    {
      label: 'Margem (mês)',
      value: margem,
      format: 'percent',
      delta: pctDelta(margem, margemPrev),
      trend: margem >= margemPrev ? 'up' : 'down',
      tone: 'info',
      iconKey: 'chart',
    },
  ]
}

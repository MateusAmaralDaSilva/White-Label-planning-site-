import { z } from 'zod'
import { pool } from '../pool.js'
import { listAccounts, PLAN_MONTHS, PLAN_PRICE } from './admin.repo.js'
import type {
  IndustrySlice,
  OverdueAccount,
  PlanSlice,
  PlatformAnalytics,
  PlatformExpense,
  PlatformKpi,
  PlatformMonth,
  TopAccount,
} from '../../types/index.js'

/**
 * Analítica financeira do ADMINISTRADOR DE PLATAFORMA (não do cliente): receita
 * das assinaturas, custos, lucro e inadimplência. Cruza dados de vários tenants,
 * então — como as demais operações de admin — passa pelas funções
 * `SECURITY DEFINER` `app.admin_*` (o único caminho autorizado fora do RLS),
 * cada uma revalidando o papel do ator no banco.
 *
 *   receita(mês) = Σ valores cobrados no mês (ledger app.billing_events)
 *   custo(mês)   = Σ custos da plataforma no mês (app.platform_expenses)
 *   lucro(mês)   = receita − custo
 *   MRR          = Σ (preço/meses do plano) das contas ATIVAS  (receita recorrente)
 *   inadimplência= contas com plano cujo prazo já venceu (MRR em risco)
 */

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const monthLabel = (ym: string) => MESES[Number(ym.slice(5, 7)) - 1] ?? ym

const PLAN_LABEL: Record<string, string> = {
  mensal: 'Mensal',
  semestral: 'Semestral',
  anual: 'Anual',
}

// Formatador só para as legendas (hint) dos KPIs — frases compostas no back. Os
// VALORES dos KPIs vão crus (número) e o front os formata. Com centavos, para
// casar com o resto do app.
const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const formatBRL = (n: number) => brl.format(n)

/** Valor mensal-equivalente de um plano (MRR por conta). Ex.: anual → preço/12. */
function monthlyValue(plan: string | null): number {
  if (!plan) return 0
  const price = PLAN_PRICE[plan]
  const months = PLAN_MONTHS[plan]
  if (!price || !months) return 0
  return price / months
}

/** Variação percentual formatada (ex.: "+12,4%"); null quando não há base. */
function pctDelta(cur: number, prev: number): number | null {
  if (prev === 0) return null
  return ((cur - prev) / Math.abs(prev)) * 100
}

/** 'YYYY-MM' do mês corrente (fuso do servidor, igual ao to_char do banco). */
function currentYm(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export async function getPlatformAnalytics(actorId: string): Promise<PlatformAnalytics> {
  // Reusa a listagem de contas (mesma fonte do painel de contas) para status,
  // plano e assinatura — de lá saem MRR, inadimplência e distribuição por plano.
  const accounts = await listAccounts(actorId)

  const revByMonth = await pool.query<{ ym: string; revenue: string }>(
    'select ym, revenue from app.admin_revenue_by_month($1)',
    [actorId],
  )
  const expenses = await readPlatformExpenses(actorId)
  const revByTenant = await pool.query<{
    tenant_id: string
    brand_name: string
    total: string
  }>('select tenant_id, brand_name, total from app.admin_revenue_by_tenant($1)', [actorId])

  // ── Meses: une receita (ledger) e custos (platform_expenses) ────────────────
  const map = new Map<string, PlatformMonth>()
  const touch = (ym: string) =>
    map.get(ym) ??
    map.set(ym, { ym, label: monthLabel(ym), revenue: 0, costs: 0, profit: 0 }).get(ym)!
  for (const r of revByMonth.rows) touch(r.ym).revenue = Number(r.revenue)
  for (const e of expenses) touch(e.refMonth).costs += e.amount
  const months = [...map.values()].sort((a, b) => a.ym.localeCompare(b.ym))
  for (const m of months) m.profit = m.revenue - m.costs

  // ── Inadimplência: contas que tiveram plano e o prazo já passou ─────────────
  const overdue: OverdueAccount[] = accounts
    .filter((a) => !a.active && a.paidUntil !== null)
    .map((a) => ({
      tenantId: a.tenantId,
      brandName: a.brandName,
      plan: a.plan,
      paidUntil: a.paidUntil,
      daysOverdue: a.daysLeft !== null ? Math.max(0, -a.daysLeft) : 0,
      monthlyValue: monthlyValue(a.plan),
    }))
    .sort((x, y) => y.daysOverdue - x.daysOverdue)

  // ── MRR e distribuição por plano (só contas ativas) ─────────────────────────
  const activeAccounts = accounts.filter((a) => a.active)
  const mrr = activeAccounts.reduce((s, a) => s + monthlyValue(a.plan), 0)
  const planMap = new Map<string, { count: number; mrr: number }>()
  for (const a of activeAccounts) {
    if (!a.plan) continue
    const slot = planMap.get(a.plan) ?? { count: 0, mrr: 0 }
    slot.count += 1
    slot.mrr += monthlyValue(a.plan)
    planMap.set(a.plan, slot)
  }
  const plans: PlanSlice[] = [...planMap.entries()]
    .map(([plan, v]) => ({
      plan,
      label: PLAN_LABEL[plan] ?? plan,
      activeAccounts: v.count,
      mrr: v.mrr,
      pct: mrr > 0 ? Math.round((v.mrr / mrr) * 100) : 0,
    }))
    .sort((a, b) => b.mrr - a.mrr)

  // ── Top contas por receita acumulada ────────────────────────────────────────
  const lifetimeRevenue = revByTenant.rows.reduce((s, r) => s + Number(r.total), 0)
  const topAccounts: TopAccount[] = revByTenant.rows.slice(0, 8).map((r) => ({
    tenantId: r.tenant_id,
    brandName: r.brand_name,
    total: Number(r.total),
    pct: lifetimeRevenue > 0 ? Math.round((Number(r.total) / lifetimeRevenue) * 100) : 0,
  }))

  // ── Distribuição por ramo: quantas contas em cada setor (quais mais usam) ─────
  // Conta TODAS as contas (não só ativas): mede a adoção por setor. Contas sem
  // ramo definido caem no balde "Não informado".
  const industryMap = new Map<string, number>()
  for (const a of accounts) {
    const key = a.industry ?? 'nao-informado'
    industryMap.set(key, (industryMap.get(key) ?? 0) + 1)
  }
  const industries: IndustrySlice[] = [...industryMap.entries()]
    .map(([industry, count]) => ({
      industry,
      // O valor guardado já é o rótulo (texto livre); nulo vira "Não informado".
      label: industry === 'nao-informado' ? 'Não informado' : industry,
      accounts: count,
      pct: accounts.length > 0 ? Math.round((count / accounts.length) * 100) : 0,
    }))
    .sort((a, b) => b.accounts - a.accounts)

  const kpis = buildKpis(months, {
    mrr,
    activeCount: activeAccounts.length,
    overdue,
  })

  return {
    kpis,
    months,
    overdue,
    topAccounts,
    plans,
    industries,
    expenses,
    totals: {
      accounts: accounts.length,
      active: activeAccounts.length,
      overdue: overdue.length,
      mrr,
      lifetimeRevenue,
    },
  }
}

/** KPIs do topo: receita e lucro do mês (com delta), MRR e inadimplência (snapshot). */
function buildKpis(
  months: PlatformMonth[],
  ctx: { mrr: number; activeCount: number; overdue: OverdueAccount[] },
): PlatformKpi[] {
  const ym = currentYm()
  const cur = months.find((m) => m.ym === ym) ?? { revenue: 0, costs: 0, profit: 0 }
  // Mês anterior ao corrente presente na série (para o delta).
  const prev = [...months].reverse().find((m) => m.ym < ym) ?? { revenue: 0, profit: 0 }

  const overdueValue = ctx.overdue.reduce((s, o) => s + o.monthlyValue, 0)
  const profitPositive = cur.profit >= 0

  return [
    {
      label: 'MRR (recorrente)',
      value: ctx.mrr,
      format: 'currency',
      delta: null,
      trend: 'up',
      hint: `${ctx.activeCount} ${ctx.activeCount === 1 ? 'conta ativa' : 'contas ativas'}`,
      tone: 'accent',
      iconKey: 'revenue',
    },
    {
      label: 'Receita (mês)',
      value: cur.revenue,
      format: 'currency',
      delta: pctDelta(cur.revenue, prev.revenue),
      trend: cur.revenue >= prev.revenue ? 'up' : 'down',
      hint: null,
      tone: 'info',
      iconKey: 'payment',
    },
    {
      label: profitPositive ? 'Lucro (mês)' : 'Prejuízo (mês)',
      value: cur.profit,
      format: 'currency',
      delta: pctDelta(cur.profit, prev.profit),
      trend: cur.profit >= prev.profit ? 'up' : 'down',
      hint: null,
      tone: profitPositive ? 'success' : 'danger',
      iconKey: 'trend',
    },
    {
      label: 'Inadimplência',
      value: ctx.overdue.length,
      format: 'number',
      delta: null,
      trend: 'down',
      hint:
        ctx.overdue.length === 0
          ? 'Nenhuma conta vencida'
          : `${formatBRL(overdueValue)}/mês em risco`,
      tone: ctx.overdue.length === 0 ? 'success' : 'warning',
      iconKey: 'ticket',
    },
  ]
}

// ── Custos da plataforma: leitura + CRUD (via funções SECURITY DEFINER) ───────

/** Mês 'YYYY-MM' (o front usa <input type="month">, o banco guarda o 1º dia). */
export const platformExpenseSchema = z.object({
  refMonth: z.string().regex(/^\d{4}-\d{2}$/, 'Mês deve ser YYYY-MM'),
  label: z.string().trim().min(1).max(120),
  amount: z.number().nonnegative(),
})
export type PlatformExpenseInput = z.infer<typeof platformExpenseSchema>

export async function readPlatformExpenses(actorId: string): Promise<PlatformExpense[]> {
  const { rows } = await pool.query<{
    id: string
    ref_month: Date
    label: string
    amount: string
  }>('select id, ref_month, label, amount from app.admin_platform_expenses($1)', [actorId])
  return rows.map((r) => ({
    id: Number(r.id),
    refMonth: r.ref_month.toISOString().slice(0, 7),
    label: r.label,
    amount: Number(r.amount),
  }))
}

export async function addPlatformExpense(
  actorId: string,
  input: PlatformExpenseInput,
): Promise<{ id: number }> {
  // 1º dia do mês de competência (mesma convenção de app.expenses).
  const refDate = `${input.refMonth}-01`
  const { rows } = await pool.query<{ admin_add_platform_expense: string }>(
    'select app.admin_add_platform_expense($1, $2, $3, $4) as admin_add_platform_expense',
    [actorId, refDate, input.label, input.amount],
  )
  return { id: Number(rows[0].admin_add_platform_expense) }
}

/** Remove um custo. false se não existir (o backend responde 404). */
export async function deletePlatformExpense(actorId: string, id: number): Promise<boolean> {
  const { rows } = await pool.query<{ admin_delete_platform_expense: number | null }>(
    'select app.admin_delete_platform_expense($1, $2) as admin_delete_platform_expense',
    [actorId, id],
  )
  return rows[0].admin_delete_platform_expense !== null
}

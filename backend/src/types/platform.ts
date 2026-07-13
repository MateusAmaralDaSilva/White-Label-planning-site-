import type { IconKey, KpiFormat, Tone } from './common.js'

// ── Platform analytics (painel financeiro do admin de plataforma) ─────────────

/** KPI do painel financeiro. `delta` (vs mês anterior) OU `hint` (linha auxiliar). */
export interface PlatformKpi {
  label: string
  /** Valor cru da métrica; o front formata conforme `format`. */
  value: number
  format: KpiFormat
  /** Variação % vs período anterior; null quando não se aplica. */
  delta: number | null
  trend: 'up' | 'down'
  /** Linha secundária (frase composta) quando não há delta (ex.: "12 contas ativas"). */
  hint: string | null
  tone: Tone
  iconKey: IconKey
}

/** Resultado mensal da PLATAFORMA (receita das assinaturas − custos = lucro). */
export interface PlatformMonth {
  ym: string
  label: string
  revenue: number
  costs: number
  profit: number
}

/** Conta inadimplente: assinatura vencida (teve plano e o prazo passou). */
export interface OverdueAccount {
  tenantId: string
  brandName: string
  plan: string | null
  paidUntil: string | null
  /** Dias inteiros desde o vencimento (>= 0). */
  daysOverdue: number
  /** Valor mensal-equivalente do plano (receita recorrente em risco). */
  monthlyValue: number
}

/** Conta no ranking de receita acumulada (lifetime). */
export interface TopAccount {
  tenantId: string
  brandName: string
  total: number
  /** Participação (%) na receita total acumulada. */
  pct: number
}

/** Fatia da distribuição por plano (contas ativas). */
export interface PlanSlice {
  plan: string
  label: string
  activeAccounts: number
  /** Receita recorrente mensal (MRR) das contas ativas neste plano. */
  mrr: number
  /** Participação (%) no MRR total. */
  pct: number
}

/** Fatia da distribuição por ramo (setor): quantas contas em cada ramo. */
export interface IndustrySlice {
  /** id do ramo, ou 'nao-informado' quando a conta não tem ramo definido. */
  industry: string
  label: string
  /** Número de contas neste ramo. */
  accounts: number
  /** Participação (%) no total de contas. */
  pct: number
}

/** Um custo mensal da plataforma (espelha Expense do tenant). */
export interface PlatformExpense {
  id: number
  /** Mês de competência 'YYYY-MM'. */
  refMonth: string
  label: string
  amount: number
}

/** Resposta de GET /api/admin/analytics — o "Power BI" do dono da plataforma. */
export interface PlatformAnalytics {
  kpis: PlatformKpi[]
  months: PlatformMonth[]
  overdue: OverdueAccount[]
  topAccounts: TopAccount[]
  plans: PlanSlice[]
  /** Distribuição de contas por ramo de atividade (quais setores mais usam). */
  industries: IndustrySlice[]
  expenses: PlatformExpense[]
  totals: {
    accounts: number
    active: number
    overdue: number
    /** Receita recorrente mensal total (contas ativas). */
    mrr: number
    /** Receita acumulada (soma do ledger). */
    lifetimeRevenue: number
  }
}

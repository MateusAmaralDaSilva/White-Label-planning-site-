// ── Admin de plataforma (listagem de contas e logins) ─────────────────────────

/** Um login (usuário) de uma conta, como listado no painel admin. */
export interface AdminUser {
  id: string
  email: string
  name: string
  isTenantAdmin: boolean
  createdAt: string
}

/** Uma conta (tenant) como listada no painel admin. */
export interface AdminAccount {
  tenantId: string
  brandName: string
  brandMark: string
  brandTagline: string
  themeId: string
  logo: string | null
  plan: string | null
  paidUntil: string | null
  active: boolean
  daysLeft: number | null
  userCount: number
  /** Limite de logins da conta; null = ilimitado. */
  maxUsers: number | null
  /** Ramo de atividade (setor) da conta; null = não informado. */
  industry: string | null
  createdAt: string
}

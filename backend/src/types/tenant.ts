import type { BillingStatus } from './billing.js'

// ── Tenant / branding / módulos ───────────────────────────────────────────────

export interface Brand {
  name: string
  mark: string
  /** Data URI da logo (ex.: 'data:image/png;base64,…') ou null (usa a sigla). */
  logo: string | null
  phone: string | null
  cnpj: string | null
}

/** Estado de um módulo para um tenant (o frontend faz merge com o registry). */
export interface ModuleConfig {
  id: string
  enabled: boolean
  order: number
}

/** Resposta de GET /api/config — o "bootstrap" do tenant após o login. */
export interface TenantConfig {
  tenantId: string
  brand: Brand
  themeId: string
  modules: ModuleConfig[]
  /** Assinatura do tenant; o front decide entre painel e tela de renovação. */
  billing: BillingStatus
}

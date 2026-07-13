// ── Auth ──────────────────────────────────────────────────────────────────────

export interface User {
  id: string
  email: string
  name: string
  tenantId: string
  /** true para o administrador de plataforma (pode provisionar contas). */
  isPlatformAdmin: boolean
  /** true para o dono/admin do tenant (gerencia os logins da própria conta). */
  isTenantAdmin: boolean
}

export interface AuthResponse {
  token: string
  user: User
}

/**
 * Payload embutido no JWT. `isPlatformAdmin` é assinado no servidor a partir do
 * banco — o cliente não consegue forjá-lo. Opcional na verificação por
 * compatibilidade com tokens antigos (default false).
 */
export interface JwtPayload {
  sub: string
  email: string
  tenantId: string
  isPlatformAdmin: boolean
  isTenantAdmin: boolean
}

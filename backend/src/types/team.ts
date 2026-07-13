// ── Equipe (logins do tenant, na visão do admin da conta) ─────────────────────

/** Um membro da equipe (login) na visão do admin do tenant. */
export interface TeamMember {
  id: string
  email: string
  name: string
  isTenantAdmin: boolean
  createdAt: string
}

/** Resposta de GET /api/team: limite + membros da conta. */
export interface TeamData {
  maxUsers: number | null
  members: TeamMember[]
}

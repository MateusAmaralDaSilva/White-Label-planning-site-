// ── Calendar ──────────────────────────────────────────────────────────────────

export interface CalendarEvent {
  id: string
  year: number
  /** Mês 0-based (janeiro = 0), igual ao Date do JavaScript. */
  month: number
  day: number
  label: string
  color: string
  /** Agenda à qual o evento pertence. */
  calendarId: string
}

/** Uma agenda (calendário nomeado) dentro de uma conta. */
export interface Calendar {
  id: string
  name: string
  color: string
  /** Privada = só o dono vê; compartilhada = toda a conta vê. */
  isPrivate: boolean
  /** true se o usuário atual é o dono (útil para a UI). */
  isOwner: boolean
}

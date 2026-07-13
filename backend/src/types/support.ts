import type { Tone } from './common.js'

// ── Support ───────────────────────────────────────────────────────────────────

export interface Ticket {
  id: string
  subject: string
  customer: string
  status: string
  tone: Tone
  time: string
}

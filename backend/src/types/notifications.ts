import type { IconKey, Tone } from './common.js'

// ── Notifications ─────────────────────────────────────────────────────────────

export interface AppNotification {
  id: string
  title: string
  description: string
  time: string
  tone: Tone
  iconKey: IconKey
}

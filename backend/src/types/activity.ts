// ── Activity ──────────────────────────────────────────────────────────────────

export type ActivityType =
  | 'sale'
  | 'appointment'
  | 'customer'
  | 'payment'
  | 'support'
  | 'product'

export interface ActivityEvent {
  id: string
  type: ActivityType
  title: string
  customer?: string
  amount?: number
  date: string
  time: string
}

import type { IconKey, Tone } from './common.js'

// ── Dashboard ─────────────────────────────────────────────────────────────────

export interface DashboardStat {
  label: string
  value: string
  delta: string
  tone: Tone
  iconKey: IconKey
}

export interface DashboardTask {
  id: number
  label: string
  done: boolean
}

export interface DashboardData {
  stats: DashboardStat[]
  tasks: DashboardTask[]
}

import type { ComponentType } from 'react'
import type { LucideIcon } from 'lucide-react'

export interface AppModule {
  id: string
  name: string
  description: string
  icon: LucideIcon
  path: string
  component: ComponentType
  enabled: boolean
  order: number
  /** Modules that can never be disabled */
  required?: boolean
}

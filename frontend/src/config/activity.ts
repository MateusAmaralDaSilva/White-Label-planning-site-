import {
  ShoppingBag,
  CalendarDays,
  UserPlus,
  DollarSign,
  MessageSquare,
  Package,
  type LucideIcon,
} from 'lucide-react'
import type { Tone } from '@/components/ui'

/**
 * Metadados de apresentação do log de atividades (rótulo/tom/ícone por tipo,
 * ordem dos filtros) e o formatador de moeda. Os DADOS vêm do backend:
 * GET /api/activity — o módulo Atividades e o Dashboard usam useApi.
 */

import type { ActivityEvent, ActivityType } from '@contracts'
export type { ActivityEvent, ActivityType }

/** Rótulo, tom (cor) e ícone de cada tipo de atividade. */
export const ACTIVITY_TYPE: Record<
  ActivityType,
  { label: string; tone: Tone; icon: LucideIcon }
> = {
  sale: { label: 'Venda', tone: 'accent', icon: ShoppingBag },
  appointment: { label: 'Agendamento', tone: 'info', icon: CalendarDays },
  customer: { label: 'Cliente', tone: 'success', icon: UserPlus },
  payment: { label: 'Pagamento', tone: 'warning', icon: DollarSign },
  support: { label: 'Chamados', tone: 'danger', icon: MessageSquare },
  product: { label: 'Produto', tone: 'neutral', icon: Package },
}

/** Ordem dos tipos nos filtros (segue a relevância para o negócio). */
export const ACTIVITY_ORDER: ActivityType[] = [
  'sale',
  'payment',
  'appointment',
  'customer',
  'support',
  'product',
]

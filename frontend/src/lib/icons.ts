import {
  ShoppingBag,
  DollarSign,
  TrendingUp,
  Users,
  UserPlus,
  MessageSquare,
  CalendarDays,
  Newspaper,
  Package,
  BarChart3,
  Circle,
  type LucideIcon,
} from 'lucide-react'

/**
 * Chave de ícone (vinda da API) → componente do lucide-react.
 *
 * O backend não envia componentes React; envia uma `iconKey` textual. Este é o
 * único lugar que resolve a chave para um ícone — mantê-lo aqui deixa o frontend
 * no controle da estética sem acoplar o backend à biblioteca de ícones.
 */
export type IconKey =
  | 'sale'
  | 'orders'
  | 'payment'
  | 'revenue'
  | 'ticket'
  | 'trend'
  | 'customer'
  | 'new-customer'
  | 'support'
  | 'appointment'
  | 'news'
  | 'product'
  | 'chart'

const ICONS: Record<IconKey, LucideIcon> = {
  sale: ShoppingBag,
  orders: ShoppingBag,
  payment: DollarSign,
  revenue: DollarSign,
  ticket: TrendingUp,
  trend: TrendingUp,
  customer: Users,
  'new-customer': UserPlus,
  support: MessageSquare,
  appointment: CalendarDays,
  news: Newspaper,
  product: Package,
  chart: BarChart3,
}

/** Resolve a chave; cai num ícone neutro se a chave for desconhecida. */
export function iconFor(key: string): LucideIcon {
  return ICONS[key as IconKey] ?? Circle
}

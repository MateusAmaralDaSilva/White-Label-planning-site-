import { moduleRegistry } from '@/modules/registry'

// Destaques derivam do registry (nome/ícone = fonte de verdade); só a cor é
// presentacional e fica neste mapa local.
const HIGHLIGHT_IDS = ['products', 'calendar', 'customers', 'reports'] as const

const HIGHLIGHT_CLASS: Record<(typeof HIGHLIGHT_IDS)[number], string> = {
  products: 'text-accent',
  calendar: 'text-info',
  customers: 'text-success',
  reports: 'text-warning',
}

export const HIGHLIGHTS = HIGHLIGHT_IDS.map((id) => {
  const mod = moduleRegistry.find((m) => m.id === id)!
  return { name: mod.name, icon: mod.icon, iconClass: HIGHLIGHT_CLASS[id] }
})

/** Todos os módulos (menos a Home) viram cards de "recursos" na apresentação. */
export const FEATURES = moduleRegistry.filter((m) => m.id !== 'home')

// ── Primitivos de apresentação (compartilhados por vários contratos) ──────────

/** Tom semântico (espelha components/ui/tones.ts do frontend). */
export type Tone = 'accent' | 'success' | 'danger' | 'warning' | 'info' | 'neutral'

/** Chave do ícone; o frontend mapeia para um ícone do lucide-react (lib/icons.ts). */
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

/**
 * Como o front deve formatar o valor principal de um KPI. O backend manda o
 * NÚMERO cru + este discriminador; a formatação (moeda com centavos, %, etc.)
 * mora só no front (lib/format.ts).
 */
export type KpiFormat = 'currency' | 'percent' | 'number'

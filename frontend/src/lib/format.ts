import type { KpiFormat } from '@contracts'

/**
 * Formatadores de exibição do app (puros, sem estado). Camada ÚNICA de
 * formatação: o back manda número cru, aqui viram string.
 *
 * `formatBRL`     → valor cheio, com centavos: R$ 1.234,56.
 * `compactBRL`    → compacto para eixos/rótulos de gráfico: R$ 1,5 mil · R$ 3 mi.
 * `formatKpiValue`→ valor de KPI conforme o discriminador `format` do contrato.
 * `formatDelta`   → variação % de KPI (+12,4% / —).
 */
const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

/** Valor cheio em BRL, com centavos (ex.: R$ 1.234,56). */
export const formatBRL = (value: number): string => brl.format(value)

/**
 * Compacto para eixos/rótulos de gráfico, onde o espaço é curto. Acima de 10 mil
 * usa 0 casas decimais (para não estourar a coluna do eixo Y); entre 1 e 10 mil,
 * 1 casa. Ex.: R$ 1,5 mil · R$ 20 mil · R$ 3 mi.
 */
export const compactBRL = (n: number): string => {
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return `R$ ${(n / 1_000_000).toFixed(1).replace('.', ',')} mi`
  if (abs >= 1_000) return `R$ ${(n / 1_000).toFixed(abs >= 10_000 ? 0 : 1).replace('.', ',')} mil`
  return `R$ ${Math.round(n)}`
}

/** Formata o valor principal de um KPI conforme o `format` que o back envia. */
export function formatKpiValue(value: number, format: KpiFormat): string {
  if (format === 'currency') return formatBRL(value)
  if (format === 'percent') return `${value.toFixed(1).replace('.', ',')}%`
  return String(value) // 'number' (ex.: contagem)
}

/** Variação % de um KPI (ex.: 12.4 → "+12,4%"); null → "—". */
export function formatDelta(delta: number | null): string {
  if (delta === null) return '—'
  const s = delta.toFixed(1).replace('.', ',') + '%'
  return delta > 0 ? `+${s}` : s
}

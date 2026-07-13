import type { Tone } from '@/components/ui'

export interface BarSeries {
  name: string
  tone: Tone
}

export interface BarTooltipRow {
  label: string
  value: string
  tone?: Tone
}

export interface BarDatum {
  /** Rótulo do eixo X (ex.: 'Jul'). */
  label: string
  /** Um valor por série (mesma ordem de `series`). */
  values: number[]
  /** Linhas do tooltip; se ausente, é gerado das séries + formatValue. */
  tooltip?: BarTooltipRow[]
}

export interface BarChartProps {
  data: BarDatum[]
  series: BarSeries[]
  /** Formata o valor exibido (rótulos, tooltip). Ex.: formatBRL. */
  formatValue: (n: number) => string
  /** Formata o rótulo do eixo Y (default: compacto — ex.: "R$ 1,2 mil"). */
  formatAxis?: (n: number) => string
  /** Altura da área de plotagem em px (default 168). */
  height?: number
  /** Cor de barras negativas (default 'danger'). */
  negativeTone?: Tone
  /** Força rótulo em cada barra (default: automático — série única e ≤ 12 barras). */
  showValues?: boolean
}

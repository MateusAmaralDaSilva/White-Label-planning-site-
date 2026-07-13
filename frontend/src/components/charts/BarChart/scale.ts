import type { BarDatum } from './types'

/** Arredonda um número para um "teto bonito" (1/2/5 × 10ⁿ) para o topo do eixo. */
export function niceCeil(n: number): number {
  if (n <= 0) return 0
  const pow = Math.pow(10, Math.floor(Math.log10(n)))
  const f = n / pow
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10
  return nice * pow
}

/** Nº de intervalos da grade (5 linhas contando as pontas). */
const TICKS = 4

export interface BarScale {
  /** Limite inferior do eixo (negativo quando há prejuízo, senão 0). */
  bottom: number
  /** top − bottom (nunca 0). */
  span: number
  /** Altura da área de plotagem em px. */
  height: number
  /** Posição (px a partir da base) da linha do zero. */
  zeroFromBottom: number
  /** Valores das linhas de grade, de baixo para cima. */
  ticks: number[]
  /** Há ao menos um valor negativo (liga a legenda "Prejuízo"). */
  hasNegative: boolean
  /** Posição vertical (px a partir da base) de um valor no eixo. */
  posOf: (v: number) => number
  /** Altura crua (px) proporcional a |valor| — o componente aplica o mínimo. */
  magnitude: (v: number) => number
}

/**
 * Calcula a escala do eixo Y a partir dos dados: limites "bonitos" (`niceCeil`),
 * linhas de grade e helpers de geometria. Toda a matemática do gráfico mora aqui
 * (função pura, sem React) — o componente só posiciona os elementos.
 */
export function buildScale(data: BarDatum[], height: number): BarScale {
  const flat = data.flatMap((d) => d.values)
  const rawMax = Math.max(0, ...flat)
  const rawMin = Math.min(0, ...flat)
  const top = niceCeil(rawMax) || (rawMin < 0 ? niceCeil(-rawMin) : 1)
  const bottom = rawMin < 0 ? -niceCeil(-rawMin) : 0
  const span = top - bottom || 1
  return {
    bottom,
    span,
    height,
    zeroFromBottom: ((0 - bottom) / span) * height,
    ticks: Array.from({ length: TICKS + 1 }, (_, i) => bottom + (span * i) / TICKS),
    hasNegative: rawMin < 0,
    posOf: (v) => ((v - bottom) / span) * height,
    magnitude: (v) => (Math.abs(v) / span) * height,
  }
}

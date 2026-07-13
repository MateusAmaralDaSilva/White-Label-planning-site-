import { useState } from 'react'
import { toneSolid } from '@/components/ui'
import { cn } from '@/lib/cn'
import { compactBRL } from '@/lib/format'
import type { BarChartProps, BarSeries } from './types'
import { buildScale } from './scale'
import { ChartLegend } from './Legend'
import { BarTooltip } from './Tooltip'

export type { BarSeries, BarTooltipRow, BarDatum } from './types'

/**
 * Gráfico de barras EXPLICATIVO (o antigo mostrava só a altura da barra, sem
 * valor nem escala). O que ele resolve:
 *   • eixo Y com linhas de grade rotuladas → dá pra ler a proporção entre barras;
 *   • rótulo do valor em cada barra (quando cabe) → mostra o número, não só a cor;
 *   • tooltip no hover com o detalhamento do período (receita, custo, lucro…);
 *   • 1 ou N séries agrupadas, com legenda; suporta valores negativos (prejuízo)
 *     desenhando a barra abaixo da linha do zero.
 *
 * Feito em HTML/CSS (sem lib de gráfico, como o resto do projeto) usando os tokens
 * do design system: as cores vêm dos `Tone` (accent/success/danger…), o texto usa
 * sempre tokens de tinta (ink), nunca a cor da série — assim a identidade fica na
 * barra e o número permanece legível em qualquer tema (claro/escuro).
 *
 * A matemática do eixo mora em `scale.ts`; a legenda e o tooltip em componentes
 * irmãos — este arquivo só posiciona os elementos.
 */
export function BarChart({
  data,
  series,
  formatValue,
  formatAxis = compactBRL,
  height = 168,
  negativeTone = 'danger',
  showValues,
}: BarChartProps) {
  const [hover, setHover] = useState<number | null>(null)

  if (data.length === 0) {
    return <p className="py-8 text-center text-xs text-ink-faint">Sem dados no período.</p>
  }

  const { zeroFromBottom, ticks, hasNegative, posOf, magnitude } = buildScale(data, height)

  // Rótulo por barra: automático (série única, poucas barras) ou forçado.
  const autoLabels = series.length === 1 && data.length <= 12
  const labelBars = showValues ?? autoLabels

  // Legenda: as séries + o "Prejuízo" (vermelho) quando há barra negativa, já que
  // valores negativos são desenhados na `negativeTone`.
  const legend: BarSeries[] = [
    ...series,
    ...(hasNegative ? [{ name: 'Prejuízo', tone: negativeTone }] : []),
  ]

  return (
    <div>
      {/* pt-2.5 reserva o meio-rótulo do topo do eixo Y (que sobe com o
          -translate-y-1/2) para ele não encavalar no topo do card. */}
      <div className="flex gap-2 pt-2.5">
        {/* Eixo Y: rótulos dos valores das linhas de grade. */}
        <div
          className="relative w-16 shrink-0 pr-1 text-[10px] tabular-nums text-ink-faint"
          style={{ height }}
          aria-hidden
        >
          {ticks.map((t, i) => (
            <span
              key={i}
              className="absolute right-0 -translate-y-1/2 whitespace-nowrap"
              style={{ bottom: posOf(t) }}
            >
              {formatAxis(t)}
            </span>
          ))}
        </div>

        {/* Área de plotagem. */}
        <div className="relative flex-1">
          {/* Grade horizontal. */}
          <div className="pointer-events-none absolute inset-0" style={{ height }}>
            {ticks.map((t, i) => (
              <div
                key={i}
                className={cn(
                  'absolute inset-x-0 border-t',
                  t === 0 ? 'border-ink-faint/40' : 'border-border/60',
                )}
                style={{ bottom: posOf(t) }}
              />
            ))}
          </div>

          {/* Colunas. */}
          <div className="relative flex items-end" style={{ height }}>
            {data.map((d, i) => {
              const active = hover === i
              return (
                <div
                  key={`${d.label}-${i}`}
                  className="relative flex h-full flex-1 items-end justify-center gap-[3px] px-[3px]"
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                >
                  {d.values.map((v, si) => {
                    const tone = v < 0 ? negativeTone : series[si].tone
                    const mag = magnitude(v)
                    return (
                      <div
                        key={si}
                        className="relative flex-1"
                        style={{ maxWidth: series.length === 1 ? 48 : undefined }}
                      >
                        {/* Rótulo do valor acima da barra (série única / forçado). */}
                        {labelBars && si === 0 && (
                          <span
                            className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-medium tabular-nums text-ink-muted"
                            style={
                              v >= 0
                                ? { bottom: zeroFromBottom + mag + 2 }
                                : { bottom: zeroFromBottom - mag - 14 }
                            }
                          >
                            {formatValue(v)}
                          </span>
                        )}
                        <div
                          className={cn(
                            'absolute w-full rounded-[3px] transition-opacity',
                            toneSolid[tone],
                            hover !== null && !active && 'opacity-40',
                          )}
                          style={{
                            height: Math.max(2, mag),
                            bottom: v >= 0 ? zeroFromBottom : zeroFromBottom - Math.max(2, mag),
                          }}
                        />
                      </div>
                    )
                  })}

                  {active && <BarTooltip datum={d} series={series} formatValue={formatValue} />}
                </div>
              )
            })}
          </div>

          {/* Rótulos do eixo X. */}
          <div className="mt-1.5 flex">
            {data.map((d, i) => (
              <span
                key={`${d.label}-x-${i}`}
                className={cn(
                  'flex-1 text-center text-[10px] font-medium',
                  hover === i ? 'text-ink' : 'text-ink-faint',
                )}
              >
                {d.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <ChartLegend items={legend} />
    </div>
  )
}

/** Semantic tones shared by Badge, StatCard and any tinted element. */
export type Tone = 'accent' | 'success' | 'danger' | 'warning' | 'info' | 'neutral'

/** Tinted background + matching foreground, e.g. for badges and icon chips. */
export const toneTint: Record<Tone, string> = {
  accent: 'bg-accent/10 text-accent',
  success: 'bg-success/12 text-success',
  danger: 'bg-danger/12 text-danger',
  warning: 'bg-warning/12 text-warning',
  info: 'bg-info/12 text-info',
  neutral: 'bg-ink-muted/10 text-ink-muted',
}

/**
 * Solid background per tone (e.g. status dots). Full literal strings so
 * Tailwind's JIT scanner picks them up — never build these dynamically.
 */
export const toneSolid: Record<Tone, string> = {
  accent: 'bg-accent',
  success: 'bg-success',
  danger: 'bg-danger',
  warning: 'bg-warning',
  info: 'bg-info',
  neutral: 'bg-ink-muted',
}

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

/** 'YYYY-MM' → 'jul/25'. */
export const fmtMonth = (ym: string) => `${MESES[Number(ym.slice(5, 7)) - 1]}/${ym.slice(2, 4)}`

/** Percentual pt-BR (ex.: 12.3 → "12,3%"). */
export const pctFmt = (n: number) => `${n.toFixed(1).replace('.', ',')}%`

/** Últimos N meses da série no gráfico (mostra o recente, sem navegação). */
export const CHART_MONTHS = 12

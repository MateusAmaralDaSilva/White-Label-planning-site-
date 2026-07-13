import type { MonthResult } from '@contracts'

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

/** 'YYYY-MM' → 'jul/25'. */
export const fmtMonth = (ym: string) => `${MESES[Number(ym.slice(5, 7)) - 1]}/${ym.slice(2, 4)}`

/** 'YYYY-MM-DD' → 'dd/mm/aa'. */
export const fmtDate = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(2, 4)}`

/** Percentual pt-BR (ex.: 12.3 → "12,3%"). */
export const pctFmt = (n: number) => `${n.toFixed(1).replace('.', ',')}%`

/** Margem % de um mês (lucro / receita). */
export const margin = (m: MonthResult) => (m.revenue > 0 ? (m.profit / m.revenue) * 100 : 0)

/** Quantos meses o gráfico mostra por vez (janela de navegação). */
export const WINDOW = 6

/** Gera e baixa um CSV do resultado mensal (separador ';' + decimais com vírgula = Excel pt-BR). */
export function exportCsv(months: MonthResult[]) {
  const num = (n: number) => n.toFixed(2).replace('.', ',')
  const rows = [
    ['Mês', 'Receita', 'CMV', 'Gastos', 'Lucro', 'Margem %'],
    ...months.map((m) => [m.ym, num(m.revenue), num(m.cogs), num(m.expenses), num(m.profit), num(margin(m))]),
  ]
  const csv = '﻿' + rows.map((r) => r.join(';')).join('\r\n') // BOM p/ acentos no Excel
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'relatorio-mensal.csv'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

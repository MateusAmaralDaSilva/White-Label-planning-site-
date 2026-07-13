import { Card, CardHeader, CardBody, type Tone } from '@/components/ui'
import { BarChart, type BarDatum } from '@/components/charts'
import { compactBRL, formatBRL } from '@/lib/format'
import type { PlatformMonth } from '@contracts'
import { CHART_MONTHS } from './utils'

/** Receita × Lucro por mês da plataforma (últimos 12 meses do ledger). */
export function RevenueChart({ months }: { months: PlatformMonth[] }) {
  const visible = months.slice(-CHART_MONTHS)
  const data: BarDatum[] = visible.map((m) => ({
    label: m.label,
    values: [m.revenue, m.profit],
    tooltip: [
      { label: 'Receita', value: formatBRL(m.revenue), tone: 'accent' as Tone },
      { label: 'Custos', value: formatBRL(m.costs), tone: 'neutral' as Tone },
      { label: 'Lucro', value: formatBRL(m.profit), tone: (m.profit >= 0 ? 'success' : 'danger') as Tone },
    ],
  }))

  return (
    <Card>
      <CardHeader>Receita × Lucro por mês</CardHeader>
      <CardBody>
        {visible.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-muted">
            Ainda não há cobranças registradas. Ao criar contas ou creditar meses, a receita aparece
            aqui automaticamente.
          </p>
        ) : (
          <BarChart
            data={data}
            series={[
              { name: 'Receita', tone: 'accent' },
              { name: 'Lucro', tone: 'success' },
            ]}
            formatValue={compactBRL}
          />
        )}
      </CardBody>
    </Card>
  )
}

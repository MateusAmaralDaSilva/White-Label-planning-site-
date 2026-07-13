import type { AdminAccount } from '@contracts'

/** Tamanho máximo da logo (client-side); o backend também valida. */
export const LOGO_MAX_BYTES = 500 * 1024

export const PLAN_LABEL: Record<string, string> = {
  mensal: 'Mensal',
  semestral: 'Semestral',
  anual: 'Anual',
}

export function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

/**
 * Ramos já usados pelas contas — viram as sugestões do campo "Ramo" (datalist).
 * A lista de setores nasce dos próprios dados: não há lista fixa em código.
 */
export function distinctIndustries(accounts: AdminAccount[]): string[] {
  const set = new Set<string>()
  for (const a of accounts) if (a.industry) set.add(a.industry)
  return [...set].sort((x, y) => x.localeCompare(y, 'pt-BR'))
}

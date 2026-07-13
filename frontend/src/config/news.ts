import type { Tone } from '@/components/ui'

/**
 * Metadados de apresentação das notícias (rótulo + tom por categoria) e o tipo
 * do item. Os DADOS vêm do backend: GET /api/news — a Home usa useApi<NewsItem[]>.
 */

import type { NewsCategory, NewsItem } from '@contracts'
export type { NewsCategory, NewsItem }

/** Rótulo + tom (cor) de cada categoria, para o Badge. */
export const NEWS_CATEGORY: Record<NewsCategory, { label: string; tone: Tone }> = {
  novidade: { label: 'Novidade', tone: 'accent' },
  atualizacao: { label: 'Atualização', tone: 'info' },
  aviso: { label: 'Aviso', tone: 'warning' },
  manutencao: { label: 'Manutenção', tone: 'danger' },
}

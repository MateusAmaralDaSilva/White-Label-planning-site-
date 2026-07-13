// ── News ──────────────────────────────────────────────────────────────────────

export type NewsCategory = 'novidade' | 'atualizacao' | 'aviso' | 'manutencao'

export interface NewsItem {
  id: string
  title: string
  body: string
  date: string
  category: NewsCategory
  pinned?: boolean
}

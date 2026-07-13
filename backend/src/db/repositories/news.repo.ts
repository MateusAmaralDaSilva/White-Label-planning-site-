import { withTenant } from '../tenant-context.js'
import { shortDate } from '../../lib/relative-time.js'
import type { NewsCategory, NewsItem } from '../../types/index.js'

/**
 * Feed de notícias (Home). Fixadas primeiro, depois pela ordem editorial
 * (`sort_order`). A data de exibição é derivada de `created_at` na leitura (não
 * fica mais como rótulo estático — ver 0015).
 */
export async function getNews(tenantId: string): Promise<NewsItem[]> {
  return withTenant(tenantId, async (query) => {
    const rows = await query<{
      id: string
      title: string
      body: string
      category: NewsCategory
      pinned: boolean
      created_at: Date
    }>(
      `select id, title, body, category, pinned, created_at
         from app.news
        where tenant_id = $1
        order by pinned desc, sort_order`,
      [tenantId],
    )
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      body: r.body,
      category: r.category,
      pinned: r.pinned,
      date: shortDate(r.created_at),
    }))
  })
}

import { Newspaper } from 'lucide-react'
import { Async, Badge } from '@/components/ui'
import { useApi } from '@/hooks/useApi'
import { NEWS_CATEGORY, type NewsItem } from '@/config/news'

/** Seção "Notícias" da Home: feed de novidades (GET /api/news). */
export function NewsSection() {
  const newsState = useApi<NewsItem[]>('/api/news')

  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <Newspaper size={14} className="text-ink-faint" />
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
          Notícias
        </h2>
      </div>

      <Async state={newsState}>
        {(news) => (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {news.map((item) => {
              const cat = NEWS_CATEGORY[item.category]
              return (
                <article
                  key={item.id}
                  className="flex flex-col rounded-xl border border-border bg-surface p-4"
                >
                  <div className="flex items-center gap-2">
                    <Badge tone={cat.tone}>{cat.label}</Badge>
                    <span className="text-[11px] text-ink-faint">{item.date}</span>
                  </div>
                  <h3 className="mt-2 text-sm font-semibold text-ink">{item.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-ink-muted">{item.body}</p>
                </article>
              )
            })}
          </div>
        )}
      </Async>
    </section>
  )
}

import { PageHeader } from '@/components/ui'
import { useBrandStore } from '@/store/brandStore'
import { ToolsSection } from './ToolsSection'
import { NewsSection } from './NewsSection'

/** Home (casca): boas-vindas + grade de ferramentas + feed de notícias. */
export default function HomeModule() {
  const brand = useBrandStore((s) => s.brand)

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Bem-vindo à ${brand.name}`}
        subtitle="Acesse suas ferramentas e acompanhe as novidades"
      />
      <ToolsSection />
      <NewsSection />
    </div>
  )
}

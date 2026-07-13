import { Async, PageHeader } from '@/components/ui'
import { useApi } from '@/hooks/useApi'
import type { ActivityEvent } from '@/config/activity'
import { ActivityView } from './ActivityView'

/** Aba Atividades (casca): carrega o feed e delega filtros/lista à ActivityView. */
export default function ActivityModule() {
  const state = useApi<ActivityEvent[]>('/api/activity')
  return (
    <div className="space-y-6">
      <PageHeader
        title="Atividades"
        subtitle="Registro de vendas, agendamentos e eventos do negócio"
      />
      <Async state={state}>{(events) => <ActivityView events={events} />}</Async>
    </div>
  )
}

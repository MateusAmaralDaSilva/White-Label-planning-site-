import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Async, Badge, Button, Card, ListRow, PageHeader, StatusDot } from '@/components/ui'
import { useApi } from '@/hooks/useApi'
import type { Ticket } from '@contracts'
import { TicketForm } from './TicketForm'

/** Aba Chamados (casca): lista de chamados + modal de abertura/edição. */
export default function SupportModule() {
  // null = fechado · 'new' = criando · Ticket = editando aquele registro.
  const [editing, setEditing] = useState<Ticket | 'new' | null>(null)
  const state = useApi<Ticket[]>('/api/support/tickets')

  return (
    <Async state={state}>
      {(tickets) => {
        const open = tickets.filter((t) => t.status === 'Aberto').length
        const inProgress = tickets.filter((t) => t.status === 'Em andamento').length

        return (
          <div className="space-y-6">
            <PageHeader
              title="Chamados"
              subtitle="Chamados e atendimento"
              action={
                <div className="flex items-center gap-2">
                  {open > 0 && <Badge tone="danger">{open} Abertos</Badge>}
                  {inProgress > 0 && <Badge tone="warning">{inProgress} Em andamento</Badge>}
                  <Button onClick={() => setEditing('new')}>
                    <Plus size={16} /> Novo Chamado
                  </Button>
                </div>
              }
            />

            <Card>
              {tickets.map((ticket) => (
                <ListRow
                  key={ticket.id}
                  onClick={() => setEditing(ticket)}
                  leading={<StatusDot tone={ticket.tone} />}
                  trailing={<Badge tone={ticket.tone}>{ticket.status}</Badge>}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-ink-faint">{ticket.id}</span>
                    <span className="text-sm font-medium text-ink">{ticket.subject}</span>
                  </div>
                  <div className="mt-0.5 text-xs text-ink-faint">
                    {ticket.customer} · {ticket.time}
                  </div>
                </ListRow>
              ))}
            </Card>

            {editing !== null && (
              <TicketForm
                initial={editing === 'new' ? undefined : editing}
                onClose={() => setEditing(null)}
                onSaved={() => {
                  setEditing(null)
                  state.reload()
                }}
              />
            )}
          </div>
        )
      }}
    </Async>
  )
}

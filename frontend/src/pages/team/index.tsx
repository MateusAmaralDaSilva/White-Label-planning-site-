import { useState } from 'react'
import { Plus, ShieldCheck } from 'lucide-react'
import { Async, Badge, Button, Card, PageHeader } from '@/components/ui'
import { useApi } from '@/hooks/useApi'
import { useAuthStore } from '@/store/authStore'
import type { TeamData } from '@contracts'
import { DeleteMember } from './DeleteMember'
import { AddMemberForm } from './AddMemberForm'

/** Aba Equipe (casca): gestão dos logins da conta (dono do tenant). */
export default function TeamPage() {
  const [adding, setAdding] = useState(false)
  const state = useApi<TeamData>('/api/team')
  const myId = useAuthStore((s) => s.user?.id)

  return (
    <Async state={state}>
      {({ maxUsers, members }) => {
        const atLimit = maxUsers !== null && members.length >= maxUsers
        const usage =
          maxUsers === null
            ? `${members.length} ${members.length === 1 ? 'login' : 'logins'} · sem limite`
            : `${members.length} de ${maxUsers} ${maxUsers === 1 ? 'login' : 'logins'}`

        return (
          <div className="space-y-6">
            <PageHeader
              title="Equipe"
              subtitle={`Gerencie os logins da sua empresa · ${usage}`}
              action={
                <Button
                  onClick={() => setAdding(true)}
                  disabled={atLimit}
                  title={atLimit ? 'Limite de logins atingido' : undefined}
                >
                  <Plus size={16} /> Adicionar login
                </Button>
              }
            />

            {atLimit && (
              <div className="rounded-xl border border-warning/20 bg-warning/10 px-4 py-3 text-sm text-warning">
                Você atingiu o limite de logins da sua conta. Fale com o suporte para ampliar.
              </div>
            )}

            <Card>
              <div className="divide-y divide-border">
                {members.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/10 text-sm font-bold text-accent">
                      {m.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium text-ink">{m.name}</span>
                        {m.isTenantAdmin && (
                          <Badge tone="accent">
                            <ShieldCheck size={10} className="mr-0.5 inline" /> Admin
                          </Badge>
                        )}
                        {m.id === myId && <span className="text-[11px] text-ink-faint">(você)</span>}
                      </div>
                      <div className="truncate text-xs text-ink-faint">{m.email}</div>
                    </div>
                    {m.id !== myId && <DeleteMember member={m} onDeleted={state.reload} />}
                  </div>
                ))}
              </div>
            </Card>

            {adding && (
              <AddMemberForm
                onClose={() => setAdding(false)}
                onSaved={() => {
                  setAdding(false)
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

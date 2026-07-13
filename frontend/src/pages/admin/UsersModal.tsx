import { useState } from 'react'
import { UserPlus } from 'lucide-react'
import { Async, Badge, Button, Modal } from '@/components/ui'
import { useApi } from '@/hooks/useApi'
import { api } from '@/lib/api'
import type { AdminAccount, AdminUser } from '@contracts'
import { InlineAddUser } from './InlineAddUser'

/** Modal dos logins de uma conta: lista + promover/rebaixar admin + adicionar inline. */
export function UsersModal({ account, onClose }: { account: AdminAccount; onClose: () => void }) {
  const state = useApi<AdminUser[]>(`/api/admin/accounts/${account.tenantId}/users`)
  const [adding, setAdding] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  async function toggleAdmin(u: AdminUser) {
    setBusyId(u.id)
    try {
      await api.put(`/api/admin/accounts/${account.tenantId}/users/${u.id}`, {
        isTenantAdmin: !u.isTenantAdmin,
      })
      state.reload()
    } catch {
      /* mantém como estava se falhar */
    } finally {
      setBusyId(null)
    }
  }

  return (
    <Modal title="Logins da conta" subtitle={account.brandName} onClose={onClose}>
      <Async state={state}>
        {(users) => (
          <div className="space-y-3">
            <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
              {users.length === 0 ? (
                <p className="px-3 py-6 text-center text-xs text-ink-faint">
                  Nenhum login nesta conta.
                </p>
              ) : (
                users.map((u) => (
                  <div key={u.id} className="flex items-center gap-3 px-3 py-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-bold text-accent">
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium text-ink">{u.name}</span>
                        {u.isTenantAdmin && <Badge tone="accent">Admin</Badge>}
                      </div>
                      <div className="truncate text-xs text-ink-faint">{u.email}</div>
                    </div>
                    <button
                      onClick={() => toggleAdmin(u)}
                      disabled={busyId === u.id}
                      className="shrink-0 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink disabled:opacity-50"
                    >
                      {u.isTenantAdmin ? 'Remover admin' : 'Tornar admin'}
                    </button>
                  </div>
                ))
              )}
            </div>

            {adding ? (
              <InlineAddUser
                account={account}
                onCancel={() => setAdding(false)}
                onSaved={() => {
                  setAdding(false)
                  state.reload()
                }}
              />
            ) : (
              <Button variant="secondary" onClick={() => setAdding(true)} className="w-full">
                <UserPlus size={14} /> Adicionar login
              </Button>
            )}
          </div>
        )}
      </Async>
    </Modal>
  )
}

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Async, Button, Card } from '@/components/ui'
import { useApi } from '@/hooks/useApi'
import type { AdminAccount } from '@contracts'
import { distinctIndustries } from './utils'
import { AccountCard } from './AccountCard'
import { CreateAccountForm } from './CreateAccountForm'
import { EditAccountForm } from './EditAccountForm'
import { CreditForm } from './CreditForm'
import { UsersModal } from './UsersModal'

/** Aba "Contas": provisionamento e assinaturas — lista de contas + modais de ação. */
export function AccountsPanel() {
  const [creating, setCreating] = useState(false)
  // Conta selecionada para ação: editar marca, creditar meses ou adicionar login.
  const [editingAccount, setEditingAccount] = useState<AdminAccount | null>(null)
  const [crediting, setCrediting] = useState<AdminAccount | null>(null)
  const [managingUsers, setManagingUsers] = useState<AdminAccount | null>(null)
  const state = useApi<AdminAccount[]>('/api/admin/accounts')

  return (
    <Async state={state}>
      {(accounts) => (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-ink-muted">
              {accounts.length} {accounts.length === 1 ? 'conta' : 'contas'} na plataforma
            </span>
            <Button onClick={() => setCreating(true)}>
              <Plus size={16} /> Nova conta
            </Button>
          </div>

          {accounts.length === 0 ? (
            <Card>
              <div className="px-4 py-12 text-center text-sm text-ink-muted">
                Nenhuma conta ainda.{' '}
                <button
                  onClick={() => setCreating(true)}
                  className="font-medium text-accent hover:text-accent-hover"
                >
                  Criar a primeira
                </button>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {accounts.map((acc) => (
                <AccountCard
                  key={acc.tenantId}
                  account={acc}
                  onEdit={() => setEditingAccount(acc)}
                  onCredit={() => setCrediting(acc)}
                  onManageUsers={() => setManagingUsers(acc)}
                />
              ))}
            </div>
          )}

          {creating && (
            <CreateAccountForm
              industries={distinctIndustries(accounts)}
              onClose={() => setCreating(false)}
              onSaved={() => {
                setCreating(false)
                state.reload()
              }}
            />
          )}
          {editingAccount && (
            <EditAccountForm
              account={editingAccount}
              industries={distinctIndustries(accounts)}
              onClose={() => setEditingAccount(null)}
              onSaved={() => {
                setEditingAccount(null)
                state.reload()
              }}
            />
          )}
          {crediting && (
            <CreditForm
              account={crediting}
              onClose={() => setCrediting(null)}
              onSaved={() => {
                setCrediting(null)
                state.reload()
              }}
            />
          )}
          {managingUsers && <UsersModal account={managingUsers} onClose={() => setManagingUsers(null)} />}
        </div>
      )}
    </Async>
  )
}

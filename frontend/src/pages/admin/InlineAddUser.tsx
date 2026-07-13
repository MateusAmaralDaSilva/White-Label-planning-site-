import { useState, type FormEvent } from 'react'
import { Button, Field, PasswordInput, TextField } from '@/components/ui'
import { api } from '@/lib/api'
import { useResourceForm } from '@/hooks/useResourceForm'
import type { AdminAccount } from '@contracts'

/** Formulário inline de novo login (dentro do modal de logins da conta). */
export function InlineAddUser({
  account,
  onCancel,
  onSaved,
}: {
  account: AdminAccount
  onCancel: () => void
  onSaved: () => void
}) {
  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [password, setPassword] = useState('')
  const { busy, error, run } = useResourceForm()

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    run(async () => {
      await api.post(`/api/admin/accounts/${account.tenantId}/users`, {
        userName: userName.trim(),
        userEmail: userEmail.trim(),
        password,
      })
      onSaved()
    }, 'Não foi possível adicionar o login.')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-border p-3">
      <TextField label="Nome do usuário" id="add-uname" value={userName} onChange={setUserName} placeholder="Nome do usuário" required autoFocus />
      <TextField label="E-mail de acesso" id="add-uemail" type="email" value={userEmail} onChange={setUserEmail} placeholder="usuario@empresa.com" required />
      <Field label="Senha (mín. 8 caracteres)" htmlFor="add-upass">
        <PasswordInput
          id="add-upass"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
        />
      </Field>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={busy}>
          Cancelar
        </Button>
        <Button type="submit" loading={busy}>
          Adicionar
        </Button>
      </div>
    </form>
  )
}

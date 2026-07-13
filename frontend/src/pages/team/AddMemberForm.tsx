import { useState, type FormEvent } from 'react'
import { Users } from 'lucide-react'
import { Button, Field, Modal, PasswordInput, TextField } from '@/components/ui'
import { api } from '@/lib/api'
import { useResourceForm } from '@/hooks/useResourceForm'

/** Modal de adicionar um login à conta (nome + e-mail + senha). */
export function AddMemberForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { busy, error, run } = useResourceForm()

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    run(async () => {
      await api.post('/api/team/users', { name: name.trim(), email: email.trim(), password })
      onSaved()
    }, 'Não foi possível adicionar o login.')
  }

  return (
    <Modal title="Adicionar login" subtitle="Novo usuário para a sua empresa" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2.5 text-xs text-ink-muted">
          <Users size={14} className="shrink-0 text-ink-faint" />
          O novo usuário entra com o e-mail e a senha que você definir aqui.
        </div>

        <TextField label="Nome" id="team-name" value={name} onChange={setName} placeholder="Nome do funcionário" required autoFocus />
        <TextField label="E-mail de acesso" id="team-email" type="email" value={email} onChange={setEmail} placeholder="funcionario@empresa.com" required />
        <Field label="Senha (mín. 8 caracteres)" htmlFor="team-pass">
          <PasswordInput
            id="team-pass"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
        </Field>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button type="submit" loading={busy}>
            Adicionar login
          </Button>
        </div>
      </form>
    </Modal>
  )
}

import { useState, type FormEvent } from 'react'
import { Button, Field, Modal, NumberField, PasswordInput, SelectField, TextField } from '@/components/ui'
import { api } from '@/lib/api'
import { slugify } from '@/lib/slugify'
import { useResourceForm } from '@/hooks/useResourceForm'
import { PLANS } from '@/config/plans'
import { themeRegistry } from '@/config/themes'
import { BrandFields, type BrandFieldsValue } from './BrandFields'

/** Nova conta: tenant + marca + plano inicial + primeiro login. */
export function CreateAccountForm({
  industries,
  onClose,
  onSaved,
}: {
  industries: string[]
  onClose: () => void
  onSaved: () => void
}) {
  const [tenantId, setTenantId] = useState('')
  const [plan, setPlan] = useState<string>(PLANS[0].id)
  const [amount, setAmount] = useState('')
  const [brand, setBrand] = useState<BrandFieldsValue>({
    brandMark: '',
    brandName: '',
    themeId: themeRegistry[0]?.id ?? 'light',
    industry: '',
    maxUsers: '',
    phone: '',
    cnpj: '',
    logo: null,
  })
  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [password, setPassword] = useState('')
  const { busy, error, run } = useResourceForm()
  const patch = (p: Partial<BrandFieldsValue>) => setBrand((b) => ({ ...b, ...p }))

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    run(async () => {
      await api.post('/api/admin/accounts', {
        tenantId: tenantId.trim(),
        brandName: brand.brandName.trim(),
        brandMark: brand.brandMark.trim(),
        themeId: brand.themeId,
        logo: brand.logo,
        maxUsers: brand.maxUsers ? Number(brand.maxUsers) : null,
        industry: brand.industry || null,
        phone: brand.phone.trim() || null,
        cnpj: brand.cnpj.trim() || null,
        userName: userName.trim(),
        userEmail: userEmail.trim(),
        password,
        plan,
        amount: amount.trim() === '' ? undefined : Number(amount),
      })
      onSaved()
    }, 'Não foi possível criar a conta.')
  }

  return (
    <Modal
      title="Nova conta"
      subtitle="Cria um workspace novo (marca + módulos padrão) e o primeiro login"
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="Identificador (id)"
            id="acc-tenant"
            value={tenantId}
            onChange={(v) => setTenantId(slugify(v))}
            placeholder="ex: padaria-do-ze"
            required
            autoFocus
          />
          <SelectField label="Plano inicial" id="acc-plan" value={plan} onChange={setPlan}>
            {PLANS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.months} {p.months === 1 ? 'mês' : 'meses'})
              </option>
            ))}
          </SelectField>
          <NumberField
            label="Valor cobrado (R$)"
            id="acc-amount"
            value={amount}
            onChange={setAmount}
            min={0}
            placeholder="vazio = preco padrao"
          />
        </div>

        <BrandFields value={brand} onChange={patch} industries={industries} idPrefix="acc" />

        <div className="border-t border-border pt-4">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
            Primeiro login
          </p>
          <div className="space-y-4">
            <TextField label="Nome do usuário" id="acc-uname" value={userName} onChange={setUserName} placeholder="Nome do responsável" required />
            <TextField label="E-mail de acesso" id="acc-uemail" type="email" value={userEmail} onChange={setUserEmail} placeholder="dono@empresa.com" required />
            <Field label="Senha (mín. 8 caracteres)" htmlFor="acc-upass">
              <PasswordInput
                id="acc-upass"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </Field>
          </div>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button type="submit" loading={busy}>
            Criar conta
          </Button>
        </div>
      </form>
    </Modal>
  )
}

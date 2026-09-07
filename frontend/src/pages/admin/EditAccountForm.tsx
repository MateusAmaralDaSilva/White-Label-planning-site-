import { useState, type FormEvent } from 'react'
import { Button, Modal } from '@/components/ui'
import { api } from '@/lib/api'
import { useResourceForm } from '@/hooks/useResourceForm'
import type { AdminAccount } from '@contracts'
import { BrandFields, type BrandFieldsValue } from './BrandFields'

/** Editar marca de uma conta (nome/sigla/tema/ramo/máx. usuários/logo). */
export function EditAccountForm({
  account,
  industries,
  onClose,
  onSaved,
}: {
  account: AdminAccount
  industries: string[]
  onClose: () => void
  onSaved: () => void
}) {
  const [brand, setBrand] = useState<BrandFieldsValue>({
    brandMark: account.brandMark,
    brandName: account.brandName,
    themeId: account.themeId,
    industry: account.industry ?? '',
    maxUsers: account.maxUsers !== null ? String(account.maxUsers) : '',
    phone: account.phone ?? '',
    cnpj: account.cnpj ?? '',
    logo: account.logo,
  })
  const { busy, error, run } = useResourceForm()
  const patch = (p: Partial<BrandFieldsValue>) => setBrand((b) => ({ ...b, ...p }))

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    run(async () => {
      await api.put(`/api/admin/accounts/${account.tenantId}`, {
        brandName: brand.brandName.trim(),
        brandMark: brand.brandMark.trim(),
        themeId: brand.themeId,
        logo: brand.logo,
        maxUsers: brand.maxUsers ? Number(brand.maxUsers) : null,
        industry: brand.industry || null,
        phone: brand.phone.trim() || null,
        cnpj: brand.cnpj.trim() || null,
      })
      onSaved()
    }, 'Não foi possível salvar a conta.')
  }

  return (
    <Modal title="Editar conta" subtitle={account.tenantId} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <BrandFields value={brand} onChange={patch} industries={industries} idPrefix="edit" />

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button type="submit" loading={busy}>
            Salvar
          </Button>
        </div>
      </form>
    </Modal>
  )
}

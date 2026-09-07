import { NumberField, SelectField, TextField } from '@/components/ui'
import { themeRegistry } from '@/config/themes'
import { LogoField } from './LogoField'

/** Campos de marca compartilhados por criar/editar conta. */
export interface BrandFieldsValue {
  brandMark: string
  brandName: string
  themeId: string
  industry: string
  maxUsers: string
  phone: string
  cnpj: string
  logo: string | null
}

export function BrandFields({
  value,
  onChange,
  industries,
  idPrefix,
}: {
  value: BrandFieldsValue
  onChange: (patch: Partial<BrandFieldsValue>) => void
  industries: string[]
  idPrefix: string
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <TextField
          label="Sigla da marca"
          id={`${idPrefix}-mark`}
          value={value.brandMark}
          onChange={(v) => onChange({ brandMark: v })}
          placeholder="ex: PZ"
          maxLength={4}
          required
        />
        <SelectField
          label="Tema"
          id={`${idPrefix}-theme`}
          value={value.themeId}
          onChange={(v) => onChange({ themeId: v })}
        >
          {themeRegistry.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </SelectField>
      </div>

      <TextField
        label="Nome da marca"
        id={`${idPrefix}-brand`}
        value={value.brandName}
        onChange={(v) => onChange({ brandName: v })}
        placeholder="ex: Padaria do Zé"
        required
      />
      <div className="grid grid-cols-2 gap-3">
        <TextField
          label="Telefone da empresa"
          id={`${idPrefix}-phone`}
          value={value.phone}
          onChange={(v) => onChange({ phone: v })}
          placeholder="(11) 99999-0000"
          type="tel"
        />
        <TextField
          label="CNPJ"
          id={`${idPrefix}-cnpj`}
          value={value.cnpj}
          onChange={(v) => onChange({ cnpj: v })}
          placeholder="00.000.000/0000-00"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <TextField
          label="Ramo (setor)"
          id={`${idPrefix}-industry`}
          value={value.industry}
          onChange={(v) => onChange({ industry: v })}
          placeholder="ex: Varejo, Saúde…"
          maxLength={60}
          suggestions={industries}
        />
        <NumberField
          label="Máx. usuários"
          id={`${idPrefix}-maxusers`}
          value={value.maxUsers}
          onChange={(v) => onChange({ maxUsers: v })}
          min={1}
          step={1}
          placeholder="Vazio = ilimitado"
        />
      </div>

      <LogoField value={value.logo} onChange={(v) => onChange({ logo: v })} />
    </>
  )
}

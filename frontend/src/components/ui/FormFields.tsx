import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Field } from './Field'
import { Input, inputClasses } from './Input'

/**
 * Campos de formulário prontos = `Field` (label) + o controle já ligado. Encurtam
 * os forms dos módulos (de ~8 linhas por campo para ~1) e mantêm o visual uniforme.
 * `onChange` entrega o VALOR (string), não o evento.
 */

interface Base {
  label: string
  id: string
  required?: boolean
}

interface TextFieldProps extends Base {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  autoFocus?: boolean
  /** Tipo do input (ex.: 'date'); default 'text'. */
  type?: string
  maxLength?: number
  /** Controle auxiliar no header do label (ex.: link "esqueci a senha"). */
  action?: ReactNode
  /** Sugestões de autocompletar (vira um <datalist>). */
  suggestions?: string[]
}

export function TextField({
  label,
  id,
  value,
  onChange,
  placeholder,
  required,
  autoFocus,
  type = 'text',
  maxLength,
  action,
  suggestions,
}: TextFieldProps) {
  const listId = suggestions ? `${id}-list` : undefined
  return (
    <Field label={label} htmlFor={id} action={action}>
      <Input
        id={id}
        type={type}
        list={listId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        autoFocus={autoFocus}
        maxLength={maxLength}
      />
      {suggestions && (
        <datalist id={listId}>
          {suggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      )}
    </Field>
  )
}

interface NumberFieldProps extends Base {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  min?: number | string
  step?: number | string
}

export function NumberField({
  label,
  id,
  value,
  onChange,
  placeholder,
  required,
  min = 0,
  step = '0.01',
}: NumberFieldProps) {
  return (
    <Field label={label} htmlFor={id}>
      <Input
        id={id}
        type="number"
        min={min}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
      />
    </Field>
  )
}

interface SelectFieldProps extends Base {
  value: string
  onChange: (value: string) => void
  /** As <option>s do select. */
  children: ReactNode
}

export function SelectField({ label, id, value, onChange, required, children }: SelectFieldProps) {
  return (
    <Field label={label} htmlFor={id}>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className={cn(inputClasses, 'cursor-pointer')}
      >
        {children}
      </select>
    </Field>
  )
}

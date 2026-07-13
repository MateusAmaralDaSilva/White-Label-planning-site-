import { Field } from '@/components/ui'

/** Campo de seleção de cor (input nativo estilizado). Reusado pelos forms de evento e agenda. */
export function ColorField({
  id,
  value,
  onChange,
}: {
  id: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <Field label="Cor" htmlFor={id}>
      <input
        id={id}
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-[42px] w-14 cursor-pointer rounded-lg border border-border bg-surface p-1"
      />
    </Field>
  )
}

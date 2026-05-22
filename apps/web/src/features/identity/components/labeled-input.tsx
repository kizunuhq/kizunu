import { Field, FieldLabel } from '@kizunu/web/components/primitives/field'
import { Input } from '@kizunu/web/components/primitives/input'

interface LabeledInputProps {
  id: string
  label: string
  type: string
  value: string
  autoComplete: string
  onChange: (value: string) => void
}

export function LabeledInput(props: LabeledInputProps) {
  return (
    <Field>
      <FieldLabel htmlFor={props.id}>{props.label}</FieldLabel>
      <Input
        id={props.id}
        type={props.type}
        value={props.value}
        autoComplete={props.autoComplete}
        required
        onChange={(event) => props.onChange(event.target.value)}
      />
    </Field>
  )
}

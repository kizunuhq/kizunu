import type { ChannelCredentialField } from '@kizunu/api-contracts/channel'
import { Field, FieldLabel } from '@kizunu/web/components/primitives/field'
import { Input } from '@kizunu/web/components/primitives/input'

interface CredentialFieldsInputProps {
  fields: ChannelCredentialField[]
  values: Record<string, string>
  onChange: (values: Record<string, string>) => void
}

export function CredentialFieldsInput({ fields, values, onChange }: CredentialFieldsInputProps) {
  return (
    <>
      {fields.map((field) => (
        <Field key={field.key}>
          <FieldLabel htmlFor={`credential-${field.key}`}>{field.label}</FieldLabel>
          <Input
            id={`credential-${field.key}`}
            type={field.type === 'secret' ? 'password' : 'text'}
            autoComplete={field.type === 'secret' ? 'off' : undefined}
            required={field.required}
            value={values[field.key] ?? ''}
            onChange={(event) => onChange({ ...values, [field.key]: event.target.value })}
          />
        </Field>
      ))}
    </>
  )
}

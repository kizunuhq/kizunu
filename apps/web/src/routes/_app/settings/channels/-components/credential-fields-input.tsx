import type { ChannelCredentialField } from '@kizunu/api-contracts/channel'
import { Field, FieldError, FieldLabel } from '@kizunu/web/components/primitives/field'
import { Input } from '@kizunu/web/components/primitives/input'

interface CredentialFieldsInputProps {
  fields: ChannelCredentialField[]
  values: Record<string, unknown>
  onChange: (values: Record<string, unknown>) => void
  errors?: Partial<Record<string, string>>
  disabled?: boolean
}

export function CredentialFieldsInput({
  fields,
  values,
  onChange,
  errors,
  disabled,
}: CredentialFieldsInputProps) {
  return (
    <>
      {fields.map((field) => {
        const raw = values[field.key]
        const display = typeof raw === 'string' ? raw : ''
        const fieldError = errors?.[field.key]
        const inputId = `credential-${field.key}`
        const errorId = `${inputId}-error`
        return (
          <Field key={field.key}>
            <FieldLabel htmlFor={inputId}>{field.label}</FieldLabel>
            <Input
              id={inputId}
              type={field.type === 'secret' ? 'password' : 'text'}
              autoComplete={field.type === 'secret' ? 'off' : undefined}
              aria-invalid={!!fieldError}
              aria-describedby={fieldError ? errorId : undefined}
              disabled={disabled}
              value={display}
              onChange={(event) => onChange({ ...values, [field.key]: event.target.value })}
            />
            {fieldError && <FieldError id={errorId}>{fieldError}</FieldError>}
          </Field>
        )
      })}
    </>
  )
}

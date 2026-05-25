import type { ConnectorCredentialField } from '@kizunu/api-contracts/crm'
import { Field, FieldError, FieldLabel } from '@kizunu/web/components/primitives/field'
import { Input } from '@kizunu/web/components/primitives/input'

interface ConnectorCredentialFieldsInputProps {
  fields: ConnectorCredentialField[]
  values: Record<string, unknown>
  onChange: (values: Record<string, unknown>) => void
  errors?: Partial<Record<string, string>>
  disabled?: boolean
}

export function ConnectorCredentialFieldsInput({
  fields,
  values,
  onChange,
  errors,
  disabled,
}: ConnectorCredentialFieldsInputProps) {
  return (
    <>
      {fields.map((field) => {
        const raw = values[field.key]
        const display = typeof raw === 'string' ? raw : ''
        const fieldError = errors?.[field.key]
        const inputId = `connector-credential-${field.key}`
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

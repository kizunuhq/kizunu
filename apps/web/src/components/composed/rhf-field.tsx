import { Field, FieldError, FieldLabel } from '@kizunu/web/components/primitives/field'
import { Input } from '@kizunu/web/components/primitives/input'
import type { HTMLInputTypeAttribute } from 'react'
import type {
  FieldError as RhfFieldError,
  FieldPath,
  FieldValues,
  UseFormRegister,
} from 'react-hook-form'

interface RhfFieldProps<T extends FieldValues> {
  name: FieldPath<T>
  label: string
  register: UseFormRegister<T>
  error?: RhfFieldError
  id?: string
  type?: HTMLInputTypeAttribute
  placeholder?: string
  autoComplete?: string
  autoFocus?: boolean
  disabled?: boolean
}

export function RhfField<T extends FieldValues>(props: RhfFieldProps<T>) {
  const {
    name,
    label,
    register,
    error,
    id = name,
    type,
    placeholder,
    autoComplete,
    autoFocus,
    disabled,
  } = props
  const errorId = `${id}-error`
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        disabled={disabled}
        {...register(name)}
      />
      {error && <FieldError id={errorId}>{error.message}</FieldError>}
    </Field>
  )
}

import { zodResolver } from '@hookform/resolvers/zod'
import {
  type RequestPasswordReset,
  RequestPasswordResetSchema,
} from '@kizunu/api-contracts/identity'
import { FormError } from '@kizunu/web/components/composed/form-error'
import { Field, FieldError, FieldGroup, FieldLabel } from '@kizunu/web/components/primitives/field'
import { Input } from '@kizunu/web/components/primitives/input'
import { useForm } from 'react-hook-form'

interface ForgotPasswordFormProps {
  formId: string
  isPending: boolean
  error?: string | null
  onSubmit: (data: RequestPasswordReset) => void
}

export function ForgotPasswordForm(props: ForgotPasswordFormProps) {
  const { formId, isPending, error, onSubmit } = props
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RequestPasswordReset>({ resolver: zodResolver(RequestPasswordResetSchema) })

  return (
    <form id={formId} className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
      <FieldGroup>
        {error && <FormError>{error}</FormError>}
        <Field>
          <FieldLabel htmlFor="forgot-email">Email</FieldLabel>
          <Input
            id="forgot-email"
            type="email"
            autoComplete="email"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'forgot-email-error' : undefined}
            disabled={isPending}
            {...register('email')}
          />
          {errors.email && <FieldError id="forgot-email-error">{errors.email.message}</FieldError>}
        </Field>
      </FieldGroup>
    </form>
  )
}

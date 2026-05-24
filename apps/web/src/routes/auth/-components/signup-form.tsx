import { zodResolver } from '@hookform/resolvers/zod'
import { type RegisterRequest, RegisterRequestSchema } from '@kizunu/api-contracts/identity'
import { FormError } from '@kizunu/web/components/composed/form-error'
import { Field, FieldError, FieldGroup, FieldLabel } from '@kizunu/web/components/primitives/field'
import { Input } from '@kizunu/web/components/primitives/input'
import type { LoginErrorCopy } from '@kizunu/web/routes/auth/-utils/login-error-copy'
import { Link } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'

interface SignupFormProps {
  formId: string
  isPending: boolean
  errorCopy?: LoginErrorCopy | null
  onSubmit: (data: RegisterRequest) => void
}

export function SignupForm(props: SignupFormProps) {
  const { formId, isPending, errorCopy, onSubmit } = props
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterRequest>({ resolver: zodResolver(RegisterRequestSchema) })

  return (
    <form id={formId} className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
      <FieldGroup>
        {errorCopy ? <SignupErrorBlock copy={errorCopy} /> : null}
        <Field>
          <FieldLabel htmlFor="signup-name">Name</FieldLabel>
          <Input
            id="signup-name"
            autoComplete="name"
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? 'signup-name-error' : undefined}
            disabled={isPending}
            {...register('name')}
          />
          {errors.name && <FieldError id="signup-name-error">{errors.name.message}</FieldError>}
        </Field>
        <Field>
          <FieldLabel htmlFor="signup-email">Email</FieldLabel>
          <Input
            id="signup-email"
            type="email"
            autoComplete="email"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'signup-email-error' : undefined}
            disabled={isPending}
            {...register('email')}
          />
          {errors.email && <FieldError id="signup-email-error">{errors.email.message}</FieldError>}
        </Field>
        <Field>
          <FieldLabel htmlFor="signup-password">Password</FieldLabel>
          <Input
            id="signup-password"
            type="password"
            autoComplete="new-password"
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? 'signup-password-error' : undefined}
            disabled={isPending}
            {...register('password')}
          />
          {errors.password && (
            <FieldError id="signup-password-error">{errors.password.message}</FieldError>
          )}
        </Field>
      </FieldGroup>
    </form>
  )
}

function SignupErrorBlock({ copy }: { copy: LoginErrorCopy }) {
  return (
    <FormError>
      {copy.message}
      {copy.actionHref && copy.actionLabel ? (
        <>
          {' '}
          <Link
            to={copy.actionHref}
            className="text-destructive hover:text-destructive underline underline-offset-2"
          >
            {copy.actionLabel}
          </Link>
        </>
      ) : null}
    </FormError>
  )
}

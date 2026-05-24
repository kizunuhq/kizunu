import { zodResolver } from '@hookform/resolvers/zod'
import { type LoginRequest, LoginRequestSchema } from '@kizunu/api-contracts/identity'
import { FormError } from '@kizunu/web/components/composed/form-error'
import { Field, FieldError, FieldGroup, FieldLabel } from '@kizunu/web/components/primitives/field'
import { Input } from '@kizunu/web/components/primitives/input'
import type { LoginErrorCopy } from '@kizunu/web/routes/auth/-utils/login-error-copy'
import { Link } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'

interface LoginFormProps {
  formId: string
  isPending: boolean
  errorCopy?: LoginErrorCopy | null
  onSubmit: (data: LoginRequest) => void
}

export function LoginForm(props: LoginFormProps) {
  const { formId, isPending, errorCopy, onSubmit } = props
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginRequest>({ resolver: zodResolver(LoginRequestSchema) })

  return (
    <form id={formId} className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
      <FieldGroup>
        {errorCopy ? <LoginErrorBlock copy={errorCopy} /> : null}
        <Field>
          <FieldLabel htmlFor="login-email">Email</FieldLabel>
          <Input
            id="login-email"
            type="email"
            autoComplete="email"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'login-email-error' : undefined}
            disabled={isPending}
            {...register('email')}
          />
          {errors.email && <FieldError id="login-email-error">{errors.email.message}</FieldError>}
        </Field>
        <Field>
          <FieldLabel htmlFor="login-password">Password</FieldLabel>
          <Input
            id="login-password"
            type="password"
            autoComplete="current-password"
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? 'login-password-error' : undefined}
            disabled={isPending}
            {...register('password')}
          />
          {errors.password && (
            <FieldError id="login-password-error">{errors.password.message}</FieldError>
          )}
        </Field>
      </FieldGroup>
    </form>
  )
}

function LoginErrorBlock({ copy }: { copy: LoginErrorCopy }) {
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

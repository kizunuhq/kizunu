import { zodResolver } from '@hookform/resolvers/zod'
import { type LoginRequest, LoginRequestSchema } from '@kizunu/api-contracts/identity'
import { RhfField } from '@kizunu/web/components/composed/rhf-field'
import { FieldGroup } from '@kizunu/web/components/primitives/field'
import { AuthErrorBlock } from '@kizunu/web/routes/auth/-components/auth-error-block'
import type { LoginErrorCopy } from '@kizunu/web/routes/auth/-utils/login-error-copy'
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
        {errorCopy ? <AuthErrorBlock copy={errorCopy} /> : null}
        <RhfField
          name="email"
          label="Email"
          id="login-email"
          type="email"
          autoComplete="email"
          register={register}
          error={errors.email}
          disabled={isPending}
        />
        <RhfField
          name="password"
          label="Password"
          id="login-password"
          type="password"
          autoComplete="current-password"
          register={register}
          error={errors.password}
          disabled={isPending}
        />
      </FieldGroup>
    </form>
  )
}

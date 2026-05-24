import { zodResolver } from '@hookform/resolvers/zod'
import { type RegisterRequest, RegisterRequestSchema } from '@kizunu/api-contracts/identity'
import { RhfField } from '@kizunu/web/components/composed/rhf-field'
import { FieldGroup } from '@kizunu/web/components/primitives/field'
import { AuthErrorBlock } from '@kizunu/web/routes/auth/-components/auth-error-block'
import type { LoginErrorCopy } from '@kizunu/web/routes/auth/-utils/login-error-copy'
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
        {errorCopy ? <AuthErrorBlock copy={errorCopy} /> : null}
        <RhfField
          name="name"
          label="Name"
          id="signup-name"
          autoComplete="name"
          register={register}
          error={errors.name}
          disabled={isPending}
        />
        <RhfField
          name="email"
          label="Email"
          id="signup-email"
          type="email"
          autoComplete="email"
          register={register}
          error={errors.email}
          disabled={isPending}
        />
        <RhfField
          name="password"
          label="Password"
          id="signup-password"
          type="password"
          autoComplete="new-password"
          register={register}
          error={errors.password}
          disabled={isPending}
        />
      </FieldGroup>
    </form>
  )
}

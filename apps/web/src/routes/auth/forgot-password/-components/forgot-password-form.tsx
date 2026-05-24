import { zodResolver } from '@hookform/resolvers/zod'
import {
  type RequestPasswordReset,
  RequestPasswordResetSchema,
} from '@kizunu/api-contracts/identity'
import { FormError } from '@kizunu/web/components/composed/form-error'
import { RhfField } from '@kizunu/web/components/composed/rhf-field'
import { FieldGroup } from '@kizunu/web/components/primitives/field'
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
        <RhfField
          name="email"
          label="Email"
          id="forgot-email"
          type="email"
          autoComplete="email"
          register={register}
          error={errors.email}
          disabled={isPending}
        />
      </FieldGroup>
    </form>
  )
}

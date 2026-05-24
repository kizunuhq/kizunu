import { zodResolver } from '@hookform/resolvers/zod'
import { ConfirmPasswordResetSchema } from '@kizunu/api-contracts/identity'
import { FormError } from '@kizunu/web/components/composed/form-error'
import { RhfField } from '@kizunu/web/components/composed/rhf-field'
import { FieldGroup } from '@kizunu/web/components/primitives/field'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

export const resetPasswordFormSchema = ConfirmPasswordResetSchema.omit({ token: true })
  .extend({ confirmPassword: z.string() })
  .superRefine(({ password, confirmPassword }, ctx) => {
    if (confirmPassword.length === 0) return
    if (password !== confirmPassword) {
      ctx.addIssue({
        code: 'custom',
        path: ['confirmPassword'],
        message: "Passwords don't match.",
      })
    }
  })

export type ResetPasswordFormValues = z.infer<typeof resetPasswordFormSchema>

interface ResetPasswordFormProps {
  formId: string
  isPending: boolean
  error?: string | null
  onSubmit: (data: ResetPasswordFormValues) => void
}

export function ResetPasswordForm(props: ResetPasswordFormProps) {
  const { formId, isPending, error, onSubmit } = props
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({ resolver: zodResolver(resetPasswordFormSchema) })

  return (
    <form id={formId} className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
      <FieldGroup>
        {error && <FormError>{error}</FormError>}
        <RhfField
          name="password"
          label="New password"
          id="reset-password"
          type="password"
          autoComplete="new-password"
          register={register}
          error={errors.password}
          disabled={isPending}
        />
        <RhfField
          name="confirmPassword"
          label="Confirm password"
          id="reset-confirm-password"
          type="password"
          autoComplete="new-password"
          register={register}
          error={errors.confirmPassword}
          disabled={isPending}
        />
      </FieldGroup>
    </form>
  )
}

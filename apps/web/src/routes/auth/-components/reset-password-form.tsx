import { zodResolver } from '@hookform/resolvers/zod'
import { ConfirmPasswordResetSchema } from '@kizunu/api-contracts/identity'
import { FormError } from '@kizunu/web/components/composed/form-error'
import { Field, FieldError, FieldGroup, FieldLabel } from '@kizunu/web/components/primitives/field'
import { Input } from '@kizunu/web/components/primitives/input'
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
        <Field>
          <FieldLabel htmlFor="reset-password">New password</FieldLabel>
          <Input
            id="reset-password"
            type="password"
            autoComplete="new-password"
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? 'reset-password-error' : undefined}
            disabled={isPending}
            {...register('password')}
          />
          {errors.password && (
            <FieldError id="reset-password-error">{errors.password.message}</FieldError>
          )}
        </Field>
        <Field>
          <FieldLabel htmlFor="reset-confirm-password">Confirm password</FieldLabel>
          <Input
            id="reset-confirm-password"
            type="password"
            autoComplete="new-password"
            aria-invalid={!!errors.confirmPassword}
            aria-describedby={errors.confirmPassword ? 'reset-confirm-password-error' : undefined}
            disabled={isPending}
            {...register('confirmPassword')}
          />
          {errors.confirmPassword && (
            <FieldError id="reset-confirm-password-error">
              {errors.confirmPassword.message}
            </FieldError>
          )}
        </Field>
      </FieldGroup>
    </form>
  )
}

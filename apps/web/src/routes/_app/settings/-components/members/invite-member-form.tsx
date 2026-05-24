import { zodResolver } from '@hookform/resolvers/zod'
import { InviteMemberRequestSchema } from '@kizunu/api-contracts/workspace'
import { FormError } from '@kizunu/web/components/composed/form-error'
import { RhfField } from '@kizunu/web/components/composed/rhf-field'
import { FieldGroup } from '@kizunu/web/components/primitives/field'
import { useForm } from 'react-hook-form'
import type { z } from 'zod'

const inviteMemberFormSchema = InviteMemberRequestSchema.pick({ email: true })

type InviteMemberFormValues = z.infer<typeof inviteMemberFormSchema>

interface InviteMemberFormProps {
  formId: string
  isPending: boolean
  error?: string | null
  onSubmit: (data: InviteMemberFormValues) => void
}

export function InviteMemberForm(props: InviteMemberFormProps) {
  const { formId, isPending, error, onSubmit } = props
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<InviteMemberFormValues>({
    resolver: zodResolver(inviteMemberFormSchema),
  })

  return (
    <form id={formId} className="flex flex-col gap-3" onSubmit={handleSubmit(onSubmit)}>
      <FieldGroup>
        {error && <FormError>{error}</FormError>}
        <RhfField
          name="email"
          label="Email"
          id="invite-email"
          type="email"
          placeholder="teammate@company.com"
          register={register}
          error={errors.email}
          disabled={isPending}
        />
      </FieldGroup>
    </form>
  )
}

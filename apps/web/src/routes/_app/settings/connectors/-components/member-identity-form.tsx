import { zodResolver } from '@hookform/resolvers/zod'
import { useMembers } from '@kizunu/api-client/workspace/use-members'
import {
  type CreateMemberConnectorIdentityRequest,
  CreateMemberConnectorIdentityRequestSchema,
} from '@kizunu/api-contracts/crm'
import { FormError } from '@kizunu/web/components/composed/form-error'
import { LookupSelect } from '@kizunu/web/components/composed/lookup-select'
import { Field, FieldError, FieldLabel } from '@kizunu/web/components/primitives/field'
import { Input } from '@kizunu/web/components/primitives/input'
import { Controller, useForm } from 'react-hook-form'

interface MemberIdentityFormProps {
  formId: string
  workspaceId: string
  isPending: boolean
  error?: string | null
  onSubmit: (values: CreateMemberConnectorIdentityRequest) => void
}

export function MemberIdentityForm(props: MemberIdentityFormProps) {
  const { formId, workspaceId, isPending, error, onSubmit } = props
  const members = useMembers(workspaceId)
  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateMemberConnectorIdentityRequest>({
    resolver: zodResolver(CreateMemberConnectorIdentityRequestSchema),
    defaultValues: { membershipId: '', externalId: '' },
  })

  const memberOptions = (members.data?.members ?? [])
    .filter((member) => member.status === 'active')
    .map((member) => ({
      value: member.membershipId,
      label: `${member.userName} (${member.userEmail})`,
    }))

  return (
    <form id={formId} className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
      {error && <FormError>{error}</FormError>}
      <Controller
        name="membershipId"
        control={control}
        render={({ field, fieldState }) => (
          <Field>
            <FieldLabel>Member</FieldLabel>
            <LookupSelect
              value={field.value ?? ''}
              onChange={field.onChange}
              placeholder="Select an active member"
              options={memberOptions}
              disabled={isPending}
            />
            {fieldState.error && (
              <FieldError id="membershipId-error">{fieldState.error.message}</FieldError>
            )}
          </Field>
        )}
      />
      <Field>
        <FieldLabel htmlFor="externalId">External id (Pipedrive user id)</FieldLabel>
        <Input
          id="externalId"
          aria-invalid={!!errors.externalId}
          aria-describedby={errors.externalId ? 'externalId-error' : undefined}
          disabled={isPending}
          {...register('externalId')}
        />
        {errors.externalId && (
          <FieldError id="externalId-error">{errors.externalId.message}</FieldError>
        )}
      </Field>
    </form>
  )
}

import { zodResolver } from '@hookform/resolvers/zod'
import { useWorkspaceChannels } from '@kizunu/api-client/channel/use-workspace-channels'
import { useMembers } from '@kizunu/api-client/workspace/use-members'
import { GrantChannelAccessRequestSchema } from '@kizunu/api-contracts/channel'
import { FormError } from '@kizunu/web/components/composed/form-error'
import { LookupSelect } from '@kizunu/web/components/composed/lookup-select'
import { Field, FieldError, FieldGroup, FieldLabel } from '@kizunu/web/components/primitives/field'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'

export const grantChannelAccessFormSchema = GrantChannelAccessRequestSchema.extend({
  accountId: z.uuid(),
})

export type GrantChannelAccessFormValues = z.infer<typeof grantChannelAccessFormSchema>

interface GrantChannelAccessFormProps {
  formId: string
  workspaceId: string
  isPending: boolean
  error?: string | null
  onSubmit: (values: GrantChannelAccessFormValues) => void
}

export function GrantChannelAccessForm(props: GrantChannelAccessFormProps) {
  const { formId, workspaceId, isPending, error, onSubmit } = props
  const channels = useWorkspaceChannels(workspaceId)
  const members = useMembers(workspaceId)
  const { control, handleSubmit } = useForm<GrantChannelAccessFormValues>({
    resolver: zodResolver(grantChannelAccessFormSchema),
    defaultValues: { accountId: '', userId: '' },
  })

  const accountOptions = (channels.data?.accounts ?? []).map((a) => ({
    value: a.id,
    label: a.name,
  }))
  const memberOptions = (members.data?.members ?? []).map((m) => ({
    value: m.userId,
    label: m.userName,
  }))

  return (
    <form id={formId} className="flex flex-col gap-3" onSubmit={handleSubmit(onSubmit)}>
      <FieldGroup>
        {error && <FormError>{error}</FormError>}
        <Controller
          control={control}
          name="accountId"
          render={({ field, fieldState }) => (
            <Field>
              <FieldLabel>Channel account</FieldLabel>
              <LookupSelect
                value={field.value ?? ''}
                placeholder="Select account"
                options={accountOptions}
                onChange={field.onChange}
                disabled={isPending}
              />
              {fieldState.error && (
                <FieldError id="accountId-error">{fieldState.error.message}</FieldError>
              )}
            </Field>
          )}
        />
        <Controller
          control={control}
          name="userId"
          render={({ field, fieldState }) => (
            <Field>
              <FieldLabel>Member</FieldLabel>
              <LookupSelect
                value={field.value ?? ''}
                placeholder="Select member"
                options={memberOptions}
                onChange={field.onChange}
                disabled={isPending}
              />
              {fieldState.error && (
                <FieldError id="userId-error">{fieldState.error.message}</FieldError>
              )}
            </Field>
          )}
        />
      </FieldGroup>
    </form>
  )
}

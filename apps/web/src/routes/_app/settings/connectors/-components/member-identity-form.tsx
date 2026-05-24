import { zodResolver } from '@hookform/resolvers/zod'
import { useDirectoryPipedriveUsers } from '@kizunu/api-client/crm/use-directory-pipedrive-users'
import { useMembers } from '@kizunu/api-client/workspace/use-members'
import {
  type CreateMemberConnectorIdentityRequest,
  CreateMemberConnectorIdentityRequestSchema,
} from '@kizunu/api-contracts/crm'
import { FormError } from '@kizunu/web/components/composed/form-error'
import { LookupSelect } from '@kizunu/web/components/composed/lookup-select'
import { ReconnectConnectorEmptyState } from '@kizunu/web/components/composed/reconnect-connector-empty-state'
import { Field, FieldError, FieldLabel } from '@kizunu/web/components/primitives/field'
import { useNavigate } from '@tanstack/react-router'
import { Controller, useForm } from 'react-hook-form'

interface MemberIdentityFormProps {
  formId: string
  workspaceId: string
  connectorAccountId: string
  isPending: boolean
  error?: string | null
  onSubmit: (values: CreateMemberConnectorIdentityRequest) => void
}

export function MemberIdentityForm(props: MemberIdentityFormProps) {
  const { formId, workspaceId, connectorAccountId, isPending, error, onSubmit } = props
  const navigate = useNavigate()
  const members = useMembers(workspaceId)
  const users = useDirectoryPipedriveUsers(workspaceId, connectorAccountId)
  const { control, handleSubmit } = useForm<CreateMemberConnectorIdentityRequest>({
    resolver: zodResolver(CreateMemberConnectorIdentityRequestSchema),
    defaultValues: { membershipId: '', externalId: '' },
  })

  const memberOptions = (members.data?.members ?? [])
    .filter((member) => member.status === 'active')
    .map((member) => ({
      value: member.membershipId,
      label: `${member.userName} (${member.userEmail})`,
    }))

  const userOptions = (users.data?.items ?? []).map((row) => ({
    value: row.value,
    label: row.label,
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
      {users.needsReconnect ? (
        <ReconnectConnectorEmptyState
          scope="crm"
          onReconnect={() => navigate({ to: '/settings/connectors' })}
        />
      ) : (
        <Controller
          name="externalId"
          control={control}
          render={({ field, fieldState }) => (
            <Field>
              <FieldLabel>Pipedrive user</FieldLabel>
              <LookupSelect
                value={field.value ?? ''}
                onChange={field.onChange}
                placeholder={users.isPending ? 'Loading users…' : 'Select a Pipedrive user'}
                options={userOptions}
                disabled={isPending || users.isPending}
              />
              {fieldState.error && (
                <FieldError id="externalId-error">{fieldState.error.message}</FieldError>
              )}
            </Field>
          )}
        />
      )}
    </form>
  )
}

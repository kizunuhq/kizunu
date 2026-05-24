import { useWorkspaceChannels } from '@kizunu/api-client/channel/use-workspace-channels'
import { useMembers } from '@kizunu/api-client/workspace/use-members'
import { FormError } from '@kizunu/web/components/composed/form-error'
import { LookupSelect } from '@kizunu/web/components/composed/lookup-select'
import { Field, FieldLabel } from '@kizunu/web/components/primitives/field'
import { useState } from 'react'

export interface GrantChannelAccessFormValues {
  accountId: string
  userId: string
}

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
  const [accountId, setAccountId] = useState('')
  const [userId, setUserId] = useState('')

  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!accountId || !userId) return
    onSubmit({ accountId, userId })
  }

  const accountOptions = (channels.data?.accounts ?? []).map((a) => ({
    value: a.id,
    label: a.name,
  }))
  const memberOptions = (members.data?.members ?? []).map((m) => ({
    value: m.userId,
    label: m.userName,
  }))

  return (
    <form id={formId} className="flex flex-col gap-3" onSubmit={submit}>
      {error && <FormError>{error}</FormError>}
      <Field>
        <FieldLabel>Channel account</FieldLabel>
        <LookupSelect
          value={accountId}
          placeholder="Select account"
          options={accountOptions}
          onChange={setAccountId}
          disabled={isPending}
        />
      </Field>
      <Field>
        <FieldLabel>Member</FieldLabel>
        <LookupSelect
          value={userId}
          placeholder="Select member"
          options={memberOptions}
          onChange={setUserId}
          disabled={isPending}
        />
      </Field>
    </form>
  )
}

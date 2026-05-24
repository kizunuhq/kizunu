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
  const [validationError, setValidationError] = useState<string | null>(null)

  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!accountId) {
      setValidationError('Pick a channel account.')
      return
    }
    if (!userId) {
      setValidationError('Pick a member to grant access to.')
      return
    }
    setValidationError(null)
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

  const displayError = validationError ?? error

  return (
    <form id={formId} className="flex flex-col gap-3" onSubmit={submit}>
      {displayError && <FormError>{displayError}</FormError>}
      <Field>
        <FieldLabel>Channel account</FieldLabel>
        <LookupSelect
          value={accountId}
          placeholder="Select account"
          options={accountOptions}
          onChange={(next) => {
            setAccountId(next)
            setValidationError(null)
          }}
          disabled={isPending}
        />
      </Field>
      <Field>
        <FieldLabel>Member</FieldLabel>
        <LookupSelect
          value={userId}
          placeholder="Select member"
          options={memberOptions}
          onChange={(next) => {
            setUserId(next)
            setValidationError(null)
          }}
          disabled={isPending}
        />
      </Field>
    </form>
  )
}

import { useGrantChannelAccess } from '@kizunu/api-client/channel/use-grant-channel-access'
import { useWorkspaceChannels } from '@kizunu/api-client/channel/use-workspace-channels'
import { useMembers } from '@kizunu/api-client/workspace/use-members'
import { LookupSelect } from '@kizunu/web/components/composed/lookup-select'
import { Button } from '@kizunu/web/components/primitives/button'
import { Field, FieldLabel } from '@kizunu/web/components/primitives/field'
import { useState } from 'react'

export function GrantChannelAccessForm({ workspaceId }: { workspaceId: string }) {
  const channels = useWorkspaceChannels(workspaceId)
  const members = useMembers(workspaceId)
  const [accountId, setAccountId] = useState('')
  const [userId, setUserId] = useState('')
  const grant = useGrantChannelAccess(workspaceId)

  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (accountId && userId) grant.grantChannelAccess({ accountId, userId })
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
    <form className="flex flex-col gap-3" onSubmit={submit}>
      <Field>
        <FieldLabel>Channel account</FieldLabel>
        <LookupSelect
          value={accountId}
          placeholder="Select account"
          options={accountOptions}
          onChange={setAccountId}
        />
      </Field>
      <Field>
        <FieldLabel>Member</FieldLabel>
        <LookupSelect
          value={userId}
          placeholder="Select member"
          options={memberOptions}
          onChange={setUserId}
        />
      </Field>
      <Button type="submit" disabled={grant.isPending || !accountId || !userId}>
        Grant access
      </Button>
    </form>
  )
}

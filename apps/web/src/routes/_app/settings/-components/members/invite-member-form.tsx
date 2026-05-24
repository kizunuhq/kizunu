import { useInviteMember } from '@kizunu/api-client/workspace/use-invite-member'
import { Button } from '@kizunu/web/components/primitives/button'
import { Input } from '@kizunu/web/components/primitives/input'
import { getApiErrorMessage } from '@kizunu/web/lib/get-api-error-message'
import { useState } from 'react'

export function InviteMemberForm({ workspaceId }: { workspaceId: string }) {
  const [email, setEmail] = useState('')
  const invite = useInviteMember(workspaceId, { onSuccess: () => setEmail('') })

  function submit(event: React.FormEvent) {
    event.preventDefault()
    invite.mutate({ email })
  }

  return (
    <div className="flex flex-col gap-2">
      <form className="flex items-center gap-2" onSubmit={submit}>
        <Input
          type="email"
          value={email}
          placeholder="teammate@company.com"
          required
          onChange={(event) => setEmail(event.target.value)}
        />
        <Button type="submit" disabled={invite.isPending}>
          Invite
        </Button>
      </form>
      {invite.isError ? (
        <p className="text-destructive text-sm">{getApiErrorMessage(invite.error)}</p>
      ) : null}
      {invite.data ? (
        <p className="text-muted-foreground text-sm">
          Invitation token (share it):{' '}
          <code className="font-mono">{invite.data.invitationToken}</code>
        </p>
      ) : null}
    </div>
  )
}

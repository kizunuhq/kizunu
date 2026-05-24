import { useCurrentUser } from '@kizunu/api-client/identity/use-current-user'
import { PageHeader } from '@kizunu/web/components/composed/page-header'
import { Button } from '@kizunu/web/components/primitives/button'
import { Card, CardContent, CardHeader, CardTitle } from '@kizunu/web/components/primitives/card'
import { MembersTable } from '@kizunu/web/routes/_app/settings/-components/members/members-table'
import { InviteMemberDialog } from '@kizunu/web/routes/_app/settings/-dialogs/invite-member-dialog'
import { Plus } from '@phosphor-icons/react'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

export const Route = createFileRoute('/_app/settings/members')({
  component: MembersPage,
})

function MembersPage() {
  const { activeWorkspaceId } = useCurrentUser()
  const [inviteOpen, setInviteOpen] = useState(false)

  if (!activeWorkspaceId) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Members" description="Invite teammates and manage their roles." />
        <p className="text-muted-foreground text-sm">No active workspace selected.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Members"
        description="Invite teammates and manage their roles."
        actions={
          <Button onClick={() => setInviteOpen(true)}>
            <Plus weight="bold" />
            Invite member
          </Button>
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
        </CardHeader>
        <CardContent>
          <MembersTable workspaceId={activeWorkspaceId} />
        </CardContent>
      </Card>
      <InviteMemberDialog
        workspaceId={activeWorkspaceId}
        open={inviteOpen}
        onOpenChange={setInviteOpen}
      />
    </div>
  )
}

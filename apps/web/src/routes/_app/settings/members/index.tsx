import { useCurrentUser } from '@kizunu/api-client/identity/use-current-user'
import type { InviteMemberResponse } from '@kizunu/api-contracts/workspace'
import { PageHeader } from '@kizunu/web/components/composed/page-header'
import { Button } from '@kizunu/web/components/primitives/button'
import { Card, CardContent, CardHeader, CardTitle } from '@kizunu/web/components/primitives/card'
import { MembersTable } from '@kizunu/web/routes/_app/settings/members/-components/members-table'
import { RoutingReadinessPanel } from '@kizunu/web/routes/_app/settings/members/-components/routing-readiness-panel'
import { InvitationTokenDialog } from '@kizunu/web/routes/_app/settings/members/-dialogs/invitation-token-dialog'
import { InviteMemberDialog } from '@kizunu/web/routes/_app/settings/members/-dialogs/invite-member-dialog'
import { Plus } from '@phosphor-icons/react'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

export const Route = createFileRoute('/_app/settings/members/')({
  component: MembersPage,
})

function MembersPage() {
  const { activeWorkspaceId } = useCurrentUser()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [lastInvitation, setLastInvitation] = useState<InviteMemberResponse | null>(null)

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
      <Card>
        <CardHeader>
          <CardTitle>Routing readiness</CardTitle>
        </CardHeader>
        <CardContent>
          <RoutingReadinessPanel workspaceId={activeWorkspaceId} />
        </CardContent>
      </Card>
      <InviteMemberDialog
        workspaceId={activeWorkspaceId}
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onInvited={setLastInvitation}
      />
      <InvitationTokenDialog
        token={lastInvitation?.invitationToken ?? null}
        open={Boolean(lastInvitation)}
        onOpenChange={(next) => !next && setLastInvitation(null)}
      />
    </div>
  )
}

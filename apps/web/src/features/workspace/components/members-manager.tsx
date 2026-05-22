import { useMembers } from '@kizunu/api-client/workspace/use-members'
import { Card, CardContent, CardHeader, CardTitle } from '@kizunu/web/components/primitives/card'
import { InviteMemberForm } from '@kizunu/web/features/workspace/components/invite-member-form'
import { MembersTable } from '@kizunu/web/features/workspace/components/members-table'

export function MembersManager({ workspaceId }: { workspaceId: string }) {
  const { data, isPending } = useMembers(workspaceId)

  return (
    <div className="flex flex-col gap-6">
      <InviteMemberForm workspaceId={workspaceId} />
      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
        </CardHeader>
        <CardContent>
          {isPending ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : (
            <MembersTable workspaceId={workspaceId} members={data?.members ?? []} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

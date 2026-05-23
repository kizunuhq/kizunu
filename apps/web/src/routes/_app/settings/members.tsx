import { useCurrentUser } from '@kizunu/api-client/identity/use-current-user'
import { PageHeader } from '@kizunu/web/components/composed/page-header'
import { MembersManager } from '@kizunu/web/features/workspace/components/members-manager'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/settings/members')({
  component: MembersPage,
})

function MembersPage() {
  const { activeWorkspaceId } = useCurrentUser()

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Members" description="Invite teammates and manage their roles." />
      {activeWorkspaceId ? (
        <MembersManager workspaceId={activeWorkspaceId} />
      ) : (
        <p className="text-muted-foreground text-sm">No active workspace selected.</p>
      )}
    </div>
  )
}

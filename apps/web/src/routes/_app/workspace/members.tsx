import { useCurrentUser } from '@kizunu/api-client/identity/use-current-user'
import { MembersManager } from '@kizunu/web/features/workspace/components/members-manager'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/workspace/members')({
  component: WorkspaceMembersPage,
})

function WorkspaceMembersPage() {
  const { activeWorkspaceId } = useCurrentUser()

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Members</h1>
      {activeWorkspaceId ? (
        <MembersManager workspaceId={activeWorkspaceId} />
      ) : (
        <p className="text-muted-foreground text-sm">No active workspace selected.</p>
      )}
    </div>
  )
}

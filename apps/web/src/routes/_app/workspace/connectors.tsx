import { useCurrentUser } from '@kizunu/api-client/identity/use-current-user'
import { ConnectorsManager } from '@kizunu/web/features/crm/components/connectors-manager'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/workspace/connectors')({
  component: ConnectorsPage,
})

function ConnectorsPage() {
  const { activeWorkspaceId } = useCurrentUser()

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">CRM connectors</h1>
      {activeWorkspaceId ? (
        <ConnectorsManager workspaceId={activeWorkspaceId} />
      ) : (
        <p className="text-muted-foreground text-sm">No active workspace selected.</p>
      )}
    </div>
  )
}

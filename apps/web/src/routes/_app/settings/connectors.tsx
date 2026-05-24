import { useCurrentUser } from '@kizunu/api-client/identity/use-current-user'
import { PageHeader } from '@kizunu/web/components/composed/page-header'
import { ConnectorsManager } from '@kizunu/web/routes/_app/settings/-components/connectors/connectors-manager'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/settings/connectors')({
  component: ConnectorsPage,
})

function ConnectorsPage() {
  const { activeWorkspaceId } = useCurrentUser()

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="CRM connectors" description="Map CRM stages to outbound cadences." />
      {activeWorkspaceId ? (
        <ConnectorsManager workspaceId={activeWorkspaceId} />
      ) : (
        <p className="text-muted-foreground text-sm">No active workspace selected.</p>
      )}
    </div>
  )
}

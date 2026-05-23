import { useCurrentUser } from '@kizunu/api-client/identity/use-current-user'
import { PageHeader } from '@kizunu/web/components/composed/page-header'
import { ChannelsManager } from '@kizunu/web/features/channel/components/channels-manager'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/settings/channels')({
  component: ChannelsPage,
})

function ChannelsPage() {
  const { activeWorkspaceId } = useCurrentUser()

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Channels" description="Connect outbound channels for the workspace." />
      {activeWorkspaceId ? (
        <ChannelsManager workspaceId={activeWorkspaceId} />
      ) : (
        <p className="text-muted-foreground text-sm">No active workspace selected.</p>
      )}
    </div>
  )
}

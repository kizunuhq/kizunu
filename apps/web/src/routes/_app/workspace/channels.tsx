import { useCurrentUser } from '@kizunu/api-client/identity/use-current-user'
import { ChannelsManager } from '@kizunu/web/features/channel/components/channels-manager'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/workspace/channels')({
  component: ChannelsPage,
})

function ChannelsPage() {
  const { activeWorkspaceId } = useCurrentUser()

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Channels</h1>
      {activeWorkspaceId ? (
        <ChannelsManager workspaceId={activeWorkspaceId} />
      ) : (
        <p className="text-muted-foreground text-sm">No active workspace selected.</p>
      )}
    </div>
  )
}

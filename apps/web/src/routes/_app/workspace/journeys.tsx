import { useCurrentUser } from '@kizunu/api-client/identity/use-current-user'
import { JourneysView } from '@kizunu/web/features/engine/components/journeys-view'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/workspace/journeys')({
  component: JourneysPage,
})

function JourneysPage() {
  const { activeWorkspaceId } = useCurrentUser()

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Journeys</h1>
      {activeWorkspaceId ? (
        <JourneysView workspaceId={activeWorkspaceId} />
      ) : (
        <p className="text-muted-foreground text-sm">No active workspace selected.</p>
      )}
    </div>
  )
}

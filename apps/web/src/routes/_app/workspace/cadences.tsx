import { useCurrentUser } from '@kizunu/api-client/identity/use-current-user'
import { CadencesManager } from '@kizunu/web/features/cadence/components/cadences-manager'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/workspace/cadences')({
  component: CadencesPage,
})

function CadencesPage() {
  const { activeWorkspaceId } = useCurrentUser()

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Cadences &amp; templates</h1>
      {activeWorkspaceId ? (
        <CadencesManager workspaceId={activeWorkspaceId} />
      ) : (
        <p className="text-muted-foreground text-sm">No active workspace selected.</p>
      )}
    </div>
  )
}

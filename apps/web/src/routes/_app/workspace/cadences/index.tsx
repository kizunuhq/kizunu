import { useCurrentUser } from '@kizunu/api-client/identity/use-current-user'
import { CadenceTemplatesView } from '@kizunu/web/routes/_app/workspace/cadences/-components/cadence-templates-view'
import { createFileRoute, useNavigate } from '@tanstack/react-router'

type CadencesTab = 'cadences' | 'templates'

interface CadencesSearch {
  tab: CadencesTab
}

export const Route = createFileRoute('/_app/workspace/cadences/')({
  validateSearch: (search: Record<string, unknown>): CadencesSearch => ({
    tab: search.tab === 'templates' ? 'templates' : 'cadences',
  }),
  component: CadencesPage,
})

function CadencesPage() {
  const { activeWorkspaceId } = useCurrentUser()
  const { tab } = Route.useSearch()
  const navigate = useNavigate()

  if (!activeWorkspaceId) {
    return <p className="text-muted-foreground text-sm">No active workspace selected.</p>
  }

  return (
    <CadenceTemplatesView
      workspaceId={activeWorkspaceId}
      activeTab={tab}
      onTabChange={(next) =>
        navigate({ to: '/workspace/cadences', search: { tab: next }, replace: true })
      }
    />
  )
}

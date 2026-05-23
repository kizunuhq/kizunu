import { useCurrentUser } from '@kizunu/api-client/identity/use-current-user'
import type { LeadJourneyStatusValue } from '@kizunu/api-contracts/engine'
import {
  isJourneyStatusValue,
  JourneysView,
} from '@kizunu/web/features/engine/components/journeys-view'
import { createFileRoute, useNavigate } from '@tanstack/react-router'

type StatusFilter = LeadJourneyStatusValue | 'all'

interface JourneysSearch {
  status: StatusFilter
}

export const Route = createFileRoute('/_app/workspace/journeys')({
  validateSearch: (search: Record<string, unknown>): JourneysSearch => ({
    status:
      typeof search.status === 'string' && isJourneyStatusValue(search.status)
        ? search.status
        : 'all',
  }),
  component: JourneysPage,
})

function JourneysPage() {
  const { activeWorkspaceId } = useCurrentUser()
  const { status } = Route.useSearch()
  const navigate = useNavigate()

  if (!activeWorkspaceId) {
    return <p className="text-muted-foreground text-sm">No active workspace selected.</p>
  }

  return (
    <JourneysView
      workspaceId={activeWorkspaceId}
      status={status}
      onStatusChange={(next) =>
        navigate({
          to: '/workspace/journeys',
          search: { status: next },
          replace: true,
        })
      }
    />
  )
}

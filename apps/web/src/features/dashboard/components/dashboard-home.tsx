import { useLeadJourneys } from '@kizunu/api-client/engine/use-lead-journeys'
import { useCurrentUser } from '@kizunu/api-client/identity/use-current-user'
import { EmptyState } from '@kizunu/web/components/composed/empty-state'
import { PageHeader } from '@kizunu/web/components/composed/page-header'
import { buttonVariants } from '@kizunu/web/components/primitives/button'
import { FirstRunChecklist } from '@kizunu/web/features/dashboard/components/first-run-checklist'
import { KpiGrid } from '@kizunu/web/features/dashboard/components/kpi-grid'
import { RecentJourneysCard } from '@kizunu/web/features/dashboard/components/recent-journeys-card'
import { Lightning } from '@phosphor-icons/react'
import { Link } from '@tanstack/react-router'

export function DashboardHome() {
  const { activeWorkspaceId } = useCurrentUser()
  const journeys = useLeadJourneys(activeWorkspaceId ?? undefined)
  const totalJourneys = journeys.data?.journeys.length ?? 0
  const hasNoJourneys = !journeys.isPending && totalJourneys === 0

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Overview" kicker="Operations" />
      <KpiGrid workspaceId={activeWorkspaceId ?? undefined} />
      {hasNoJourneys ? (
        <EmptyState
          icon={<Lightning />}
          title="No journeys running yet"
          description="Create a cadence and connect a CRM to start sending touches."
          action={
            <Link to="/workspace/cadences" className={buttonVariants()}>
              Create a cadence
            </Link>
          }
        />
      ) : (
        <RecentJourneysCard workspaceId={activeWorkspaceId ?? undefined} />
      )}
      <FirstRunChecklist workspaceId={activeWorkspaceId ?? undefined} />
    </div>
  )
}

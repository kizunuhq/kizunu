import { useLeadJourneys } from '@kizunu/api-client/engine/use-lead-journeys'
import type { LeadJourneyStatusValue } from '@kizunu/api-contracts/engine'
import { JourneyStatusDot } from '@kizunu/web/components/composed/journey-status-dot'
import { Skeleton } from '@kizunu/web/components/primitives/skeleton'
import { CaretRight } from '@phosphor-icons/react'
import { Link } from '@tanstack/react-router'

const SHOW_COUNT = 5
const PENDING_ROW_COUNT = 3

interface RecentJourneysCardProps {
  workspaceId: string | undefined
}

export function RecentJourneysCard({ workspaceId }: RecentJourneysCardProps) {
  const query = useLeadJourneys(workspaceId)
  if (!query.isPending && (query.data?.journeys.length ?? 0) === 0) return null

  return (
    <section className="border-border flex flex-col gap-3 rounded-[2px] border p-4">
      <header className="flex items-center justify-between">
        <h2 className="text-foreground text-base font-medium">Recent journeys</h2>
        <Link
          to="/workspace/journeys"
          search={{ status: 'all' as const }}
          className="text-muted-foreground hover:text-foreground text-sm underline-offset-2 hover:underline"
        >
          View all
        </Link>
      </header>
      <ul className="divide-border flex flex-col divide-y">
        {query.isPending
          ? buildSkeletonRows()
          : query.data?.journeys
              .slice(0, SHOW_COUNT)
              .map((journey) => (
                <RecentJourneyRow
                  key={journey.id}
                  leadName={journey.leadName}
                  status={journey.status}
                  nextTouchAt={journey.nextTouchAt}
                />
              ))}
      </ul>
    </section>
  )
}

interface RecentJourneyRowProps {
  leadName: string
  status: LeadJourneyStatusValue
  nextTouchAt: string | null
}

function RecentJourneyRow({ leadName, status, nextTouchAt }: RecentJourneyRowProps) {
  return (
    <li>
      <Link
        to="/workspace/journeys"
        search={{ status: 'all' as const }}
        className="hover:bg-accent flex items-center justify-between gap-3 py-2 transition-colors"
      >
        <div className="flex items-center gap-2">
          <JourneyStatusDot status={status} />
          <span className="text-foreground text-sm">{leadName}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground font-mono text-xs">
            {nextTouchAt ? formatTimestamp(nextTouchAt) : '—'}
          </span>
          <CaretRight className="text-muted-foreground size-3" />
        </div>
      </Link>
    </li>
  )
}

function formatTimestamp(iso: string): string {
  return iso.replace('T', ' ').replace(/\.\d+Z$/, 'Z')
}

function buildSkeletonRows() {
  return Array.from({ length: PENDING_ROW_COUNT }).map((_, index) => (
    <li key={`skeleton-${index}`} className="py-2">
      <Skeleton className="h-5 w-full" />
    </li>
  ))
}

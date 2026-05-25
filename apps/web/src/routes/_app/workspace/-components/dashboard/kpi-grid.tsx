import { useLeadJourneys } from '@kizunu/api-client/engine/use-lead-journeys'
import { KpiTile } from '@kizunu/web/components/composed/kpi-tile'

interface KpiGridProps {
  workspaceId: string | undefined
}

const ONE_HOUR_MS = 60 * 60 * 1000

export function KpiGrid({ workspaceId }: KpiGridProps) {
  const running = useLeadJourneys(workspaceId, 'running')
  const replied = useLeadJourneys(workspaceId, 'replied')
  const exhausted = useLeadJourneys(workspaceId, 'exhausted')
  const errored = useLeadJourneys(workspaceId, 'error_state')

  const queuedNextHour = countDueWithin(running.data?.journeys ?? [], ONE_HOUR_MS)
  const topErrorReason = mostCommonErrorReason(errored.data?.journeys ?? [])

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <KpiTile
        label="Queued (1h)"
        value={running.isError ? '—' : queuedNextHour}
        isPending={running.isPending}
      />
      <KpiTile
        label="Replied"
        accent="success"
        value={replied.isError ? '—' : (replied.data?.journeys.length ?? 0)}
        isPending={replied.isPending}
      />
      <KpiTile
        label="Exhausted"
        accent="warning"
        value={exhausted.isError ? '—' : (exhausted.data?.journeys.length ?? 0)}
        isPending={exhausted.isPending}
      />
      <KpiTile
        label="Error"
        accent="danger"
        value={errored.isError ? '—' : (errored.data?.journeys.length ?? 0)}
        isPending={errored.isPending}
        subtitle={topErrorReason ?? undefined}
      />
    </div>
  )
}

interface JourneyForKpi {
  nextTouchAt: string | null
  errorReason: string | null
}

function countDueWithin(journeys: JourneyForKpi[], windowMs: number): number {
  const horizon = Date.now() + windowMs
  return journeys.filter((journey) => {
    if (!journey.nextTouchAt) return false
    return new Date(journey.nextTouchAt).getTime() <= horizon
  }).length
}

function mostCommonErrorReason(journeys: JourneyForKpi[]): string | null {
  const counts = new Map<string, number>()
  for (const journey of journeys) {
    if (!journey.errorReason) continue
    counts.set(journey.errorReason, (counts.get(journey.errorReason) ?? 0) + 1)
  }
  let bestReason: string | null = null
  let bestCount = 0
  for (const [reason, count] of counts) {
    if (count > bestCount) {
      bestReason = reason
      bestCount = count
    }
  }
  return bestReason
}

import { useLeadJourneys } from '@kizunu/api-client/engine/use-lead-journeys'
import { KpiTile } from '@kizunu/web/components/composed/kpi-tile'

interface KpiGridProps {
  workspaceId: string | undefined
}

export function KpiGrid({ workspaceId }: KpiGridProps) {
  const running = useLeadJourneys(workspaceId, 'running')
  const replied = useLeadJourneys(workspaceId, 'replied')
  const exhausted = useLeadJourneys(workspaceId, 'exhausted')
  const errored = useLeadJourneys(workspaceId, 'error_state')

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <KpiTile
        label="Running"
        value={running.isError ? '—' : (running.data?.journeys.length ?? 0)}
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
      />
    </div>
  )
}

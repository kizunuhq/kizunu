import { useLeadJourneys } from '@kizunu/api-client/engine/use-lead-journeys'
import type { LeadJourneyStatusValue } from '@kizunu/api-contracts/engine'
import { Button } from '@kizunu/web/components/primitives/button'
import { JourneysTable } from '@kizunu/web/features/engine/components/journeys-table'
import { useState } from 'react'

const FILTERS: Array<{ label: string; value: LeadJourneyStatusValue | undefined }> = [
  { label: 'All', value: undefined },
  { label: 'Running', value: 'running' },
  { label: 'Replied', value: 'replied' },
  { label: 'Exhausted', value: 'exhausted' },
  { label: 'Error', value: 'error_state' },
]

export function JourneysView({ workspaceId }: { workspaceId: string }) {
  const [status, setStatus] = useState<LeadJourneyStatusValue | undefined>(undefined)
  const { data, isPending } = useLeadJourneys(workspaceId, status)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <Button
            key={filter.label}
            variant={filter.value === status ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatus(filter.value)}
          >
            {filter.label}
          </Button>
        ))}
      </div>
      {isPending ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : (
        <JourneysTable journeys={data?.journeys ?? []} />
      )}
    </div>
  )
}

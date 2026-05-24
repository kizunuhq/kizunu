import { useLeadJourneys } from '@kizunu/api-client/engine/use-lead-journeys'
import type { LeadJourneyStatusValue } from '@kizunu/api-contracts/engine'
import { DataTable } from '@kizunu/web/components/composed/data-table'
import { PageHeader } from '@kizunu/web/components/composed/page-header'
import { Button } from '@kizunu/web/components/primitives/button'
import { JourneyStatusDot } from '@kizunu/web/routes/_app/workspace/-components/journey-status-dot'

type StatusFilter = LeadJourneyStatusValue | 'all'

interface FilterChip {
  label: string
  value: StatusFilter
}

const FILTERS: FilterChip[] = [
  { label: 'All', value: 'all' },
  { label: 'Running', value: 'running' },
  { label: 'Replied', value: 'replied' },
  { label: 'Exhausted', value: 'exhausted' },
  { label: 'Error', value: 'error_state' },
]

interface JourneysViewProps {
  workspaceId: string
  status: StatusFilter
  onStatusChange: (next: StatusFilter) => void
}

export function JourneysView({ workspaceId, status, onStatusChange }: JourneysViewProps) {
  const apiStatus = status === 'all' ? undefined : status
  const { data, isPending } = useLeadJourneys(workspaceId, apiStatus)
  const rows = data?.journeys ?? []

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Journeys" kicker="Operations" />
      <FilterChips active={status} onChange={onStatusChange} />
      <DataTable
        columns={JOURNEY_COLUMNS}
        rows={rows}
        isPending={isPending}
        rowKey={(row) => row.id}
        emptyTitle={emptyTitle(status)}
        emptyDescription="Create a cadence and connect a CRM to start sending touches."
      />
    </div>
  )
}

function emptyTitle(status: StatusFilter): string {
  if (status === 'all') return 'No journeys yet'
  return `No ${status.replace('_', ' ')} journeys`
}

interface FilterChipsProps {
  active: StatusFilter
  onChange: (next: StatusFilter) => void
}

function FilterChips({ active, onChange }: FilterChipsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {FILTERS.map((filter) => (
        <Button
          key={filter.value}
          variant={filter.value === active ? 'default' : 'outline'}
          size="xs"
          onClick={() => onChange(filter.value)}
        >
          {filter.label}
        </Button>
      ))}
    </div>
  )
}

type Journey = NonNullable<ReturnType<typeof useLeadJourneys>['data']>['journeys'][number]

import type { DataTableColumn } from '@kizunu/web/components/composed/data-table'

const JOURNEY_COLUMNS: DataTableColumn<Journey>[] = [
  {
    key: 'lead',
    header: 'Lead',
    cell: (row: Journey) => <span className="text-foreground text-sm">{row.leadName}</span>,
  },
  {
    key: 'status',
    header: 'Status',
    cell: (row: Journey) => (
      <span className="inline-flex items-center gap-2 text-sm">
        <JourneyStatusDot status={row.status} />
        <span className="text-foreground">{row.status}</span>
      </span>
    ),
  },
  {
    key: 'step',
    header: 'Step',
    cell: (row: Journey) => (
      <span className="text-muted-foreground font-mono text-xs">{row.currentStepOrder + 1}</span>
    ),
  },
  {
    key: 'next',
    header: 'Next touch',
    cell: (row: Journey) => (
      <span className="text-muted-foreground font-mono text-xs">
        {row.nextTouchAt ? formatTimestamp(row.nextTouchAt) : '—'}
      </span>
    ),
  },
]

function formatTimestamp(iso: string): string {
  return iso.replace('T', ' ').replace(/\.\d+Z$/, 'Z')
}

const STATUS_VALUES: ReadonlyArray<LeadJourneyStatusValue> = [
  'running',
  'paused',
  'replied',
  'exhausted',
  'stopped',
  'error_state',
  'paused_owner_inactive',
]

export function isJourneyStatusValue(value: string): value is LeadJourneyStatusValue {
  return STATUS_VALUES.some((status) => status === value)
}

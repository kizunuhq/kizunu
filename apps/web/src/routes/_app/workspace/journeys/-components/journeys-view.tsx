import {
  usePauseAllJourneys,
  usePauseJourney,
  useResumeJourney,
  useStopJourney,
} from '@kizunu/api-client/engine/use-journey-controls'
import { useLeadJourneys } from '@kizunu/api-client/engine/use-lead-journeys'
import type { LeadJourneyStatusValue } from '@kizunu/api-contracts/engine'
import type { DataTableColumn } from '@kizunu/web/components/composed/data-table'
import { DataTable } from '@kizunu/web/components/composed/data-table'
import { JourneyErrorCell } from '@kizunu/web/components/composed/journey-error-cell'
import { JourneyStatusDot } from '@kizunu/web/components/composed/journey-status-dot'
import { PageHeader } from '@kizunu/web/components/composed/page-header'
import { Button } from '@kizunu/web/components/primitives/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@kizunu/web/components/primitives/dropdown-menu'
import { getApiErrorMessage } from '@kizunu/web/lib/get-api-error-message'
import { DotsThree } from '@phosphor-icons/react'
import { useMemo } from 'react'
import { toast } from 'sonner'

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
  const { pauseAllJourneys, isPending: isPausingAll } = usePauseAllJourneys(workspaceId, {
    onSuccess: () => toast.success('All running journeys paused'),
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })

  const columns = useMemo(() => buildColumns(workspaceId), [workspaceId])

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Journeys"
        kicker="Operations"
        actions={
          <Button
            variant="outline"
            size="sm"
            loading={isPausingAll}
            onClick={() => pauseAllJourneys()}
          >
            Pause all running
          </Button>
        }
      />
      <FilterChips active={status} onChange={onStatusChange} />
      <DataTable
        columns={columns}
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

function buildColumns(workspaceId: string): DataTableColumn<Journey>[] {
  return [
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
    {
      key: 'errorReason',
      header: 'Error reason',
      cell: (row: Journey) => <JourneyErrorCell errorReason={row.errorReason} />,
    },
    {
      key: 'actions',
      header: '',
      cell: (row: Journey) => <JourneyRowActions workspaceId={workspaceId} row={row} />,
    },
  ]
}

interface JourneyRowActionsProps {
  workspaceId: string
  row: Journey
}

function JourneyRowActions({ workspaceId, row }: JourneyRowActionsProps) {
  const { controlJourney: pauseJourney } = usePauseJourney(workspaceId, {
    onSuccess: () => toast.success('Journey paused'),
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })
  const { controlJourney: resumeJourney } = useResumeJourney(workspaceId, {
    onSuccess: () => toast.success('Journey resumed'),
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })
  const { controlJourney: stopJourney } = useStopJourney(workspaceId, {
    onSuccess: () => toast.success('Journey stopped'),
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })

  const canPause = row.status === 'running'
  const canResume = row.status === 'paused'
  const canStop = row.status === 'running' || row.status === 'paused'

  if (!canPause && !canResume && !canStop) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon-sm" aria-label="Journey actions">
            <DotsThree weight="bold" />
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        {canPause && (
          <DropdownMenuItem onSelect={() => pauseJourney({ journeyId: row.id })}>
            Pause
          </DropdownMenuItem>
        )}
        {canResume && (
          <DropdownMenuItem onSelect={() => resumeJourney({ journeyId: row.id })}>
            Resume
          </DropdownMenuItem>
        )}
        {canStop && (
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => stopJourney({ journeyId: row.id })}
          >
            Stop
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

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

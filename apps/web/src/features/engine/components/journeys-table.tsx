import type { ListLeadJourneysResponse } from '@kizunu/api-contracts/engine'
import { Badge } from '@kizunu/web/components/primitives/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kizunu/web/components/primitives/table'

type Journey = ListLeadJourneysResponse['journeys'][number]

const ACTIVE_STATUSES = new Set(['running', 'paused', 'paused_owner_inactive'])

function formatNextTouch(value: string | null): string {
  return value ? new Date(value).toLocaleString() : '—'
}

export function JourneysTable({ journeys }: { journeys: Journey[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Lead</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Step</TableHead>
          <TableHead>Next touch</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {journeys.map((journey) => (
          <TableRow key={journey.id}>
            <TableCell>{journey.leadName}</TableCell>
            <TableCell>
              <Badge variant={ACTIVE_STATUSES.has(journey.status) ? 'default' : 'secondary'}>
                {journey.status}
              </Badge>
            </TableCell>
            <TableCell>{journey.currentStepOrder + 1}</TableCell>
            <TableCell>{formatNextTouch(journey.nextTouchAt)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

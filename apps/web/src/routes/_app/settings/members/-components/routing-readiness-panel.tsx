import { useRoutingReadiness } from '@kizunu/api-client/workspace/use-routing-readiness'
import type { RoutingReadinessMember } from '@kizunu/api-contracts/workspace'
import { Badge } from '@kizunu/web/components/primitives/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kizunu/web/components/primitives/table'

interface RoutingReadinessPanelProps {
  workspaceId: string
}

interface RowStatus {
  label: string
  variant: 'default' | 'secondary' | 'destructive'
}

function readiness(member: RoutingReadinessMember): RowStatus {
  if (member.hasPrimaryWhatsappChannel) return { label: 'Ready', variant: 'default' }
  if (member.hasWhatsappAccess) return { label: 'Missing primary', variant: 'secondary' }
  return { label: 'No channel access', variant: 'destructive' }
}

export function RoutingReadinessPanel({ workspaceId }: RoutingReadinessPanelProps) {
  const { data, isPending } = useRoutingReadiness(workspaceId)

  if (isPending) return <p className="text-muted-foreground text-sm">Loading…</p>

  const activeMembers = (data?.members ?? []).filter((member) => member.status === 'active')

  if (activeMembers.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No active members to route. Invite a teammate to start routing leads.
      </p>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Member</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Routing</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {activeMembers.map((member) => {
          const status = readiness(member)
          return (
            <TableRow key={member.membershipId}>
              <TableCell>{member.name}</TableCell>
              <TableCell className="text-muted-foreground">{member.email}</TableCell>
              <TableCell>
                <Badge variant={status.variant}>{status.label}</Badge>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

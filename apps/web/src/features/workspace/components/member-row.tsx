import type { ListMembersResponse } from '@kizunu/api-contracts/workspace'
import { Badge } from '@kizunu/web/components/primitives/badge'
import { Button } from '@kizunu/web/components/primitives/button'
import { TableCell, TableRow } from '@kizunu/web/components/primitives/table'

type Member = ListMembersResponse['members'][number]

interface MemberRowProps {
  member: Member
  togglePending: boolean
  pausePending: boolean
  onToggle: (member: Member) => void
  onPause: (member: Member) => void
}

export function MemberRow({
  member,
  togglePending,
  pausePending,
  onToggle,
  onPause,
}: MemberRowProps) {
  return (
    <TableRow>
      <TableCell>{member.userName}</TableCell>
      <TableCell>{member.userEmail}</TableCell>
      <TableCell>{member.role}</TableCell>
      <TableCell>
        <Badge variant={member.status === 'active' ? 'default' : 'secondary'}>
          {member.status}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <div className="inline-flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={pausePending}
            onClick={() => onPause(member)}
          >
            {pausePending ? 'Pausing…' : 'Pause journeys'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={togglePending}
            onClick={() => onToggle(member)}
          >
            {member.status === 'active' ? 'Deactivate' : 'Activate'}
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}

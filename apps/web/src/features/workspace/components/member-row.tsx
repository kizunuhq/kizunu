import type { ListMembersResponse } from '@kizunu/api-contracts/workspace'
import { Badge } from '@kizunu/web/components/primitives/badge'
import { Button } from '@kizunu/web/components/primitives/button'
import { TableCell, TableRow } from '@kizunu/web/components/primitives/table'

type Member = ListMembersResponse['members'][number]

export function MemberRow({
  member,
  pending,
  onToggle,
}: {
  member: Member
  pending: boolean
  onToggle: (member: Member) => void
}) {
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
        <Button variant="outline" size="sm" disabled={pending} onClick={() => onToggle(member)}>
          {member.status === 'active' ? 'Deactivate' : 'Activate'}
        </Button>
      </TableCell>
    </TableRow>
  )
}

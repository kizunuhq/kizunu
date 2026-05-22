import { useUpdateMemberStatus } from '@kizunu/api-client/workspace/use-update-member-status'
import type { ListMembersResponse } from '@kizunu/api-contracts/workspace'
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@kizunu/web/components/primitives/table'
import { MemberRow } from '@kizunu/web/features/workspace/components/member-row'

type Member = ListMembersResponse['members'][number]

export function MembersTable({ workspaceId, members }: { workspaceId: string; members: Member[] }) {
  const updateStatus = useUpdateMemberStatus(workspaceId)

  function toggle(member: Member) {
    updateStatus.mutate({
      membershipId: member.membershipId,
      status: member.status === 'active' ? 'inactive' : 'active',
    })
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Status</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {members.map((member) => (
          <MemberRow
            key={member.membershipId}
            member={member}
            pending={updateStatus.isPending}
            onToggle={toggle}
          />
        ))}
      </TableBody>
    </Table>
  )
}

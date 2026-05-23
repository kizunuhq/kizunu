import { usePauseOwnerJourneys } from '@kizunu/api-client/engine/use-pause-owner-journeys'
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
import { getApiErrorMessage } from '@kizunu/web/lib/get-api-error-message'
import { toast } from 'sonner'

type Member = ListMembersResponse['members'][number]

interface MembersTableProps {
  workspaceId: string
  members: Member[]
}

export function MembersTable({ workspaceId, members }: MembersTableProps) {
  const updateStatus = useUpdateMemberStatus(workspaceId)
  const pauseOwner = usePauseOwnerJourneys(workspaceId, {
    onSuccess: () => toast.success("Paused this owner's running journeys."),
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })

  function toggle(member: Member) {
    updateStatus.mutate({
      membershipId: member.membershipId,
      status: member.status === 'active' ? 'inactive' : 'active',
    })
  }

  function pause(member: Member) {
    pauseOwner.mutate(member.userId)
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
            togglePending={updateStatus.isPending}
            pausePending={pauseOwner.isPending}
            onToggle={toggle}
            onPause={pause}
          />
        ))}
      </TableBody>
    </Table>
  )
}

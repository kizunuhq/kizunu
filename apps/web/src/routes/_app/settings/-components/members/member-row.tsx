import { useUpdateMemberStatus } from '@kizunu/api-client/workspace/use-update-member-status'
import type { ListMembersResponse } from '@kizunu/api-contracts/workspace'
import { Badge } from '@kizunu/web/components/primitives/badge'
import { Button } from '@kizunu/web/components/primitives/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@kizunu/web/components/primitives/dropdown-menu'
import { TableCell, TableRow } from '@kizunu/web/components/primitives/table'
import { getApiErrorMessage } from '@kizunu/web/lib/get-api-error-message'
import { DotsThree } from '@phosphor-icons/react'
import { toast } from 'sonner'

type Member = ListMembersResponse['members'][number]

interface MemberRowProps {
  workspaceId: string
  member: Member
  onRequestDeactivate: (member: Member) => void
  onRequestPause: (member: Member) => void
}

export function MemberRow(props: MemberRowProps) {
  const { member } = props
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
        <MemberRowActions {...props} />
      </TableCell>
    </TableRow>
  )
}

function MemberRowActions(props: MemberRowProps) {
  const { workspaceId, member, onRequestDeactivate, onRequestPause } = props
  const { updateMemberStatus, isPending: activating } = useUpdateMemberStatus(workspaceId, {
    onSuccess: () => toast.success('Member activated'),
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  function activate() {
    updateMemberStatus({ membershipId: member.membershipId, status: 'active' })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${member.userName}`}>
            <DotsThree weight="bold" />
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        {member.status === 'active' ? (
          <>
            <DropdownMenuItem onClick={() => onRequestPause(member)}>
              Pause journeys
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={() => onRequestDeactivate(member)}>
              Deactivate
            </DropdownMenuItem>
          </>
        ) : (
          <DropdownMenuItem disabled={activating} onClick={activate}>
            Activate
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

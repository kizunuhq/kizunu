import type { ListMembersResponse } from '@kizunu/api-contracts/workspace'
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@kizunu/web/components/primitives/table'
import { MemberRow } from '@kizunu/web/routes/_app/settings/-components/members/member-row'
import { DeactivateMemberDialog } from '@kizunu/web/routes/_app/settings/-dialogs/deactivate-member-dialog'
import { PauseOwnerJourneysDialog } from '@kizunu/web/routes/_app/settings/-dialogs/pause-owner-journeys-dialog'
import { useState } from 'react'

type Member = ListMembersResponse['members'][number]

interface MembersTableProps {
  workspaceId: string
  members: Member[]
}

export function MembersTable({ workspaceId, members }: MembersTableProps) {
  const [deactivating, setDeactivating] = useState<Member | null>(null)
  const [pausing, setPausing] = useState<Member | null>(null)

  return (
    <>
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
              workspaceId={workspaceId}
              member={member}
              onRequestDeactivate={setDeactivating}
              onRequestPause={setPausing}
            />
          ))}
        </TableBody>
      </Table>
      <DeactivateMemberDialog
        workspaceId={workspaceId}
        member={deactivating}
        onClose={() => setDeactivating(null)}
      />
      <PauseOwnerJourneysDialog
        workspaceId={workspaceId}
        member={pausing}
        onClose={() => setPausing(null)}
      />
    </>
  )
}

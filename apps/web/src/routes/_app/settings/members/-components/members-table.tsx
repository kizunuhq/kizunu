import { useMembers } from '@kizunu/api-client/workspace/use-members'
import type { ListMembersResponse } from '@kizunu/api-contracts/workspace'
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@kizunu/web/components/primitives/table'
import { MemberRow } from '@kizunu/web/routes/_app/settings/members/-components/member-row'
import { DeactivateMemberDialog } from '@kizunu/web/routes/_app/settings/members/-dialogs/deactivate-member-dialog'
import { PauseOwnerJourneysDialog } from '@kizunu/web/routes/_app/settings/members/-dialogs/pause-owner-journeys-dialog'
import { useState } from 'react'

type Member = ListMembersResponse['members'][number]

export function MembersTable({ workspaceId }: { workspaceId: string }) {
  const { data, isPending } = useMembers(workspaceId)
  const [deactivating, setDeactivating] = useState<Member | null>(null)
  const [pausing, setPausing] = useState<Member | null>(null)

  if (isPending) return <p className="text-muted-foreground text-sm">Loading…</p>

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
          {(data?.members ?? []).map((member) => (
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
        open={Boolean(deactivating)}
        onOpenChange={(next) => !next && setDeactivating(null)}
      />
      <PauseOwnerJourneysDialog
        workspaceId={workspaceId}
        member={pausing}
        open={Boolean(pausing)}
        onOpenChange={(next) => !next && setPausing(null)}
      />
    </>
  )
}

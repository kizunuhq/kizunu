import { useMemberConnectorIdentities } from '@kizunu/api-client/crm/use-member-connector-identities'
import type { MemberConnectorIdentity } from '@kizunu/api-contracts/crm'
import { Button } from '@kizunu/web/components/primitives/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@kizunu/web/components/primitives/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kizunu/web/components/primitives/table'
import { DeleteMemberIdentityDialog } from '@kizunu/web/routes/_app/settings/connectors/-dialogs/delete-member-identity-dialog'
import { DotsThree } from '@phosphor-icons/react'
import { useState } from 'react'

interface MemberIdentitiesTableProps {
  workspaceId: string
  connectorAccountId: string
}

export function MemberIdentitiesTable(props: MemberIdentitiesTableProps) {
  const { workspaceId, connectorAccountId } = props
  const { data, isPending } = useMemberConnectorIdentities(workspaceId, connectorAccountId)
  const [deleting, setDeleting] = useState<MemberConnectorIdentity | null>(null)

  if (isPending) return <p className="text-muted-foreground text-sm">Loading…</p>

  const items = data?.items ?? []
  if (items.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No member identities mapped yet. Add one to claim a Pipedrive user for a BDR.
      </p>
    )
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Member</TableHead>
            <TableHead>External id</TableHead>
            <TableHead>Source</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((identity) => {
            const label = `${identity.userName} → ${identity.externalId}`
            return (
              <TableRow key={identity.id}>
                <TableCell>
                  <div className="font-medium">{identity.userName}</div>
                  <div className="text-muted-foreground text-xs">{identity.userEmail}</div>
                </TableCell>
                <TableCell className="font-mono text-xs">{identity.externalId}</TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  {identity.createdBy}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${label}`}>
                          <DotsThree weight="bold" />
                        </Button>
                      }
                    />
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem variant="destructive" onClick={() => setDeleting(identity)}>
                        Remove identity
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
      <DeleteMemberIdentityDialog
        workspaceId={workspaceId}
        connectorAccountId={connectorAccountId}
        identity={deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
      />
    </>
  )
}

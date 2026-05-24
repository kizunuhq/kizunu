import { useCadences } from '@kizunu/api-client/cadence/use-cadences'
import { useEntryTriggers } from '@kizunu/api-client/engine/use-entry-triggers'
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
import { DeleteEntryTriggerDialog } from '@kizunu/web/routes/_app/settings/connectors/-dialogs/delete-entry-trigger-dialog'
import { DotsThree } from '@phosphor-icons/react'
import { useState } from 'react'

interface EntryTriggersTableProps {
  workspaceId: string
}

export function EntryTriggersTable({ workspaceId }: EntryTriggersTableProps) {
  const { data, isPending } = useEntryTriggers(workspaceId)
  const cadences = useCadences(workspaceId)
  const [deleting, setDeleting] = useState<{ id: string; label: string } | null>(null)

  if (isPending) return <p className="text-muted-foreground text-sm">Loading…</p>

  const cadenceNameById = new Map(
    (cadences.data?.cadences ?? []).map((cadence) => [cadence.id, cadence.name]),
  )

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Stage</TableHead>
            <TableHead>Cadence</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {(data?.entryTriggers ?? []).map((trigger) => {
            const cadenceName = cadenceNameById.get(trigger.cadenceId) ?? trigger.cadenceId
            const label = `stage ${trigger.stageId} → ${cadenceName}`
            return (
              <TableRow key={trigger.id}>
                <TableCell>{trigger.stageId}</TableCell>
                <TableCell>{cadenceName}</TableCell>
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
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => setDeleting({ id: trigger.id, label })}
                      >
                        Remove
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
      <DeleteEntryTriggerDialog
        workspaceId={workspaceId}
        trigger={deleting}
        open={Boolean(deleting)}
        onOpenChange={(next) => !next && setDeleting(null)}
      />
    </>
  )
}

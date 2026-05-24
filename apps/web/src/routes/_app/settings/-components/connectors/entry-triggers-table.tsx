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
import { DeleteEntryTriggerDialog } from '@kizunu/web/routes/_app/settings/-dialogs/delete-entry-trigger-dialog'
import { DotsThree } from '@phosphor-icons/react'
import { useState } from 'react'

interface EntryTriggersTableProps {
  workspaceId: string
}

export function EntryTriggersTable({ workspaceId }: EntryTriggersTableProps) {
  const { data, isPending } = useEntryTriggers(workspaceId)
  const [deleting, setDeleting] = useState<{ id: string; stageId: string } | null>(null)

  if (isPending) return <p className="text-muted-foreground text-sm">Loading…</p>

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
          {(data?.entryTriggers ?? []).map((trigger) => (
            <TableRow key={trigger.id}>
              <TableCell>{trigger.stageId}</TableCell>
              <TableCell className="font-mono text-xs">{trigger.cadenceId}</TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button variant="ghost" size="icon-sm" aria-label="Open trigger actions">
                        <DotsThree weight="bold" />
                      </Button>
                    }
                  />
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => setDeleting({ id: trigger.id, stageId: trigger.stageId })}
                    >
                      Remove
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <DeleteEntryTriggerDialog
        workspaceId={workspaceId}
        trigger={deleting}
        onClose={() => setDeleting(null)}
      />
    </>
  )
}

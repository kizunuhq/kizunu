import { useDeleteEntryTrigger } from '@kizunu/api-client/engine/use-delete-entry-trigger'
import { useEntryTriggers } from '@kizunu/api-client/engine/use-entry-triggers'
import { Button } from '@kizunu/web/components/primitives/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kizunu/web/components/primitives/table'

export function EntryTriggersTable({ workspaceId }: { workspaceId: string }) {
  const { data, isPending } = useEntryTriggers(workspaceId)
  const remove = useDeleteEntryTrigger(workspaceId)

  if (isPending) return <p className="text-muted-foreground text-sm">Loading…</p>

  return (
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
              <Button
                variant="outline"
                size="sm"
                disabled={remove.isPending}
                onClick={() => remove.mutate(trigger.id)}
              >
                Remove
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

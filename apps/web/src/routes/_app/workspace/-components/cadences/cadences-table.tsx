import { useCadences } from '@kizunu/api-client/cadence/use-cadences'
import { useDeleteCadence } from '@kizunu/api-client/cadence/use-delete-cadence'
import { Badge } from '@kizunu/web/components/primitives/badge'
import { Button } from '@kizunu/web/components/primitives/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kizunu/web/components/primitives/table'

export function CadencesTable({ workspaceId }: { workspaceId: string }) {
  const { data, isPending } = useCadences(workspaceId)
  const remove = useDeleteCadence(workspaceId)

  if (isPending) return <p className="text-muted-foreground text-sm">Loading…</p>

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Steps</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {(data?.cadences ?? []).map((cadence) => (
          <TableRow key={cadence.id}>
            <TableCell>{cadence.name}</TableCell>
            <TableCell>
              <Badge variant={cadence.status === 'active' ? 'default' : 'secondary'}>
                {cadence.status}
              </Badge>
            </TableCell>
            <TableCell>{cadence.stepCount}</TableCell>
            <TableCell className="text-right">
              <Button
                variant="outline"
                size="sm"
                disabled={remove.isPending}
                onClick={() => remove.deleteCadence(cadence.id)}
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

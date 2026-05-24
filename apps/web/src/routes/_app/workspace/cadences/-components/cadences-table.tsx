import { useCadences } from '@kizunu/api-client/cadence/use-cadences'
import { Badge } from '@kizunu/web/components/primitives/badge'
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
import { DeleteCadenceDialog } from '@kizunu/web/routes/_app/workspace/cadences/-dialogs/delete-cadence-dialog'
import { DotsThree } from '@phosphor-icons/react'
import { useState } from 'react'

interface CadenceRowData {
  id: string
  name: string
  status: 'active' | 'inactive'
  stepCount: number
}

export function CadencesTable({ workspaceId }: { workspaceId: string }) {
  const { data, isPending } = useCadences(workspaceId)
  const [deleting, setDeleting] = useState<{ id: string; name: string } | null>(null)

  if (isPending) return <p className="text-muted-foreground text-sm">Loading…</p>

  return (
    <>
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
            <CadenceRow
              key={cadence.id}
              cadence={cadence}
              onRequestRemove={() => setDeleting({ id: cadence.id, name: cadence.name })}
            />
          ))}
        </TableBody>
      </Table>
      <DeleteCadenceDialog
        workspaceId={workspaceId}
        cadence={deleting}
        open={Boolean(deleting)}
        onOpenChange={(next) => !next && setDeleting(null)}
      />
    </>
  )
}

interface CadenceRowProps {
  cadence: CadenceRowData
  onRequestRemove: () => void
}

function CadenceRow({ cadence, onRequestRemove }: CadenceRowProps) {
  return (
    <TableRow>
      <TableCell>{cadence.name}</TableCell>
      <TableCell>
        <Badge variant={cadence.status === 'active' ? 'default' : 'secondary'}>
          {cadence.status}
        </Badge>
      </TableCell>
      <TableCell>{cadence.stepCount}</TableCell>
      <TableCell className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${cadence.name}`}>
                <DotsThree weight="bold" />
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            <DropdownMenuItem variant="destructive" onClick={onRequestRemove}>
              Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
}

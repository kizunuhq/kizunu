import { useChannelHealth } from '@kizunu/api-client/channel/use-channel-health'
import { useWorkspaceChannels } from '@kizunu/api-client/channel/use-workspace-channels'
import { ResourceHealthPill } from '@kizunu/web/components/composed/resource-health-pill'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kizunu/web/components/primitives/table'

export function ChannelAccountsTable({ workspaceId }: { workspaceId: string }) {
  const { data, isPending } = useWorkspaceChannels(workspaceId)

  if (isPending) return <p className="text-muted-foreground text-sm">Loading…</p>

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Plugin</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {(data?.accounts ?? []).map((account) => (
          <TableRow key={account.id}>
            <TableCell>{account.name}</TableCell>
            <TableCell>{account.pluginId}</TableCell>
            <TableCell>
              <ChannelHealthCell workspaceId={workspaceId} accountId={account.id} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function ChannelHealthCell({ workspaceId, accountId }: { workspaceId: string; accountId: string }) {
  const { data, isPending, refetch } = useChannelHealth(workspaceId, accountId)
  return <ResourceHealthPill health={data} isPending={isPending} onRefresh={() => void refetch()} />
}

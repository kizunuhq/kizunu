import { useWorkspaceChannels } from '@kizunu/api-client/channel/use-workspace-channels'
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
        </TableRow>
      </TableHeader>
      <TableBody>
        {(data?.accounts ?? []).map((account) => (
          <TableRow key={account.id}>
            <TableCell>{account.name}</TableCell>
            <TableCell>{account.pluginId}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

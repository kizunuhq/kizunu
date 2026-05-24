import { useMyChannels } from '@kizunu/api-client/channel/use-my-channels'
import { useSetPrimaryChannel } from '@kizunu/api-client/channel/use-set-primary-channel'
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

export function MyChannelsTable() {
  const { data, isPending } = useMyChannels()
  const setPrimary = useSetPrimaryChannel()

  if (isPending) return <p className="text-muted-foreground text-sm">Loading…</p>

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Channel</TableHead>
          <TableHead>Plugin</TableHead>
          <TableHead>Primary</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {(data?.channels ?? []).map((channel) => (
          <TableRow key={channel.channelAccountId}>
            <TableCell>{channel.name}</TableCell>
            <TableCell>{channel.pluginId}</TableCell>
            <TableCell>{channel.isPrimary ? <Badge>Primary</Badge> : null}</TableCell>
            <TableCell className="text-right">
              {channel.isPrimary ? null : (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={setPrimary.isPending}
                  onClick={() => setPrimary.setPrimaryChannel(channel.channelAccountId)}
                >
                  Set primary
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

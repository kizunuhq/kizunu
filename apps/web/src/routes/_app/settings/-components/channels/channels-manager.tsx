import { Card, CardContent, CardHeader, CardTitle } from '@kizunu/web/components/primitives/card'
import { ChannelAccountsTable } from '@kizunu/web/routes/_app/settings/-components/channels/channel-accounts-table'

export function ChannelsManager({ workspaceId }: { workspaceId: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Channel accounts</CardTitle>
      </CardHeader>
      <CardContent>
        <ChannelAccountsTable workspaceId={workspaceId} />
      </CardContent>
    </Card>
  )
}

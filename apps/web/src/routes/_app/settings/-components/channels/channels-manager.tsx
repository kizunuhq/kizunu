import { Card, CardContent, CardHeader, CardTitle } from '@kizunu/web/components/primitives/card'
import { ChannelAccountForm } from '@kizunu/web/routes/_app/settings/-components/channels/channel-account-form'
import { ChannelAccountsTable } from '@kizunu/web/routes/_app/settings/-components/channels/channel-accounts-table'
import { GrantChannelAccessForm } from '@kizunu/web/routes/_app/settings/-components/channels/grant-channel-access-form'

export function ChannelsManager({ workspaceId }: { workspaceId: string }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Add channel account</CardTitle>
        </CardHeader>
        <CardContent>
          <ChannelAccountForm workspaceId={workspaceId} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Grant access</CardTitle>
        </CardHeader>
        <CardContent>
          <GrantChannelAccessForm workspaceId={workspaceId} />
        </CardContent>
      </Card>
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Channel accounts</CardTitle>
        </CardHeader>
        <CardContent>
          <ChannelAccountsTable workspaceId={workspaceId} />
        </CardContent>
      </Card>
    </div>
  )
}

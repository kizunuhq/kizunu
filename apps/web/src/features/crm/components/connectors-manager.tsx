import { Card, CardContent, CardHeader, CardTitle } from '@kizunu/web/components/primitives/card'
import { ConnectorAccountForm } from '@kizunu/web/features/crm/components/connector-account-form'
import { EntryTriggerForm } from '@kizunu/web/features/crm/components/entry-trigger-form'
import { EntryTriggersTable } from '@kizunu/web/features/crm/components/entry-triggers-table'

export function ConnectorsManager({ workspaceId }: { workspaceId: string }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Add CRM connector</CardTitle>
        </CardHeader>
        <CardContent>
          <ConnectorAccountForm workspaceId={workspaceId} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Add entry trigger</CardTitle>
        </CardHeader>
        <CardContent>
          <EntryTriggerForm workspaceId={workspaceId} />
        </CardContent>
      </Card>
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Entry triggers (stage → cadence)</CardTitle>
        </CardHeader>
        <CardContent>
          <EntryTriggersTable workspaceId={workspaceId} />
        </CardContent>
      </Card>
    </div>
  )
}

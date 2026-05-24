import { useCurrentUser } from '@kizunu/api-client/identity/use-current-user'
import { PageHeader } from '@kizunu/web/components/composed/page-header'
import { Button } from '@kizunu/web/components/primitives/button'
import { ConnectorsManager } from '@kizunu/web/routes/_app/settings/-components/connectors/connectors-manager'
import { CreateConnectorAccountDialog } from '@kizunu/web/routes/_app/settings/-dialogs/create-connector-account-dialog'
import { Plus } from '@phosphor-icons/react'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

export const Route = createFileRoute('/_app/settings/connectors')({
  component: ConnectorsPage,
})

function ConnectorsPage() {
  const { activeWorkspaceId } = useCurrentUser()
  const [createConnectorOpen, setCreateConnectorOpen] = useState(false)

  if (!activeWorkspaceId) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="CRM connectors" description="Map CRM stages to outbound cadences." />
        <p className="text-muted-foreground text-sm">No active workspace selected.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="CRM connectors"
        description="Map CRM stages to outbound cadences."
        actions={
          <Button onClick={() => setCreateConnectorOpen(true)}>
            <Plus weight="bold" />
            Add CRM connector
          </Button>
        }
      />
      <ConnectorsManager workspaceId={activeWorkspaceId} />
      <CreateConnectorAccountDialog
        workspaceId={activeWorkspaceId}
        open={createConnectorOpen}
        onOpenChange={setCreateConnectorOpen}
      />
    </div>
  )
}

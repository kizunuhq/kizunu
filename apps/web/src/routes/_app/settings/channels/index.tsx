import { useCurrentUser } from '@kizunu/api-client/identity/use-current-user'
import { PageHeader } from '@kizunu/web/components/composed/page-header'
import { Button } from '@kizunu/web/components/primitives/button'
import { Card, CardContent, CardHeader, CardTitle } from '@kizunu/web/components/primitives/card'
import { ChannelAccountsTable } from '@kizunu/web/routes/_app/settings/channels/-components/channel-accounts-table'
import { CreateChannelAccountDialog } from '@kizunu/web/routes/_app/settings/channels/-dialogs/create-channel-account-dialog'
import { GrantChannelAccessDialog } from '@kizunu/web/routes/_app/settings/channels/-dialogs/grant-channel-access-dialog'
import { Plus } from '@phosphor-icons/react'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

export const Route = createFileRoute('/_app/settings/channels/')({
  component: ChannelsPage,
})

function ChannelsPage() {
  const { activeWorkspaceId } = useCurrentUser()
  const [createOpen, setCreateOpen] = useState(false)
  const [grantOpen, setGrantOpen] = useState(false)

  if (!activeWorkspaceId) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Channels" description="Connect outbound channels for the workspace." />
        <p className="text-muted-foreground text-sm">No active workspace selected.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Channels"
        description="Connect outbound channels for the workspace."
        actions={
          <>
            <Button variant="outline" onClick={() => setGrantOpen(true)}>
              Grant access
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus weight="bold" />
              Add channel account
            </Button>
          </>
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>Channel accounts</CardTitle>
        </CardHeader>
        <CardContent>
          <ChannelAccountsTable workspaceId={activeWorkspaceId} />
        </CardContent>
      </Card>
      <CreateChannelAccountDialog
        workspaceId={activeWorkspaceId}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
      <GrantChannelAccessDialog
        workspaceId={activeWorkspaceId}
        open={grantOpen}
        onOpenChange={setGrantOpen}
      />
    </div>
  )
}

import { Button } from '@kizunu/web/components/primitives/button'
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@kizunu/web/components/primitives/card'
import { EntryTriggersTable } from '@kizunu/web/routes/_app/settings/connectors/-components/entry-triggers-table'
import { CreateEntryTriggerDialog } from '@kizunu/web/routes/_app/settings/connectors/-dialogs/create-entry-trigger-dialog'
import { Plus } from '@phosphor-icons/react'
import { useState } from 'react'

interface ConnectorsManagerProps {
  workspaceId: string
}

export function ConnectorsManager({ workspaceId }: ConnectorsManagerProps) {
  const [addTriggerOpen, setAddTriggerOpen] = useState(false)

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Entry triggers (stage → cadence)</CardTitle>
          <CardAction>
            <Button size="sm" variant="outline" onClick={() => setAddTriggerOpen(true)}>
              <Plus weight="bold" />
              Add entry trigger
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <EntryTriggersTable workspaceId={workspaceId} />
        </CardContent>
      </Card>
      <CreateEntryTriggerDialog
        workspaceId={workspaceId}
        open={addTriggerOpen}
        onOpenChange={setAddTriggerOpen}
      />
    </>
  )
}

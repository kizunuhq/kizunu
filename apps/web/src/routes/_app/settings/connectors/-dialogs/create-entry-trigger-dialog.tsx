import { useCreateEntryTrigger } from '@kizunu/api-client/engine/use-create-entry-trigger'
import type { CreateEntryTriggerRequest } from '@kizunu/api-contracts/engine'
import { ResourceDialog } from '@kizunu/web/components/composed/resource-dialog'
import { useMutationDialog } from '@kizunu/web/lib/use-mutation-dialog'
import { EntryTriggerForm } from '@kizunu/web/routes/_app/settings/connectors/-components/entry-trigger-form'
import { toast } from 'sonner'

interface CreateEntryTriggerDialogProps {
  workspaceId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

const FORM_ID = 'create-entry-trigger-form'

export function CreateEntryTriggerDialog(props: CreateEntryTriggerDialogProps) {
  const { workspaceId, open, onOpenChange } = props
  const dialog = useMutationDialog({ open, onOpenChange })

  const { createEntryTrigger, isPending } = useCreateEntryTrigger(workspaceId, {
    onSuccess: () => {
      toast.success('Entry trigger added')
      dialog.close()
    },
    onError: dialog.captureError,
  })

  function handleSubmit(values: CreateEntryTriggerRequest) {
    dialog.clearError()
    createEntryTrigger(values)
  }

  return (
    <ResourceDialog
      open={open}
      onOpenChange={dialog.handleOpenChange}
      title="Add entry trigger"
      description="Map a CRM stage to a cadence — leads landing in the stage enter the cadence."
      actionLabel="Add trigger"
      formId={FORM_ID}
      isPending={isPending}
    >
      <EntryTriggerForm
        formId={FORM_ID}
        workspaceId={workspaceId}
        isPending={isPending}
        error={dialog.error}
        onSubmit={handleSubmit}
      />
    </ResourceDialog>
  )
}

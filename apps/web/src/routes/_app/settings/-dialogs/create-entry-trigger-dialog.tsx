import { useCreateEntryTrigger } from '@kizunu/api-client/engine/use-create-entry-trigger'
import { ResourceDialog } from '@kizunu/web/components/composed/resource-dialog'
import { getApiErrorMessage } from '@kizunu/web/lib/get-api-error-message'
import {
  EntryTriggerForm,
  type EntryTriggerFormValues,
} from '@kizunu/web/routes/_app/settings/-components/connectors/entry-trigger-form'
import { useState } from 'react'
import { toast } from 'sonner'

interface CreateEntryTriggerDialogProps {
  workspaceId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

const FORM_ID = 'create-entry-trigger-form'

export function CreateEntryTriggerDialog(props: CreateEntryTriggerDialogProps) {
  const { workspaceId, open, onOpenChange } = props
  const [error, setError] = useState<string | null>(null)

  const { createEntryTrigger, isPending } = useCreateEntryTrigger(workspaceId, {
    onSuccess: () => {
      toast.success('Entry trigger added')
      onOpenChange(false)
    },
    onError: (err) => setError(getApiErrorMessage(err)),
  })

  function handleOpenChange(next: boolean) {
    if (!next) setError(null)
    onOpenChange(next)
  }

  function handleSubmit(values: EntryTriggerFormValues) {
    setError(null)
    createEntryTrigger(values)
  }

  return (
    <ResourceDialog
      open={open}
      onOpenChange={handleOpenChange}
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
        error={error}
        onSubmit={handleSubmit}
      />
    </ResourceDialog>
  )
}

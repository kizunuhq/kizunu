import { useDeleteEntryTrigger } from '@kizunu/api-client/engine/use-delete-entry-trigger'
import { DeleteResourceDialog } from '@kizunu/web/components/composed/delete-resource-dialog'
import { getApiErrorMessage } from '@kizunu/web/lib/get-api-error-message'
import { useState } from 'react'
import { toast } from 'sonner'

interface DeleteEntryTriggerDialogProps {
  workspaceId: string
  trigger: { id: string; stageId: string } | null
  onClose: () => void
}

export function DeleteEntryTriggerDialog(props: DeleteEntryTriggerDialogProps) {
  const { workspaceId, trigger, onClose } = props
  const [error, setError] = useState<string | null>(null)

  const { deleteEntryTrigger, isPending } = useDeleteEntryTrigger(workspaceId, {
    onSuccess: () => {
      toast.success('Entry trigger removed')
      onClose()
    },
    onError: (err) => setError(getApiErrorMessage(err)),
  })

  function handleOpenChange(next: boolean) {
    if (!next) {
      setError(null)
      onClose()
    }
  }

  function handleDelete() {
    if (!trigger) return
    setError(null)
    deleteEntryTrigger(trigger.id)
  }

  return (
    <DeleteResourceDialog
      open={Boolean(trigger)}
      onOpenChange={handleOpenChange}
      resourceType="entry trigger"
      resourceName={trigger ? `stage ${trigger.stageId}` : ''}
      onDelete={handleDelete}
      isDeleting={isPending}
      errorMessage={error}
    />
  )
}

import { useDeleteEntryTrigger } from '@kizunu/api-client/engine/use-delete-entry-trigger'
import { DeleteResourceDialog } from '@kizunu/web/components/composed/delete-resource-dialog'
import { useMutationDialog } from '@kizunu/web/lib/use-mutation-dialog'
import { toast } from 'sonner'

interface DeleteEntryTriggerDialogProps {
  workspaceId: string
  trigger: { id: string; label: string } | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeleteEntryTriggerDialog(props: DeleteEntryTriggerDialogProps) {
  const { workspaceId, trigger, open, onOpenChange } = props
  const dialog = useMutationDialog({ open, onOpenChange })

  const { deleteEntryTrigger, isPending } = useDeleteEntryTrigger(workspaceId, {
    onSuccess: () => {
      toast.success('Entry trigger removed')
      dialog.close()
    },
    onError: dialog.captureError,
  })

  function handleDelete() {
    if (!trigger) return
    dialog.clearError()
    deleteEntryTrigger(trigger.id)
  }

  return (
    <DeleteResourceDialog
      open={open}
      onOpenChange={dialog.handleOpenChange}
      resourceType="entry trigger"
      resourceName={trigger?.label ?? ''}
      onDelete={handleDelete}
      isDeleting={isPending}
      errorMessage={dialog.error}
    />
  )
}

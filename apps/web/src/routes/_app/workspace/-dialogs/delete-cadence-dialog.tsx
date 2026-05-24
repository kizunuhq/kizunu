import { useDeleteCadence } from '@kizunu/api-client/cadence/use-delete-cadence'
import { DeleteResourceDialog } from '@kizunu/web/components/composed/delete-resource-dialog'
import { useMutationDialog } from '@kizunu/web/lib/use-mutation-dialog'
import { toast } from 'sonner'

interface DeleteCadenceDialogProps {
  workspaceId: string
  cadence: { id: string; name: string } | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeleteCadenceDialog(props: DeleteCadenceDialogProps) {
  const { workspaceId, cadence, open, onOpenChange } = props
  const dialog = useMutationDialog({ open, onOpenChange })

  const { deleteCadence, isPending } = useDeleteCadence(workspaceId, {
    onSuccess: () => {
      toast.success('Cadence removed')
      dialog.close()
    },
    onError: dialog.captureError,
  })

  function handleDelete() {
    if (!cadence) return
    dialog.clearError()
    deleteCadence(cadence.id)
  }

  return (
    <DeleteResourceDialog
      open={open}
      onOpenChange={dialog.handleOpenChange}
      resourceType="cadence"
      resourceName={cadence?.name ?? ''}
      onDelete={handleDelete}
      isDeleting={isPending}
      errorMessage={dialog.error}
    />
  )
}

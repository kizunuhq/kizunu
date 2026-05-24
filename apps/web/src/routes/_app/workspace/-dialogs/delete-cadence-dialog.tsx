import { useDeleteCadence } from '@kizunu/api-client/cadence/use-delete-cadence'
import { DeleteResourceDialog } from '@kizunu/web/components/composed/delete-resource-dialog'
import { getApiErrorMessage } from '@kizunu/web/lib/get-api-error-message'
import { useState } from 'react'
import { toast } from 'sonner'

interface DeleteCadenceDialogProps {
  workspaceId: string
  cadence: { id: string; name: string } | null
  onClose: () => void
}

export function DeleteCadenceDialog({ workspaceId, cadence, onClose }: DeleteCadenceDialogProps) {
  const [error, setError] = useState<string | null>(null)

  const { deleteCadence, isPending } = useDeleteCadence(workspaceId, {
    onSuccess: () => {
      toast.success('Cadence removed')
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
    if (!cadence) return
    setError(null)
    deleteCadence(cadence.id)
  }

  return (
    <DeleteResourceDialog
      open={Boolean(cadence)}
      onOpenChange={handleOpenChange}
      resourceType="cadence"
      resourceName={cadence?.name ?? ''}
      onDelete={handleDelete}
      isDeleting={isPending}
      errorMessage={error}
    />
  )
}

import { useDeleteTemplate } from '@kizunu/api-client/cadence/use-delete-template'
import { DeleteResourceDialog } from '@kizunu/web/components/composed/delete-resource-dialog'
import { getApiErrorMessage } from '@kizunu/web/lib/get-api-error-message'
import { useState } from 'react'
import { toast } from 'sonner'

interface DeleteTemplateDialogProps {
  workspaceId: string
  template: { id: string; name: string } | null
  onClose: () => void
}

export function DeleteTemplateDialog(props: DeleteTemplateDialogProps) {
  const { workspaceId, template, onClose } = props
  const [error, setError] = useState<string | null>(null)

  const { deleteTemplate, isPending } = useDeleteTemplate(workspaceId, {
    onSuccess: () => {
      toast.success('Template removed')
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
    if (!template) return
    setError(null)
    deleteTemplate(template.id)
  }

  return (
    <DeleteResourceDialog
      open={Boolean(template)}
      onOpenChange={handleOpenChange}
      resourceType="template"
      resourceName={template?.name ?? ''}
      onDelete={handleDelete}
      isDeleting={isPending}
      errorMessage={error}
    />
  )
}

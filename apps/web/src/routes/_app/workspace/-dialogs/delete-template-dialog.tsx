import { useDeleteTemplate } from '@kizunu/api-client/cadence/use-delete-template'
import { DeleteResourceDialog } from '@kizunu/web/components/composed/delete-resource-dialog'
import { useMutationDialog } from '@kizunu/web/lib/use-mutation-dialog'
import { toast } from 'sonner'

interface DeleteTemplateDialogProps {
  workspaceId: string
  template: { id: string; name: string } | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeleteTemplateDialog(props: DeleteTemplateDialogProps) {
  const { workspaceId, template, open, onOpenChange } = props
  const dialog = useMutationDialog({ open, onOpenChange })

  const { deleteTemplate, isPending } = useDeleteTemplate(workspaceId, {
    onSuccess: () => {
      toast.success('Template removed')
      dialog.close()
    },
    onError: dialog.captureError,
  })

  function handleDelete() {
    if (!template) return
    dialog.clearError()
    deleteTemplate(template.id)
  }

  return (
    <DeleteResourceDialog
      open={open}
      onOpenChange={dialog.handleOpenChange}
      resourceType="template"
      resourceName={template?.name ?? ''}
      onDelete={handleDelete}
      isDeleting={isPending}
      errorMessage={dialog.error}
    />
  )
}

import { useCreateTemplate } from '@kizunu/api-client/cadence/use-create-template'
import type { CreateTemplateRequest } from '@kizunu/api-contracts/cadence'
import { ResourceDialog } from '@kizunu/web/components/composed/resource-dialog'
import { useMutationDialog } from '@kizunu/web/lib/use-mutation-dialog'
import { TemplateForm } from '@kizunu/web/routes/_app/workspace/cadences/-components/template-form'
import { toast } from 'sonner'

interface CreateTemplateDialogProps {
  workspaceId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

const FORM_ID = 'create-template-form'

export function CreateTemplateDialog(props: CreateTemplateDialogProps) {
  const { workspaceId, open, onOpenChange } = props
  const dialog = useMutationDialog({ open, onOpenChange })

  const { createTemplate, isPending } = useCreateTemplate(workspaceId, {
    onSuccess: () => {
      toast.success('Template added')
      dialog.close()
    },
    onError: dialog.captureError,
  })

  function handleSubmit(values: CreateTemplateRequest) {
    dialog.clearError()
    createTemplate(values)
  }

  return (
    <ResourceDialog
      open={open}
      onOpenChange={dialog.handleOpenChange}
      title="New template"
      description="HSM template reference — used as a cadence step."
      actionLabel="Add template"
      formId={FORM_ID}
      isPending={isPending}
      size="lg"
    >
      <TemplateForm
        formId={FORM_ID}
        workspaceId={workspaceId}
        isPending={isPending}
        error={dialog.error}
        onSubmit={handleSubmit}
      />
    </ResourceDialog>
  )
}

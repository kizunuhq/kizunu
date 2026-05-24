import { useCreateCadence } from '@kizunu/api-client/cadence/use-create-cadence'
import { ResourceDialog } from '@kizunu/web/components/composed/resource-dialog'
import { useMutationDialog } from '@kizunu/web/lib/use-mutation-dialog'
import {
  CadenceBuilder,
  type CadenceBuilderValues,
} from '@kizunu/web/routes/_app/workspace/-components/cadences/cadence-builder'
import { toast } from 'sonner'

interface CreateCadenceDialogProps {
  workspaceId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

const FORM_ID = 'create-cadence-form'

export function CreateCadenceDialog(props: CreateCadenceDialogProps) {
  const { workspaceId, open, onOpenChange } = props
  const dialog = useMutationDialog({ open, onOpenChange })

  const { createCadence, isPending } = useCreateCadence(workspaceId, {
    onSuccess: () => {
      toast.success('Cadence created')
      dialog.close()
    },
    onError: dialog.captureError,
  })

  function handleSubmit(values: CadenceBuilderValues) {
    dialog.clearError()
    createCadence(values)
  }

  return (
    <ResourceDialog
      open={open}
      onOpenChange={dialog.handleOpenChange}
      title="New cadence"
      description="Order steps, pick templates, set onReply actions."
      actionLabel="Create cadence"
      formId={FORM_ID}
      isPending={isPending}
      size="lg"
    >
      <CadenceBuilder
        formId={FORM_ID}
        workspaceId={workspaceId}
        isPending={isPending}
        error={dialog.error}
        onSubmit={handleSubmit}
      />
    </ResourceDialog>
  )
}

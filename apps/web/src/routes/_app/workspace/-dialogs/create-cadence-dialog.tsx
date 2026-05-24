import { useCreateCadence } from '@kizunu/api-client/cadence/use-create-cadence'
import { ResourceDialog } from '@kizunu/web/components/composed/resource-dialog'
import { getApiErrorMessage } from '@kizunu/web/lib/get-api-error-message'
import {
  CadenceBuilder,
  type CadenceBuilderValues,
} from '@kizunu/web/routes/_app/workspace/-components/cadences/cadence-builder'
import { useState } from 'react'
import { toast } from 'sonner'

interface CreateCadenceDialogProps {
  workspaceId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

const FORM_ID = 'create-cadence-form'

export function CreateCadenceDialog(props: CreateCadenceDialogProps) {
  const { workspaceId, open, onOpenChange } = props
  const [error, setError] = useState<string | null>(null)

  const { createCadence, isPending } = useCreateCadence(workspaceId, {
    onSuccess: () => {
      toast.success('Cadence created')
      onOpenChange(false)
    },
    onError: (err) => setError(getApiErrorMessage(err)),
  })

  function handleOpenChange(next: boolean) {
    if (!next) setError(null)
    onOpenChange(next)
  }

  function handleSubmit(values: CadenceBuilderValues) {
    setError(null)
    createCadence(values)
  }

  return (
    <ResourceDialog
      open={open}
      onOpenChange={handleOpenChange}
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
        error={error}
        onSubmit={handleSubmit}
      />
    </ResourceDialog>
  )
}

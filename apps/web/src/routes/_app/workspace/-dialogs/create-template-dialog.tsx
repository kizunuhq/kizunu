import { useCreateTemplate } from '@kizunu/api-client/cadence/use-create-template'
import { ResourceDialog } from '@kizunu/web/components/composed/resource-dialog'
import { getApiErrorMessage } from '@kizunu/web/lib/get-api-error-message'
import {
  TemplateForm,
  type TemplateFormValues,
} from '@kizunu/web/routes/_app/workspace/-components/cadences/template-form'
import { useState } from 'react'
import { toast } from 'sonner'

interface CreateTemplateDialogProps {
  workspaceId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

const FORM_ID = 'create-template-form'

export function CreateTemplateDialog(props: CreateTemplateDialogProps) {
  const { workspaceId, open, onOpenChange } = props
  const [error, setError] = useState<string | null>(null)

  const { createTemplate, isPending } = useCreateTemplate(workspaceId, {
    onSuccess: () => {
      toast.success('Template added')
      onOpenChange(false)
    },
    onError: (err) => setError(getApiErrorMessage(err)),
  })

  function handleOpenChange(next: boolean) {
    if (!next) setError(null)
    onOpenChange(next)
  }

  function handleSubmit(values: TemplateFormValues) {
    setError(null)
    createTemplate(values)
  }

  return (
    <ResourceDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="New template"
      description="HSM template reference — used as a cadence step."
      actionLabel="Add template"
      formId={FORM_ID}
      isPending={isPending}
      size="lg"
    >
      <TemplateForm formId={FORM_ID} isPending={isPending} error={error} onSubmit={handleSubmit} />
    </ResourceDialog>
  )
}

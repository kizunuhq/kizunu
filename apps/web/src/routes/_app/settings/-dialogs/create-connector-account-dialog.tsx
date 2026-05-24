import { useCreateConnectorAccount } from '@kizunu/api-client/crm/use-create-connector-account'
import { ResourceDialog } from '@kizunu/web/components/composed/resource-dialog'
import { getApiErrorMessage } from '@kizunu/web/lib/get-api-error-message'
import {
  ConnectorAccountForm,
  type ConnectorAccountFormValues,
} from '@kizunu/web/routes/_app/settings/-components/connectors/connector-account-form'
import { useState } from 'react'
import { toast } from 'sonner'

interface CreateConnectorAccountDialogProps {
  workspaceId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

const FORM_ID = 'create-connector-account-form'

export function CreateConnectorAccountDialog(props: CreateConnectorAccountDialogProps) {
  const { workspaceId, open, onOpenChange } = props
  const [error, setError] = useState<string | null>(null)

  const { createConnectorAccount, isPending } = useCreateConnectorAccount(workspaceId, {
    onSuccess: () => {
      toast.success('CRM connector added')
      onOpenChange(false)
    },
    onError: (err) => setError(getApiErrorMessage(err)),
  })

  function handleOpenChange(next: boolean) {
    if (!next) setError(null)
    onOpenChange(next)
  }

  function handleSubmit(values: ConnectorAccountFormValues) {
    setError(null)
    createConnectorAccount(values)
  }

  return (
    <ResourceDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Add CRM connector"
      description="Connect a CRM so its stage transitions can trigger cadences."
      actionLabel="Add connector"
      formId={FORM_ID}
      isPending={isPending}
      size="lg"
    >
      <ConnectorAccountForm
        formId={FORM_ID}
        isPending={isPending}
        error={error}
        onSubmit={handleSubmit}
      />
    </ResourceDialog>
  )
}

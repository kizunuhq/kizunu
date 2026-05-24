import { useCreateConnectorAccount } from '@kizunu/api-client/crm/use-create-connector-account'
import type { CreateConnectorAccountRequest } from '@kizunu/api-contracts/crm'
import { ResourceDialog } from '@kizunu/web/components/composed/resource-dialog'
import { useMutationDialog } from '@kizunu/web/lib/use-mutation-dialog'
import { ConnectorAccountForm } from '@kizunu/web/routes/_app/settings/connectors/-components/connector-account-form'
import { toast } from 'sonner'

interface CreateConnectorAccountDialogProps {
  workspaceId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

const FORM_ID = 'create-connector-account-form'

export function CreateConnectorAccountDialog(props: CreateConnectorAccountDialogProps) {
  const { workspaceId, open, onOpenChange } = props
  const dialog = useMutationDialog({ open, onOpenChange })

  const { createConnectorAccount, isPending } = useCreateConnectorAccount(workspaceId, {
    onSuccess: () => {
      toast.success('CRM connector added')
      dialog.close()
    },
    onError: dialog.captureError,
  })

  function handleSubmit(values: CreateConnectorAccountRequest) {
    dialog.clearError()
    createConnectorAccount(values)
  }

  return (
    <ResourceDialog
      open={open}
      onOpenChange={dialog.handleOpenChange}
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
        error={dialog.error}
        onSubmit={handleSubmit}
      />
    </ResourceDialog>
  )
}

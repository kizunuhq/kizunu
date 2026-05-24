import { useCreateMemberConnectorIdentity } from '@kizunu/api-client/crm/use-create-member-connector-identity'
import type { CreateMemberConnectorIdentityRequest } from '@kizunu/api-contracts/crm'
import { ResourceDialog } from '@kizunu/web/components/composed/resource-dialog'
import { useMutationDialog } from '@kizunu/web/lib/use-mutation-dialog'
import { MemberIdentityForm } from '@kizunu/web/routes/_app/settings/connectors/-components/member-identity-form'
import { toast } from 'sonner'

interface CreateMemberIdentityDialogProps {
  workspaceId: string
  connectorAccountId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

const FORM_ID = 'create-member-identity-form'

export function CreateMemberIdentityDialog(props: CreateMemberIdentityDialogProps) {
  const { workspaceId, connectorAccountId, open, onOpenChange } = props
  const dialog = useMutationDialog({ open, onOpenChange })

  const { createMemberConnectorIdentity, isPending } = useCreateMemberConnectorIdentity(
    workspaceId,
    connectorAccountId,
    {
      onSuccess: () => {
        toast.success('Member identity mapped')
        dialog.close()
      },
      onError: dialog.captureError,
    },
  )

  function handleSubmit(values: CreateMemberConnectorIdentityRequest) {
    dialog.clearError()
    createMemberConnectorIdentity(values)
  }

  return (
    <ResourceDialog
      open={open}
      onOpenChange={dialog.handleOpenChange}
      title="Add member identity"
      description="Map a workspace member to a Pipedrive user id so the dispatcher resolves the right channel."
      actionLabel="Add identity"
      formId={FORM_ID}
      isPending={isPending}
    >
      <MemberIdentityForm
        formId={FORM_ID}
        workspaceId={workspaceId}
        isPending={isPending}
        error={dialog.error}
        onSubmit={handleSubmit}
      />
    </ResourceDialog>
  )
}

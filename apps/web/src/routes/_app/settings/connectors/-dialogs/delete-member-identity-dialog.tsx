import { useDeleteMemberConnectorIdentity } from '@kizunu/api-client/crm/use-delete-member-connector-identity'
import type { MemberConnectorIdentity } from '@kizunu/api-contracts/crm'
import { DeleteResourceDialog } from '@kizunu/web/components/composed/delete-resource-dialog'
import { getApiErrorMessage } from '@kizunu/web/lib/get-api-error-message'
import { useState } from 'react'
import { toast } from 'sonner'

interface DeleteMemberIdentityDialogProps {
  workspaceId: string
  connectorAccountId: string
  identity: MemberConnectorIdentity | null
  onOpenChange: (open: boolean) => void
}

export function DeleteMemberIdentityDialog(props: DeleteMemberIdentityDialogProps) {
  const { workspaceId, connectorAccountId, identity, onOpenChange } = props
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const { deleteMemberConnectorIdentity, isPending } = useDeleteMemberConnectorIdentity(
    workspaceId,
    connectorAccountId,
    {
      onSuccess: () => {
        toast.success('Member identity removed')
        setErrorMessage(null)
        onOpenChange(false)
      },
      onError: (error) => setErrorMessage(getApiErrorMessage(error)),
    },
  )

  return (
    <DeleteResourceDialog
      open={Boolean(identity)}
      onOpenChange={(open) => {
        if (!open) setErrorMessage(null)
        onOpenChange(open)
      }}
      resourceType="member identity"
      resourceName={identity ? `${identity.userName} → ${identity.externalId}` : ''}
      onDelete={() => identity && deleteMemberConnectorIdentity({ identityId: identity.id })}
      isDeleting={isPending}
      errorMessage={errorMessage}
    />
  )
}

import { useUpdateMemberStatus } from '@kizunu/api-client/workspace/use-update-member-status'
import { FormError } from '@kizunu/web/components/composed/form-error'
import { ResourceDialog } from '@kizunu/web/components/composed/resource-dialog'
import { getApiErrorMessage } from '@kizunu/web/lib/get-api-error-message'
import { useState } from 'react'
import { toast } from 'sonner'

interface DeactivateMemberDialogProps {
  workspaceId: string
  member: { membershipId: string; userName: string } | null
  onClose: () => void
}

export function DeactivateMemberDialog(props: DeactivateMemberDialogProps) {
  const { workspaceId, member, onClose } = props
  const [error, setError] = useState<string | null>(null)

  const { updateMemberStatus, isPending } = useUpdateMemberStatus(workspaceId, {
    onSuccess: () => {
      toast.success('Member deactivated')
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

  function handleAction() {
    if (!member) return
    setError(null)
    updateMemberStatus({ membershipId: member.membershipId, status: 'inactive' })
  }

  return (
    <ResourceDialog
      open={Boolean(member)}
      onOpenChange={handleOpenChange}
      title={member ? `Deactivate ${member.userName}` : 'Deactivate member'}
      actionLabel="Deactivate"
      tone="destructive"
      isPending={isPending}
      onAction={handleAction}
    >
      <div className="space-y-3">
        {error && <FormError>{error}</FormError>}
        <p className="text-sm">
          {member?.userName ?? 'This member'} will no longer be able to sign in. You can activate
          them again at any time.
        </p>
      </div>
    </ResourceDialog>
  )
}

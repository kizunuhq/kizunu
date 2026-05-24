import { useUpdateMemberStatus } from '@kizunu/api-client/workspace/use-update-member-status'
import { FormError } from '@kizunu/web/components/composed/form-error'
import { ResourceDialog } from '@kizunu/web/components/composed/resource-dialog'
import { useMutationDialog } from '@kizunu/web/lib/use-mutation-dialog'
import { toast } from 'sonner'

interface DeactivateMemberDialogProps {
  workspaceId: string
  member: { membershipId: string; userName: string } | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeactivateMemberDialog(props: DeactivateMemberDialogProps) {
  const { workspaceId, member, open, onOpenChange } = props
  const dialog = useMutationDialog({ open, onOpenChange })

  const { updateMemberStatus, isPending } = useUpdateMemberStatus(workspaceId, {
    onSuccess: () => {
      toast.success('Member deactivated')
      dialog.close()
    },
    onError: dialog.captureError,
  })

  function handleAction() {
    if (!member) return
    dialog.clearError()
    updateMemberStatus({ membershipId: member.membershipId, status: 'inactive' })
  }

  return (
    <ResourceDialog
      open={open}
      onOpenChange={dialog.handleOpenChange}
      title={member ? `Deactivate ${member.userName}` : 'Deactivate member'}
      actionLabel="Deactivate"
      tone="destructive"
      isPending={isPending}
      onAction={handleAction}
    >
      <div className="space-y-3">
        {dialog.error && <FormError>{dialog.error}</FormError>}
        <p className="text-sm">
          {member?.userName ?? 'This member'} will no longer be able to sign in. You can activate
          them again at any time.
        </p>
      </div>
    </ResourceDialog>
  )
}

import { useRevokeOtherSessions } from '@kizunu/api-client/identity/use-revoke-other-sessions'
import { FormError } from '@kizunu/web/components/composed/form-error'
import { ResourceDialog } from '@kizunu/web/components/composed/resource-dialog'
import { useMutationDialog } from '@kizunu/web/lib/use-mutation-dialog'
import { toast } from 'sonner'

interface RevokeOtherSessionsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function RevokeOtherSessionsDialog(props: RevokeOtherSessionsDialogProps) {
  const { open, onOpenChange } = props
  const dialog = useMutationDialog({ open, onOpenChange })

  const { revokeOtherSessions, isPending } = useRevokeOtherSessions({
    onSuccess: () => {
      toast.success('Other sessions revoked')
      dialog.close()
    },
    onError: dialog.captureError,
  })

  function handleAction() {
    dialog.clearError()
    revokeOtherSessions()
  }

  return (
    <ResourceDialog
      open={open}
      onOpenChange={dialog.handleOpenChange}
      title="Log out other sessions"
      actionLabel="Log out other sessions"
      tone="destructive"
      isPending={isPending}
      onAction={handleAction}
    >
      <div className="space-y-3">
        {dialog.error && <FormError>{dialog.error}</FormError>}
        <p className="text-sm">
          Every session except this one will be revoked. You'll stay signed in here.
        </p>
      </div>
    </ResourceDialog>
  )
}

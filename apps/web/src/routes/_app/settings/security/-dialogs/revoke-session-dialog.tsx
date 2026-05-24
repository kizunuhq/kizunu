import { useRevokeSession } from '@kizunu/api-client/identity/use-revoke-session'
import type { SessionView } from '@kizunu/api-contracts/identity'
import { DeleteResourceDialog } from '@kizunu/web/components/composed/delete-resource-dialog'
import { useMutationDialog } from '@kizunu/web/lib/use-mutation-dialog'
import { toast } from 'sonner'

interface RevokeSessionDialogProps {
  session: SessionView | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function RevokeSessionDialog(props: RevokeSessionDialogProps) {
  const { session, open, onOpenChange } = props
  const dialog = useMutationDialog({ open, onOpenChange })

  const { revokeSession, isPending } = useRevokeSession({
    onSuccess: () => {
      toast.success('Session revoked')
      dialog.close()
    },
    onError: dialog.captureError,
  })

  function handleDelete() {
    if (!session) return
    dialog.clearError()
    revokeSession(session.id)
  }

  return (
    <DeleteResourceDialog
      open={open}
      onOpenChange={dialog.handleOpenChange}
      resourceType="session"
      resourceName={session?.userAgent ?? 'Unknown device'}
      onDelete={handleDelete}
      isDeleting={isPending}
      errorMessage={dialog.error}
    />
  )
}

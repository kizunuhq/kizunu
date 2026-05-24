import { useRevokeSession } from '@kizunu/api-client/identity/use-revoke-session'
import type { SessionView } from '@kizunu/api-contracts/identity'
import { DeleteResourceDialog } from '@kizunu/web/components/composed/delete-resource-dialog'
import { getApiErrorMessage } from '@kizunu/web/lib/get-api-error-message'
import { useState } from 'react'
import { toast } from 'sonner'

interface RevokeSessionDialogProps {
  session: SessionView | null
  onClose: () => void
}

export function RevokeSessionDialog({ session, onClose }: RevokeSessionDialogProps) {
  const [error, setError] = useState<string | null>(null)

  const { revokeSession, isPending } = useRevokeSession({
    onSuccess: () => {
      toast.success('Session revoked')
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

  function handleDelete() {
    if (!session) return
    setError(null)
    revokeSession(session.id)
  }

  return (
    <DeleteResourceDialog
      open={Boolean(session)}
      onOpenChange={handleOpenChange}
      resourceType="session"
      resourceName={session?.userAgent ?? 'Unknown device'}
      onDelete={handleDelete}
      isDeleting={isPending}
      errorMessage={error}
    />
  )
}

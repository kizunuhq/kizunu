import { useRevokeOtherSessions } from '@kizunu/api-client/identity/use-revoke-other-sessions'
import { FormError } from '@kizunu/web/components/composed/form-error'
import { ResourceDialog } from '@kizunu/web/components/composed/resource-dialog'
import { getApiErrorMessage } from '@kizunu/web/lib/get-api-error-message'
import { useState } from 'react'
import { toast } from 'sonner'

interface RevokeOtherSessionsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function RevokeOtherSessionsDialog(props: RevokeOtherSessionsDialogProps) {
  const { open, onOpenChange } = props
  const [error, setError] = useState<string | null>(null)

  const { revokeOtherSessions, isPending } = useRevokeOtherSessions({
    onSuccess: () => {
      toast.success('Other sessions revoked')
      onOpenChange(false)
    },
    onError: (err) => setError(getApiErrorMessage(err)),
  })

  function handleOpenChange(next: boolean) {
    if (!next) setError(null)
    onOpenChange(next)
  }

  return (
    <ResourceDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Log out other sessions"
      actionLabel="Log out other sessions"
      tone="destructive"
      isPending={isPending}
      onAction={() => {
        setError(null)
        revokeOtherSessions()
      }}
    >
      <div className="space-y-3">
        {error && <FormError>{error}</FormError>}
        <p className="text-sm">
          Every session except this one will be revoked. You'll stay signed in here.
        </p>
      </div>
    </ResourceDialog>
  )
}

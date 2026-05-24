import { usePauseOwnerJourneys } from '@kizunu/api-client/engine/use-pause-owner-journeys'
import { FormError } from '@kizunu/web/components/composed/form-error'
import { ResourceDialog } from '@kizunu/web/components/composed/resource-dialog'
import { getApiErrorMessage } from '@kizunu/web/lib/get-api-error-message'
import { useState } from 'react'
import { toast } from 'sonner'

interface PauseOwnerJourneysDialogProps {
  workspaceId: string
  member: { userId: string; userName: string } | null
  onClose: () => void
}

export function PauseOwnerJourneysDialog(props: PauseOwnerJourneysDialogProps) {
  const { workspaceId, member, onClose } = props
  const [error, setError] = useState<string | null>(null)

  const { pauseOwnerJourneys, isPending } = usePauseOwnerJourneys(workspaceId, {
    onSuccess: () => {
      toast.success("Paused this owner's running journeys.")
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
    pauseOwnerJourneys(member.userId)
  }

  return (
    <ResourceDialog
      open={Boolean(member)}
      onOpenChange={handleOpenChange}
      title={member ? `Pause ${member.userName}'s journeys` : 'Pause journeys'}
      actionLabel="Pause journeys"
      tone="destructive"
      isPending={isPending}
      onAction={handleAction}
    >
      <div className="space-y-3">
        {error && <FormError>{error}</FormError>}
        <p className="text-sm">
          Every running journey owned by {member?.userName ?? 'this member'} will be paused.
          Already-paused or completed journeys are unaffected.
        </p>
      </div>
    </ResourceDialog>
  )
}

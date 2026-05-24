import { usePauseOwnerJourneys } from '@kizunu/api-client/engine/use-pause-owner-journeys'
import { FormError } from '@kizunu/web/components/composed/form-error'
import { ResourceDialog } from '@kizunu/web/components/composed/resource-dialog'
import { useMutationDialog } from '@kizunu/web/lib/use-mutation-dialog'
import { toast } from 'sonner'

interface PauseOwnerJourneysDialogProps {
  workspaceId: string
  member: { userId: string; userName: string } | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PauseOwnerJourneysDialog(props: PauseOwnerJourneysDialogProps) {
  const { workspaceId, member, open, onOpenChange } = props
  const dialog = useMutationDialog({ open, onOpenChange })

  const { pauseOwnerJourneys, isPending } = usePauseOwnerJourneys(workspaceId, {
    onSuccess: () => {
      toast.success("Paused this owner's running journeys")
      dialog.close()
    },
    onError: dialog.captureError,
  })

  function handleAction() {
    if (!member) return
    dialog.clearError()
    pauseOwnerJourneys(member.userId)
  }

  return (
    <ResourceDialog
      open={open}
      onOpenChange={dialog.handleOpenChange}
      title={member ? `Pause ${member.userName}'s journeys` : 'Pause journeys'}
      actionLabel="Pause journeys"
      tone="destructive"
      isPending={isPending}
      onAction={handleAction}
    >
      <div className="space-y-3">
        {dialog.error && <FormError>{dialog.error}</FormError>}
        <p className="text-sm">
          Every running journey owned by {member?.userName ?? 'this member'} will be paused.
          Already-paused or completed journeys are unaffected.
        </p>
      </div>
    </ResourceDialog>
  )
}

import { useGrantChannelAccess } from '@kizunu/api-client/channel/use-grant-channel-access'
import { ResourceDialog } from '@kizunu/web/components/composed/resource-dialog'
import { useMutationDialog } from '@kizunu/web/lib/use-mutation-dialog'
import {
  GrantChannelAccessForm,
  type GrantChannelAccessFormValues,
} from '@kizunu/web/routes/_app/settings/-components/channels/grant-channel-access-form'
import { toast } from 'sonner'

interface GrantChannelAccessDialogProps {
  workspaceId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

const FORM_ID = 'grant-channel-access-form'

export function GrantChannelAccessDialog(props: GrantChannelAccessDialogProps) {
  const { workspaceId, open, onOpenChange } = props
  const dialog = useMutationDialog({ open, onOpenChange })

  const { grantChannelAccess, isPending } = useGrantChannelAccess(workspaceId, {
    onSuccess: () => {
      toast.success('Access granted')
      dialog.close()
    },
    onError: dialog.captureError,
  })

  function handleSubmit(values: GrantChannelAccessFormValues) {
    dialog.clearError()
    grantChannelAccess(values)
  }

  return (
    <ResourceDialog
      open={open}
      onOpenChange={dialog.handleOpenChange}
      title="Grant channel access"
      description="Let a workspace member send through a channel account."
      actionLabel="Grant access"
      formId={FORM_ID}
      isPending={isPending}
    >
      <GrantChannelAccessForm
        formId={FORM_ID}
        workspaceId={workspaceId}
        isPending={isPending}
        error={dialog.error}
        onSubmit={handleSubmit}
      />
    </ResourceDialog>
  )
}

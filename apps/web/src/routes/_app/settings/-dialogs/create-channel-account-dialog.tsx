import { useCreateChannelAccount } from '@kizunu/api-client/channel/use-create-channel-account'
import { ResourceDialog } from '@kizunu/web/components/composed/resource-dialog'
import { useMutationDialog } from '@kizunu/web/lib/use-mutation-dialog'
import {
  ChannelAccountForm,
  type ChannelAccountFormValues,
} from '@kizunu/web/routes/_app/settings/-components/channels/channel-account-form'
import { toast } from 'sonner'

interface CreateChannelAccountDialogProps {
  workspaceId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

const FORM_ID = 'create-channel-account-form'

export function CreateChannelAccountDialog(props: CreateChannelAccountDialogProps) {
  const { workspaceId, open, onOpenChange } = props
  const dialog = useMutationDialog({ open, onOpenChange })

  const { createChannelAccount, isPending } = useCreateChannelAccount(workspaceId, {
    onSuccess: () => {
      toast.success('Channel account added')
      dialog.close()
    },
    onError: dialog.captureError,
  })

  function handleSubmit(values: ChannelAccountFormValues) {
    dialog.clearError()
    createChannelAccount(values)
  }

  return (
    <ResourceDialog
      open={open}
      onOpenChange={dialog.handleOpenChange}
      title="Add channel account"
      description="Connect an outbound channel provider for this workspace."
      actionLabel="Add channel account"
      formId={FORM_ID}
      isPending={isPending}
      size="lg"
    >
      <ChannelAccountForm
        formId={FORM_ID}
        isPending={isPending}
        error={dialog.error}
        onSubmit={handleSubmit}
      />
    </ResourceDialog>
  )
}

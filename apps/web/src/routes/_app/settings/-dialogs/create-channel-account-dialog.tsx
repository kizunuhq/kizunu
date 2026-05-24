import { useCreateChannelAccount } from '@kizunu/api-client/channel/use-create-channel-account'
import { ResourceDialog } from '@kizunu/web/components/composed/resource-dialog'
import { getApiErrorMessage } from '@kizunu/web/lib/get-api-error-message'
import {
  ChannelAccountForm,
  type ChannelAccountFormValues,
} from '@kizunu/web/routes/_app/settings/-components/channels/channel-account-form'
import { useState } from 'react'
import { toast } from 'sonner'

interface CreateChannelAccountDialogProps {
  workspaceId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

const FORM_ID = 'create-channel-account-form'

export function CreateChannelAccountDialog(props: CreateChannelAccountDialogProps) {
  const { workspaceId, open, onOpenChange } = props
  const [error, setError] = useState<string | null>(null)

  const { createChannelAccount, isPending } = useCreateChannelAccount(workspaceId, {
    onSuccess: () => {
      toast.success('Channel account added')
      onOpenChange(false)
    },
    onError: (err) => setError(getApiErrorMessage(err)),
  })

  function handleOpenChange(next: boolean) {
    if (!next) setError(null)
    onOpenChange(next)
  }

  function handleSubmit(values: ChannelAccountFormValues) {
    setError(null)
    createChannelAccount(values)
  }

  return (
    <ResourceDialog
      open={open}
      onOpenChange={handleOpenChange}
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
        error={error}
        onSubmit={handleSubmit}
      />
    </ResourceDialog>
  )
}

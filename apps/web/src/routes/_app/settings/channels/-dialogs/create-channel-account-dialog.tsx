import { useCreateChannelAccount } from '@kizunu/api-client/channel/use-create-channel-account'
import type { CreateChannelAccountRequest } from '@kizunu/api-contracts/channel'
import { ResourceDialog } from '@kizunu/web/components/composed/resource-dialog'
import { useMutationDialog } from '@kizunu/web/lib/use-mutation-dialog'
import { ChannelAccountForm } from '@kizunu/web/routes/_app/settings/channels/-components/channel-account-form'
import { useState } from 'react'
import { toast } from 'sonner'

interface CreateChannelAccountDialogProps {
  workspaceId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  preselectedPluginId?: string
}

const FORM_ID = 'create-channel-account-form'

export function CreateChannelAccountDialog(props: CreateChannelAccountDialogProps) {
  const { workspaceId, open, onOpenChange, preselectedPluginId } = props
  const dialog = useMutationDialog({ open, onOpenChange })
  const [selectedKind, setSelectedKind] = useState<'credentials' | 'oauth' | undefined>(undefined)

  const { createChannelAccount, isPending } = useCreateChannelAccount(workspaceId, {
    onSuccess: () => {
      toast.success('Channel account added')
      dialog.close()
    },
    onError: dialog.captureError,
  })

  function handleSubmit(values: CreateChannelAccountRequest) {
    dialog.clearError()
    createChannelAccount(values)
  }

  function handleOauthSuccess() {
    toast.success('Channel account added')
    dialog.close()
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
      hideAction={selectedKind === 'oauth'}
      size="lg"
    >
      <ChannelAccountForm
        formId={FORM_ID}
        workspaceId={workspaceId}
        isPending={isPending}
        error={dialog.error}
        preselectedPluginId={preselectedPluginId}
        onSubmit={handleSubmit}
        onOauthSuccess={handleOauthSuccess}
        onOauthError={dialog.captureError}
        onPluginKindChange={setSelectedKind}
      />
    </ResourceDialog>
  )
}

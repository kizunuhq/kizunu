import { useGrantChannelAccess } from '@kizunu/api-client/channel/use-grant-channel-access'
import { ResourceDialog } from '@kizunu/web/components/composed/resource-dialog'
import { getApiErrorMessage } from '@kizunu/web/lib/get-api-error-message'
import {
  GrantChannelAccessForm,
  type GrantChannelAccessFormValues,
} from '@kizunu/web/routes/_app/settings/-components/channels/grant-channel-access-form'
import { useState } from 'react'
import { toast } from 'sonner'

interface GrantChannelAccessDialogProps {
  workspaceId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

const FORM_ID = 'grant-channel-access-form'

export function GrantChannelAccessDialog(props: GrantChannelAccessDialogProps) {
  const { workspaceId, open, onOpenChange } = props
  const [error, setError] = useState<string | null>(null)

  const { grantChannelAccess, isPending } = useGrantChannelAccess(workspaceId, {
    onSuccess: () => {
      toast.success('Access granted')
      onOpenChange(false)
    },
    onError: (err) => setError(getApiErrorMessage(err)),
  })

  function handleOpenChange(next: boolean) {
    if (!next) setError(null)
    onOpenChange(next)
  }

  function handleSubmit(values: GrantChannelAccessFormValues) {
    setError(null)
    grantChannelAccess(values)
  }

  return (
    <ResourceDialog
      open={open}
      onOpenChange={handleOpenChange}
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
        error={error}
        onSubmit={handleSubmit}
      />
    </ResourceDialog>
  )
}

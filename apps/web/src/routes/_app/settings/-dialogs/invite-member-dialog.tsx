import { useInviteMember } from '@kizunu/api-client/workspace/use-invite-member'
import type { InviteMemberResponse } from '@kizunu/api-contracts/workspace'
import { ResourceDialog } from '@kizunu/web/components/composed/resource-dialog'
import { useMutationDialog } from '@kizunu/web/lib/use-mutation-dialog'
import {
  InviteMemberForm,
  type InviteMemberFormValues,
} from '@kizunu/web/routes/_app/settings/-components/members/invite-member-form'
import { toast } from 'sonner'

interface InviteMemberDialogProps {
  workspaceId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onInvited: (result: InviteMemberResponse) => void
}

const FORM_ID = 'invite-member-form'

export function InviteMemberDialog(props: InviteMemberDialogProps) {
  const { workspaceId, open, onOpenChange, onInvited } = props
  const dialog = useMutationDialog({ open, onOpenChange })

  const { inviteMember, isPending } = useInviteMember(workspaceId, {
    onSuccess: (result) => {
      toast.success('Invitation created — share the token below')
      onInvited(result)
      dialog.close()
    },
    onError: dialog.captureError,
  })

  function handleSubmit(values: InviteMemberFormValues) {
    dialog.clearError()
    inviteMember(values)
  }

  return (
    <ResourceDialog
      open={open}
      onOpenChange={dialog.handleOpenChange}
      title="Invite member"
      description="Send an invitation token your teammate can redeem to join this workspace."
      actionLabel="Send invite"
      formId={FORM_ID}
      isPending={isPending}
    >
      <InviteMemberForm
        formId={FORM_ID}
        isPending={isPending}
        error={dialog.error}
        onSubmit={handleSubmit}
      />
    </ResourceDialog>
  )
}

import { useInviteMember } from '@kizunu/api-client/workspace/use-invite-member'
import type { InviteMemberResponse } from '@kizunu/api-contracts/workspace'
import { ResourceDialog } from '@kizunu/web/components/composed/resource-dialog'
import { Button } from '@kizunu/web/components/primitives/button'
import { getApiErrorMessage } from '@kizunu/web/lib/get-api-error-message'
import {
  InviteMemberForm,
  type InviteMemberFormValues,
} from '@kizunu/web/routes/_app/settings/-components/members/invite-member-form'
import { Check, Copy } from '@phosphor-icons/react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'

interface InviteMemberDialogProps {
  workspaceId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

const FORM_ID = 'invite-member-form'
const COPY_FLIP_MS = 1500

export function InviteMemberDialog(props: InviteMemberDialogProps) {
  const { workspaceId, open, onOpenChange } = props
  const [error, setError] = useState<string | null>(null)
  const [lastResult, setLastResult] = useState<InviteMemberResponse | null>(null)

  useEffect(() => {
    if (!open) {
      setError(null)
      setLastResult(null)
    }
  }, [open])

  const { inviteMember, isPending } = useInviteMember(workspaceId, {
    onSuccess: (result) => {
      setLastResult(result)
      toast.success('Invitation created — share the token below')
    },
    onError: (err) => setError(getApiErrorMessage(err)),
  })

  function handleSubmit(values: InviteMemberFormValues) {
    setError(null)
    inviteMember(values)
  }

  if (lastResult) {
    return (
      <InvitationSuccessDialog
        open={open}
        onOpenChange={onOpenChange}
        token={lastResult.invitationToken}
        onSendAnother={() => setLastResult(null)}
      />
    )
  }

  return (
    <ResourceDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Invite member"
      description="Send an invitation token your teammate can redeem to join this workspace."
      actionLabel="Send invite"
      formId={FORM_ID}
      isPending={isPending}
    >
      <InviteMemberForm
        formId={FORM_ID}
        isPending={isPending}
        error={error}
        onSubmit={handleSubmit}
      />
    </ResourceDialog>
  )
}

interface InvitationSuccessDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  token: string
  onSendAnother: () => void
}

function InvitationSuccessDialog(props: InvitationSuccessDialogProps) {
  const { open, onOpenChange, token, onSendAnother } = props
  return (
    <ResourceDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Invitation created"
      description="Share this token with your teammate — it works only once and expires soon."
      actionLabel="Send another"
      cancelLabel="Done"
      onAction={onSendAnother}
    >
      <InvitationTokenReveal token={token} />
    </ResourceDialog>
  )
}

function InvitationTokenReveal({ token }: { token: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(token)
    setCopied(true)
    setTimeout(() => setCopied(false), COPY_FLIP_MS)
  }, [token])

  return (
    <div className="flex flex-col gap-3">
      <code className="bg-muted text-foreground rounded-md px-3 py-2 font-mono text-xs break-all">
        {token}
      </code>
      <Button variant="outline" size="sm" onClick={handleCopy} className="self-start">
        {copied ? <Check weight="bold" /> : <Copy weight="bold" />}
        {copied ? 'Copied' : 'Copy token'}
      </Button>
    </div>
  )
}

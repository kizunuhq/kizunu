import { ResourceDialog } from '@kizunu/web/components/composed/resource-dialog'
import { Button } from '@kizunu/web/components/primitives/button'
import { useCopyToClipboard } from '@kizunu/web/lib/use-copy-to-clipboard'
import { Check, Copy } from '@phosphor-icons/react'

interface InvitationTokenDialogProps {
  token: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function InvitationTokenDialog(props: InvitationTokenDialogProps) {
  const { token, open, onOpenChange } = props

  return (
    <ResourceDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Invitation created"
      description="Share this token with your teammate — it works only once and expires soon."
      actionLabel="Done"
      cancelLabel="Close"
      onAction={() => onOpenChange(false)}
    >
      {token && <InvitationTokenReveal token={token} />}
    </ResourceDialog>
  )
}

function InvitationTokenReveal({ token }: { token: string }) {
  const { copied, copy } = useCopyToClipboard(token)

  return (
    <div className="flex flex-col gap-3">
      <code className="bg-muted text-foreground rounded-md px-3 py-2 font-mono text-xs break-all">
        {token}
      </code>
      <Button variant="outline" size="sm" onClick={copy} className="self-start">
        {copied ? <Check weight="bold" /> : <Copy weight="bold" />}
        {copied ? 'Copied' : 'Copy token'}
      </Button>
    </div>
  )
}

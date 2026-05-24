import { Button } from '@kizunu/web/components/primitives/button'
import { lookupOAuthErrorCopy } from '@kizunu/web/routes/auth/-utils/oauth-error-copy'
import { X } from '@phosphor-icons/react'

interface OAuthErrorAlertProps {
  code: string
  onDismiss: () => void
}

export function OAuthErrorAlert({ code, onDismiss }: OAuthErrorAlertProps) {
  const copy = lookupOAuthErrorCopy(code)
  return (
    <div
      role="alert"
      className="border-destructive/40 text-destructive flex items-start justify-between gap-3 rounded-[2px] border p-3"
    >
      <div className="flex flex-col gap-0.5">
        <p className="text-sm font-medium">{copy.title}</p>
        <p className="text-foreground/80 text-sm">{copy.body}</p>
      </div>
      <Button type="button" variant="ghost" size="icon-sm" aria-label="Dismiss" onClick={onDismiss}>
        <X />
      </Button>
    </div>
  )
}

import { useResendEmailVerification } from '@kizunu/api-client/identity/use-resend-email-verification'
import { Button } from '@kizunu/web/components/primitives/button'
import { getApiErrorMessage } from '@kizunu/web/lib/get-api-error-message'
import { toast } from 'sonner'

export function EmailRowAction({ isVerified }: { isVerified: boolean }) {
  const resend = useResendEmailVerification({
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  if (isVerified) {
    return (
      <span className="text-kizunu-green inline-flex items-center gap-1 font-mono text-xs">
        <span className="bg-kizunu-green inline-block size-1.5 rounded-full" />
        Verified
      </span>
    )
  }

  const label = resend.isSuccess ? 'Sent' : resend.isPending ? 'Sending…' : 'Resend email'

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={resend.isPending || resend.isSuccess}
      onClick={() => resend.resendEmailVerification()}
    >
      {label}
    </Button>
  )
}

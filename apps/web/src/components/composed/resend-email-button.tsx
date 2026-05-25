import { useResendEmailVerification } from '@kizunu/api-client/identity/use-resend-email-verification'
import { Button } from '@kizunu/web/components/primitives/button'
import { getApiErrorMessage } from '@kizunu/web/lib/get-api-error-message'
import { toast } from 'sonner'

export function ResendEmailButton({ size = 'sm' }: { size?: 'sm' | 'default' }) {
  const resend = useResendEmailVerification({
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })
  const label = resend.isSuccess ? 'Sent' : resend.isPending ? 'Sending…' : 'Resend email'
  return (
    <Button
      variant="outline"
      size={size}
      disabled={resend.isPending || resend.isSuccess}
      onClick={() => resend.resendEmailVerification()}
    >
      {label}
    </Button>
  )
}

import { useCurrentUser } from '@kizunu/api-client/identity/use-current-user'
import { useResendEmailVerification } from '@kizunu/api-client/identity/use-resend-email-verification'
import { Button, buttonVariants } from '@kizunu/web/components/primitives/button'
import { getApiErrorMessage } from '@kizunu/web/lib/get-api-error-message'
import { Link } from '@tanstack/react-router'
import { toast } from 'sonner'

export function VerifyErrorActions() {
  const { user, isPending: isUserPending } = useCurrentUser()
  const resend = useResendEmailVerification({
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  if (isUserPending) return null

  if (!user) {
    return (
      <Link to="/auth/login" className={buttonVariants({ variant: 'outline' })}>
        Back to sign in
      </Link>
    )
  }

  const label = resend.isSuccess ? 'Sent' : resend.isPending ? 'Sending…' : 'Resend email'

  return (
    <Button
      variant="outline"
      disabled={resend.isPending || resend.isSuccess}
      onClick={() => resend.resendEmailVerification()}
    >
      {label}
    </Button>
  )
}

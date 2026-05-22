import { useCurrentUser } from '@kizunu/api-client/identity/use-current-user'
import { useResendEmailVerification } from '@kizunu/api-client/identity/use-resend-email-verification'
import { Button } from '@kizunu/web/components/primitives/button'

export function EmailVerificationBanner() {
  const { user } = useCurrentUser()
  const resend = useResendEmailVerification()

  if (!user || user.emailVerifiedAt) return null

  return (
    <div className="bg-muted text-muted-foreground flex items-center justify-between gap-4 border-b px-6 py-2 text-sm">
      <span>
        {resend.isSuccess
          ? 'Verification email sent. Check your inbox.'
          : 'Verify your email address to secure your account.'}
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={resend.isPending || resend.isSuccess}
        onClick={() => resend.mutate()}
      >
        {resend.isPending ? 'Sending…' : 'Resend email'}
      </Button>
    </div>
  )
}

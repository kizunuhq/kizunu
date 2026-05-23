import { useCurrentUser } from '@kizunu/api-client/identity/use-current-user'
import { useResendEmailVerification } from '@kizunu/api-client/identity/use-resend-email-verification'
import { Button } from '@kizunu/web/components/primitives/button'
import { Link } from '@tanstack/react-router'

export function EmailVerificationBanner() {
  const { user } = useCurrentUser()
  const resend = useResendEmailVerification()

  if (!user || user.emailVerifiedAt) return null

  return (
    <div className="bg-muted text-muted-foreground border-border flex flex-wrap items-center justify-between gap-3 border-b border-dashed px-6 py-2 text-sm">
      <div className="flex flex-wrap items-center gap-3">
        <span>
          {resend.isSuccess
            ? 'Verification email sent. Check your inbox.'
            : 'Verify your email address to secure your account.'}
        </span>
        <Link
          to="/auth/verify-email"
          search={{ token: '' }}
          className="hover:text-foreground underline-offset-2 hover:underline"
        >
          Open verify page
        </Link>
        <Link
          to="/settings/profile"
          className="hover:text-foreground underline-offset-2 hover:underline"
        >
          Change email
        </Link>
      </div>
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

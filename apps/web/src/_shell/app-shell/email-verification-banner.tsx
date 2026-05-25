import { useCurrentUser } from '@kizunu/api-client/identity/use-current-user'
import { ResendEmailButton } from '@kizunu/web/components/composed/resend-email-button'
import { Link } from '@tanstack/react-router'

export function EmailVerificationBanner() {
  const { user } = useCurrentUser()

  if (!user || user.emailVerifiedAt) return null

  return (
    <div className="bg-background-100 text-muted-foreground border-border flex flex-wrap items-center justify-between gap-3 border-b border-dashed px-4 py-2 text-sm md:px-6">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="text-foreground font-medium">Verify your email</span>
        <span>Confirm your address to secure your account.</span>
        <Link
          to="/settings/profile"
          className="hover:text-foreground underline-offset-2 hover:underline"
        >
          Change email
        </Link>
      </div>
      <ResendEmailButton />
    </div>
  )
}

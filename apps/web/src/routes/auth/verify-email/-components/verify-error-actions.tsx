import { useCurrentUser } from '@kizunu/api-client/identity/use-current-user'
import { ResendEmailButton } from '@kizunu/web/components/composed/resend-email-button'
import { buttonVariants } from '@kizunu/web/components/primitives/button'
import { Link } from '@tanstack/react-router'

export function VerifyErrorActions() {
  const { user, isPending } = useCurrentUser()

  if (isPending) return null

  if (!user) {
    return (
      <Link to="/auth/login" className={buttonVariants({ variant: 'outline' })}>
        Back to sign in
      </Link>
    )
  }

  return <ResendEmailButton size="default" />
}

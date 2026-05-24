import { PageHeader } from '@kizunu/web/components/composed/page-header'
import { buttonVariants } from '@kizunu/web/components/primitives/button'
import { Link } from '@tanstack/react-router'

export function RegistrationDisabledNotice() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Registration disabled"
        description="Public sign-up is turned off for this instance."
      />
      <p className="text-muted-foreground text-sm">
        Ask an administrator for an invitation, or sign in if you already have an account.
      </p>
      <Link to="/auth/login" className={buttonVariants({ variant: 'outline' })}>
        Sign in
      </Link>
    </div>
  )
}

import { useCurrentUser } from '@kizunu/api-client/identity/use-current-user'
import { PageHeader } from '@kizunu/web/components/composed/page-header'
import { buttonVariants } from '@kizunu/web/components/primitives/button'
import { ResetPasswordForm } from '@kizunu/web/routes/auth/-components/reset-password-form'
import { createFileRoute, Link, Navigate } from '@tanstack/react-router'

const MAX_TOKEN_LENGTH = 512

export const Route = createFileRoute('/auth/reset-password')({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === 'string' ? search.token : '',
  }),
  component: ResetPasswordPage,
})

function ResetPasswordPage() {
  const { user, isPending } = useCurrentUser()
  const { token } = Route.useSearch()

  if (isPending) return null
  if (user) return <Navigate replace to="/workspace" />

  if (!token || token.length > MAX_TOKEN_LENGTH) return <ResetPasswordInvalidToken />

  return <ResetPasswordForm token={token} />
}

function ResetPasswordInvalidToken() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Reset link invalid"
        description="This reset link is missing or malformed. Request a new one."
      />
      <Link to="/auth/forgot-password" className={buttonVariants()}>
        Request a new link
      </Link>
    </div>
  )
}

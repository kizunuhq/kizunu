import { useCurrentUser } from '@kizunu/api-client/identity/use-current-user'
import { useResetPassword } from '@kizunu/api-client/identity/use-reset-password'
import { PageHeader } from '@kizunu/web/components/composed/page-header'
import { Button, buttonVariants } from '@kizunu/web/components/primitives/button'
import { mapLoginError } from '@kizunu/web/routes/auth/-utils/login-error-copy'
import { ResetPasswordForm } from '@kizunu/web/routes/auth/reset-password/-components/reset-password-form'
import { createFileRoute, Link, Navigate } from '@tanstack/react-router'

const MAX_TOKEN_LENGTH = 512
const FORM_ID = 'reset-password-form'

export const Route = createFileRoute('/auth/reset-password/')({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === 'string' ? search.token : '',
  }),
  component: ResetPasswordPage,
})

function ResetPasswordPage() {
  const { user, isPending } = useCurrentUser()
  const { token } = Route.useSearch()
  const reset = useResetPassword()

  if (isPending) return null
  if (user) return <Navigate replace to="/workspace" />
  if (!token || token.length > MAX_TOKEN_LENGTH) return <ResetPasswordInvalidToken />
  if (reset.isSuccess) return <ResetPasswordSuccess />
  if (reset.isError && reset.error.code === 'identity.invalid-reset-token') {
    return <ResetPasswordInvalidLink />
  }

  const apiErrorMessage = reset.isError
    ? (mapLoginError(reset.error)?.message ?? reset.error.message)
    : null

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Set a new password"
        description="Choose a password at least 8 characters long."
      />
      <ResetPasswordForm
        formId={FORM_ID}
        isPending={reset.isPending}
        error={apiErrorMessage}
        onSubmit={({ password }) => reset.resetPassword({ token, password })}
      />
      <Button form={FORM_ID} type="submit" loading={reset.isPending}>
        Save new password
      </Button>
    </div>
  )
}

function ResetPasswordSuccess() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Password updated"
        description="Sign in with your new password to continue."
      />
      <Link to="/auth/login" className={buttonVariants()}>
        Sign in
      </Link>
    </div>
  )
}

function ResetPasswordInvalidLink() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Reset link expired"
        description="This reset link is invalid or has expired. Request a new one."
      />
      <Link to="/auth/forgot-password" className={buttonVariants()}>
        Request a new link
      </Link>
    </div>
  )
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

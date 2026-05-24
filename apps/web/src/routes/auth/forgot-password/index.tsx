import { useCurrentUser } from '@kizunu/api-client/identity/use-current-user'
import { useRequestPasswordReset } from '@kizunu/api-client/identity/use-request-password-reset'
import { PageHeader } from '@kizunu/web/components/composed/page-header'
import { Button, buttonVariants } from '@kizunu/web/components/primitives/button'
import { ForgotPasswordForm } from '@kizunu/web/routes/auth/forgot-password/-components/forgot-password-form'
import { createFileRoute, Link, Navigate } from '@tanstack/react-router'

const FORM_ID = 'forgot-password-form'

export const Route = createFileRoute('/auth/forgot-password/')({
  component: ForgotPasswordPage,
})

function ForgotPasswordPage() {
  const { user, isPending: isUserPending } = useCurrentUser()
  const request = useRequestPasswordReset()
  const errorMessage = request.isError
    ? "We couldn't send the reset email. Try again in a moment."
    : null

  if (isUserPending) return null
  if (user) return <Navigate replace to="/workspace" />

  if (request.isSuccess) return <ForgotPasswordSuccess />

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Reset your password"
        description="Enter the email on your account; we'll send a link if it's on file."
      />
      <ForgotPasswordForm
        formId={FORM_ID}
        isPending={request.isPending}
        error={errorMessage}
        onSubmit={request.requestPasswordReset}
      />
      <Button form={FORM_ID} type="submit" loading={request.isPending}>
        Send reset link
      </Button>
      <p className="text-muted-foreground text-sm">
        Remembered it?{' '}
        <Link to="/auth/login" className="hover:text-foreground underline-offset-2 hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  )
}

function ForgotPasswordSuccess() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Check your inbox"
        description="If that email is on file, we sent a reset link. The link expires in one hour."
      />
      <Link to="/auth/login" className={buttonVariants({ variant: 'outline' })}>
        Back to sign in
      </Link>
    </div>
  )
}

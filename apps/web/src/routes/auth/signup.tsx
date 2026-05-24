import { useAuthCapabilities } from '@kizunu/api-client/identity/use-auth-capabilities'
import { useCurrentUser } from '@kizunu/api-client/identity/use-current-user'
import { useRegister } from '@kizunu/api-client/identity/use-register'
import { PageHeader } from '@kizunu/web/components/composed/page-header'
import { Button } from '@kizunu/web/components/primitives/button'
import { RegistrationDisabledNotice } from '@kizunu/web/routes/auth/-components/registration-disabled-notice'
import { SignupForm } from '@kizunu/web/routes/auth/-components/signup-form'
import { mapLoginError } from '@kizunu/web/routes/auth/-utils/login-error-copy'
import { createFileRoute, Link, Navigate, useNavigate } from '@tanstack/react-router'

const FORM_ID = 'signup-form'

export const Route = createFileRoute('/auth/signup')({
  component: SignupPage,
})

function SignupPage() {
  const navigate = useNavigate()
  const { user, isPending: isUserPending } = useCurrentUser()
  const capabilities = useAuthCapabilities()
  const { register, isPending, isError, error } = useRegister({
    onSuccess: () => navigate({ to: '/workspace' }),
  })
  const errorCopy = isError ? mapLoginError(error) : null

  if (isUserPending || capabilities.isPending) return null
  if (user) return <Navigate replace to="/workspace" />
  if (!capabilities.data?.registrationEnabled) return <RegistrationDisabledNotice />

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Create your workspace"
        description="Register the first user for this instance."
      />
      <SignupForm
        formId={FORM_ID}
        isPending={isPending}
        errorCopy={errorCopy}
        onSubmit={register}
      />
      <Button form={FORM_ID} type="submit" loading={isPending}>
        Create workspace
      </Button>
      <p className="text-muted-foreground text-sm">
        Already have an account?{' '}
        <Link to="/auth/login" className="hover:text-foreground underline-offset-2 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  )
}

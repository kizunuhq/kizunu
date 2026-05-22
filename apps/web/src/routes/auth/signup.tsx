import { useAuthCapabilities } from '@kizunu/api-client/identity/use-auth-capabilities'
import { useCurrentUser } from '@kizunu/api-client/identity/use-current-user'
import { RegistrationDisabledNotice } from '@kizunu/web/features/identity/components/registration-disabled-notice'
import { SignupForm } from '@kizunu/web/features/identity/components/signup-form'
import { createFileRoute, Navigate } from '@tanstack/react-router'

export const Route = createFileRoute('/auth/signup')({
  component: SignupPage,
})

function SignupPage() {
  const { user, isPending } = useCurrentUser()
  const capabilities = useAuthCapabilities()

  if (isPending || capabilities.isPending) return null
  if (user) return <Navigate replace to="/workspace" />

  if (!capabilities.data?.registrationEnabled) return <RegistrationDisabledNotice />
  return <SignupForm />
}

import { useCurrentUser } from '@kizunu/api-client/identity/use-current-user'
import { ForgotPasswordForm } from '@kizunu/web/routes/auth/-components/forgot-password-form'
import { createFileRoute, Navigate } from '@tanstack/react-router'

export const Route = createFileRoute('/auth/forgot-password')({
  component: ForgotPasswordPage,
})

function ForgotPasswordPage() {
  const { user, isPending } = useCurrentUser()

  if (isPending) return null
  if (user) return <Navigate replace to="/workspace" />

  return <ForgotPasswordForm />
}

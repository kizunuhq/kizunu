import { useCurrentUser } from '@kizunu/api-client/identity/use-current-user'
import { LoginForm } from '@kizunu/web/features/identity/components/login-form'
import { createFileRoute, Navigate } from '@tanstack/react-router'

export const Route = createFileRoute('/(auth)/login')({
  component: LoginPage,
})

function LoginPage() {
  const { user, isPending } = useCurrentUser()

  if (isPending) return null
  if (user) return <Navigate replace to="/workspace" />

  return <LoginForm />
}

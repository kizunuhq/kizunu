import { useCurrentUser } from '@kizunu/api-client/identity/use-current-user'
import { LoginForm } from '@kizunu/web/features/identity/components/login-form'
import { OAuthButtons } from '@kizunu/web/features/identity/components/oauth-buttons'
import { createFileRoute, Navigate } from '@tanstack/react-router'

export const Route = createFileRoute('/auth/login')({
  component: LoginPage,
})

function LoginPage() {
  const { user, isPending } = useCurrentUser()

  if (isPending) return null
  if (user) return <Navigate replace to="/workspace" />

  return (
    <div className="flex flex-col gap-4">
      <LoginForm />
      <OAuthButtons />
    </div>
  )
}

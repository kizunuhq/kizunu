import { useCurrentUser } from '@kizunu/api-client/identity/use-current-user'
import { AppShell } from '@kizunu/web/features/app-shell/components/app-shell'
import { createFileRoute, Navigate } from '@tanstack/react-router'

export const Route = createFileRoute('/_app')({
  component: ProtectedLayout,
})

function ProtectedLayout() {
  const { user, isPending } = useCurrentUser()

  if (isPending) return null
  if (!user) return <Navigate replace to="/auth/login" />

  return <AppShell />
}

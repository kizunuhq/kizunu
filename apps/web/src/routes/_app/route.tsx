import { useCurrentUser } from '@kizunu/api-client/identity/use-current-user'
import { createFileRoute, Navigate, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_app')({
  component: ProtectedLayout,
})

function ProtectedLayout() {
  const { user, isPending } = useCurrentUser()

  if (isPending) return null
  if (!user) return <Navigate replace to="/login" />

  return (
    <div className="min-h-dvh">
      <Outlet />
    </div>
  )
}

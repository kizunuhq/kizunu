import { createFileRoute, Navigate, Outlet } from '@tanstack/react-router'

import { useSession } from '../../hooks/use-session'

export const Route = createFileRoute('/_app')({
  component: ProtectedLayout,
})

function ProtectedLayout() {
  const { user, isPending } = useSession()

  if (isPending) return null
  if (!user) return <Navigate replace to="/login" />

  return (
    <div className="min-h-dvh">
      <Outlet />
    </div>
  )
}

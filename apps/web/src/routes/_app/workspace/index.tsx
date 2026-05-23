import { DashboardHome } from '@kizunu/web/features/dashboard/components/dashboard-home'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/workspace/')({
  component: WorkspaceDashboardPage,
})

function WorkspaceDashboardPage() {
  return <DashboardHome />
}

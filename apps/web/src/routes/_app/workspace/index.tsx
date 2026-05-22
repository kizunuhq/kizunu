import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/workspace/')({
  component: WorkspaceDashboardPage,
})

function WorkspaceDashboardPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">Workspace</h1>
      <p className="mt-2 text-sm text-neutral-500">TODO: workspace overview</p>
    </div>
  )
}

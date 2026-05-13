import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/workspace/')({
  component: WorkspaceDashboardPage,
})

function WorkspaceDashboardPage() {
  return (
    <div className="p-6">
      <h1 className="font-semibold text-2xl">Workspace</h1>
      <p className="mt-2 text-neutral-500 text-sm">TODO: workspace overview</p>
    </div>
  )
}

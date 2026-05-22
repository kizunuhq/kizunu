import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/workspace/members')({
  component: WorkspaceMembersPage,
})

function WorkspaceMembersPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">Members</h1>
      <p className="mt-2 text-sm text-neutral-500">TODO: members table + invite flow</p>
    </div>
  )
}

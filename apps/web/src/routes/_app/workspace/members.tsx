import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/workspace/members')({
  component: WorkspaceMembersPage,
})

function WorkspaceMembersPage() {
  return (
    <div className="p-6">
      <h1 className="font-semibold text-2xl">Members</h1>
      <p className="mt-2 text-neutral-500 text-sm">TODO: members table + invite flow</p>
    </div>
  )
}

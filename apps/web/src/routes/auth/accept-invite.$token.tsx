import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/auth/accept-invite/$token')({
  component: AcceptInvitePage,
})

function AcceptInvitePage() {
  const { token } = Route.useParams()
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold">Accept invitation</h1>
      <p className="text-sm text-neutral-500">
        TODO: accept invitation form — token <code>{token}</code>
      </p>
    </div>
  )
}

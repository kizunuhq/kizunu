import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/(auth)/accept-invite/$token')({
  component: AcceptInvitePage,
})

function AcceptInvitePage() {
  const { token } = Route.useParams()
  return (
    <div className="space-y-2">
      <h1 className="font-semibold text-2xl">Accept invitation</h1>
      <p className="text-neutral-500 text-sm">
        TODO: accept invitation form — token <code>{token}</code>
      </p>
    </div>
  )
}

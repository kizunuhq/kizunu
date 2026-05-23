import { useCurrentUser } from '@kizunu/api-client/identity/use-current-user'
import { PageHeader } from '@kizunu/web/components/composed/page-header'
import { buttonVariants } from '@kizunu/web/components/primitives/button'
import { AcceptInvitePanel } from '@kizunu/web/features/identity/components/accept-invite-panel'
import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/auth/accept-invite/$token')({
  component: AcceptInvitePage,
})

function AcceptInvitePage() {
  const { token } = Route.useParams()
  const { user, isPending } = useCurrentUser()

  if (isPending) return null
  if (!user) return <SignedOutPrompt token={token} />

  return <AcceptInvitePanel token={token} hasCurrentUser />
}

function SignedOutPrompt({ token }: { token: string }) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Sign in to accept"
        description="You'll come back here to accept the invitation after signing in."
      />
      <Link
        to="/auth/login"
        search={{ next: `/auth/accept-invite/${token}` }}
        className={buttonVariants()}
      >
        Sign in
      </Link>
    </div>
  )
}

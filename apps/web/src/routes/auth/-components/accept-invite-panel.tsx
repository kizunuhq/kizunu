import { useAcceptInvitation } from '@kizunu/api-client/workspace/use-accept-invitation'
import { PageHeader } from '@kizunu/web/components/composed/page-header'
import { Button, buttonVariants } from '@kizunu/web/components/primitives/button'
import { Link, useNavigate } from '@tanstack/react-router'

const KNOWN_ERROR_COPY = {
  'workspace.invitation-not-found': {
    title: "This invitation isn't valid",
    body: 'Ask the admin who invited you for a fresh link.',
  },
  'workspace.invitation-expired': {
    title: 'This invitation has expired',
    body: 'Ask the admin who invited you to send a new invitation.',
  },
} as const

type KnownInvitationErrorCode = keyof typeof KNOWN_ERROR_COPY

function isKnownInvitationErrorCode(code: string): code is KnownInvitationErrorCode {
  return Object.prototype.hasOwnProperty.call(KNOWN_ERROR_COPY, code)
}

interface AcceptInvitePanelProps {
  token: string
  hasCurrentUser: boolean
}

export function AcceptInvitePanel({ token, hasCurrentUser }: AcceptInvitePanelProps) {
  const navigate = useNavigate()
  const accept = useAcceptInvitation({
    onSuccess: () => navigate({ to: '/workspace' }),
  })

  if (accept.isError && isKnownInvitationErrorCode(accept.error.code)) {
    return <InvitationErrorPanel code={accept.error.code} hasCurrentUser={hasCurrentUser} />
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Accept your invitation"
        kicker="Workspace"
        description="You've been invited to join a workspace on kizunu."
      />
      <div className="flex flex-col gap-2">
        <Button type="button" disabled={accept.isPending} onClick={() => accept.mutate({ token })}>
          {accept.isPending ? 'Joining…' : 'Accept invitation'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => navigate({ to: hasCurrentUser ? '/workspace' : '/auth/login' })}
        >
          Decline
        </Button>
      </div>
    </div>
  )
}

interface InvitationErrorPanelProps {
  code: KnownInvitationErrorCode
  hasCurrentUser: boolean
}

function InvitationErrorPanel({ code, hasCurrentUser }: InvitationErrorPanelProps) {
  const copy = KNOWN_ERROR_COPY[code]
  const target = hasCurrentUser ? '/workspace' : '/auth/login'
  const label = hasCurrentUser ? 'Back to workspace' : 'Back to sign in'
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={copy.title} description={copy.body} />
      <Link to={target} className={buttonVariants({ variant: 'outline' })}>
        {label}
      </Link>
    </div>
  )
}

import { useRevokeOtherSessions } from '@kizunu/api-client/identity/use-revoke-other-sessions'
import { useSessions } from '@kizunu/api-client/identity/use-sessions'
import { Button } from '@kizunu/web/components/primitives/button'
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@kizunu/web/components/primitives/card'
import { SessionsTable } from '@kizunu/web/routes/_app/settings/-components/security/sessions-table'

export function SessionsManager() {
  const { data, isPending } = useSessions()
  const revokeOthers = useRevokeOtherSessions()
  const sessions = data?.sessions ?? []
  const hasOthers = sessions.some((session) => !session.isCurrent)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Active sessions</CardTitle>
        <CardAction>
          <Button
            variant="outline"
            size="sm"
            disabled={!hasOthers || revokeOthers.isPending}
            onClick={() => revokeOthers.revokeOtherSessions()}
          >
            Log out other sessions
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {isPending ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : (
          <SessionsTable sessions={sessions} />
        )}
      </CardContent>
    </Card>
  )
}

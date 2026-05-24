import { useSessions } from '@kizunu/api-client/identity/use-sessions'
import type { SessionView } from '@kizunu/api-contracts/identity'
import { Button } from '@kizunu/web/components/primitives/button'
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@kizunu/web/components/primitives/card'
import { SessionsTable } from '@kizunu/web/routes/_app/settings/-components/security/sessions-table'
import { RevokeOtherSessionsDialog } from '@kizunu/web/routes/_app/settings/-dialogs/revoke-other-sessions-dialog'
import { RevokeSessionDialog } from '@kizunu/web/routes/_app/settings/-dialogs/revoke-session-dialog'
import { useState } from 'react'

export function SessionsManager() {
  const { data, isPending } = useSessions()
  const sessions = data?.sessions ?? []
  const hasOthers = sessions.some((session) => !session.isCurrent)
  const [revoking, setRevoking] = useState<SessionView | null>(null)
  const [confirmRevokeAll, setConfirmRevokeAll] = useState(false)

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Active sessions</CardTitle>
          <CardAction>
            <Button
              variant="outline"
              size="sm"
              disabled={!hasOthers}
              onClick={() => setConfirmRevokeAll(true)}
            >
              Log out other sessions
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          {isPending ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : (
            <SessionsTable sessions={sessions} onRequestRevoke={setRevoking} />
          )}
        </CardContent>
      </Card>
      <RevokeSessionDialog
        session={revoking}
        open={Boolean(revoking)}
        onOpenChange={(next) => !next && setRevoking(null)}
      />
      <RevokeOtherSessionsDialog open={confirmRevokeAll} onOpenChange={setConfirmRevokeAll} />
    </>
  )
}

import { useRevokeSession } from '@kizunu/api-client/identity/use-revoke-session'
import type { SessionView } from '@kizunu/api-contracts/identity'
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@kizunu/web/components/primitives/table'
import { SessionRow } from '@kizunu/web/routes/_app/settings/-components/security/session-row'

export function SessionsTable({ sessions }: { sessions: SessionView[] }) {
  const revoke = useRevokeSession()

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Device</TableHead>
          <TableHead>IP</TableHead>
          <TableHead>Last seen</TableHead>
          <TableHead>Expires</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {sessions.map((session) => (
          <SessionRow
            key={session.id}
            session={session}
            pending={revoke.isPending}
            onRevoke={(sessionId) => revoke.mutate(sessionId)}
          />
        ))}
      </TableBody>
    </Table>
  )
}

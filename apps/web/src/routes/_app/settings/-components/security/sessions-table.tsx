import type { SessionView } from '@kizunu/api-contracts/identity'
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@kizunu/web/components/primitives/table'
import { SessionRow } from '@kizunu/web/routes/_app/settings/-components/security/session-row'

interface SessionsTableProps {
  sessions: SessionView[]
  onRequestRevoke: (session: SessionView) => void
}

export function SessionsTable({ sessions, onRequestRevoke }: SessionsTableProps) {
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
          <SessionRow key={session.id} session={session} onRequestRevoke={onRequestRevoke} />
        ))}
      </TableBody>
    </Table>
  )
}

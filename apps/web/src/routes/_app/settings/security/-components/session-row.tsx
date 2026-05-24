import type { SessionView } from '@kizunu/api-contracts/identity'
import { Badge } from '@kizunu/web/components/primitives/badge'
import { Button } from '@kizunu/web/components/primitives/button'
import { TableCell, TableRow } from '@kizunu/web/components/primitives/table'

function formatStamp(iso: string | null): string {
  return iso ? new Date(iso).toLocaleString() : '—'
}

interface SessionRowProps {
  session: SessionView
  onRequestRevoke: (session: SessionView) => void
}

export function SessionRow({ session, onRequestRevoke }: SessionRowProps) {
  return (
    <TableRow>
      <TableCell className="max-w-xs truncate">{session.userAgent ?? 'Unknown device'}</TableCell>
      <TableCell>{session.ipAddress ?? '—'}</TableCell>
      <TableCell>{formatStamp(session.lastSeenAt)}</TableCell>
      <TableCell>{formatStamp(session.expiresAt)}</TableCell>
      <TableCell className="text-right">
        {session.isCurrent ? (
          <Badge>This device</Badge>
        ) : (
          <Button variant="outline" size="sm" onClick={() => onRequestRevoke(session)}>
            Revoke
          </Button>
        )}
      </TableCell>
    </TableRow>
  )
}

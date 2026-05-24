import type { SessionView } from '@kizunu/api-contracts/identity'
import { Badge } from '@kizunu/web/components/primitives/badge'
import { Button } from '@kizunu/web/components/primitives/button'
import { TableCell, TableRow } from '@kizunu/web/components/primitives/table'

function formatStamp(iso: string | null): string {
  return iso ? new Date(iso).toLocaleString() : '—'
}

export function SessionRow({
  session,
  pending,
  onRevoke,
}: {
  session: SessionView
  pending: boolean
  onRevoke: (sessionId: string) => void
}) {
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
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => onRevoke(session.id)}
          >
            Revoke
          </Button>
        )}
      </TableCell>
    </TableRow>
  )
}

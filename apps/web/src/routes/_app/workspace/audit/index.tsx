import { useAuditEvents } from '@kizunu/api-client/engine/use-audit-events'
import { useCurrentUser } from '@kizunu/api-client/identity/use-current-user'
import { PageHeader } from '@kizunu/web/components/composed/page-header'
import { Badge } from '@kizunu/web/components/primitives/badge'
import { Card, CardContent } from '@kizunu/web/components/primitives/card'
import { formatRelativeTime } from '@kizunu/web/lib/format-relative-time'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/workspace/audit/')({
  component: AuditPage,
})

function AuditPage() {
  const { activeWorkspaceId } = useCurrentUser()
  const { data, isPending } = useAuditEvents(activeWorkspaceId ?? undefined)
  const events = data?.events ?? []

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Audit timeline"
        kicker="Operations"
        description="Proof of what happened — journey events emitted by the engine."
      />
      <Card>
        <CardContent className="p-0">
          {isPending ? (
            <p className="text-muted-foreground p-4 text-sm">Loading…</p>
          ) : events.length === 0 ? (
            <p className="text-muted-foreground p-4 text-sm">
              No audit events yet. They show up here as journeys run.
            </p>
          ) : (
            <ul className="divide-border divide-y">
              {events.map((event) => (
                <li key={event.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="font-mono text-xs">
                      {event.kind}
                    </Badge>
                    {event.journeyId ? (
                      <span className="text-muted-foreground font-mono text-xs">
                        journey {event.journeyId.slice(0, 8)}
                      </span>
                    ) : null}
                  </div>
                  <span className="text-muted-foreground font-mono text-xs">
                    {formatRelativeTime(event.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

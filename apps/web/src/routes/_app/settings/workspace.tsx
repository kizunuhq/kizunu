import { useCurrentUser } from '@kizunu/api-client/identity/use-current-user'
import { PageHeader } from '@kizunu/web/components/composed/page-header'
import { SettingsRow } from '@kizunu/web/components/composed/settings-row'
import { Card } from '@kizunu/web/components/primitives/card'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/settings/workspace')({
  component: WorkspaceSettingsPage,
})

function WorkspaceSettingsPage() {
  const { memberships, activeWorkspaceId } = useCurrentUser()
  const active = memberships.find((m) => m.workspaceId === activeWorkspaceId)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Workspace" description="Information about the active workspace." />
      <Card>
        <SettingsRow title="Name" description={active?.workspaceName ?? '—'} />
        <SettingsRow
          title="Slug"
          description=""
          action={
            <code className="text-muted-foreground font-mono text-xs">
              {active?.workspaceSlug ?? '—'}
            </code>
          }
        />
        <SettingsRow
          title="Your role"
          description={active ? `${active.role} · ${active.status}` : '—'}
        />
      </Card>
      <Card>
        <SettingsRow
          variant="danger"
          title="Workspace rename and delete"
          description="Workspace administration endpoints arrive in a future release."
        />
      </Card>
    </div>
  )
}

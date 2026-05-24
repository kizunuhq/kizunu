import { PageHeader } from '@kizunu/web/components/composed/page-header'
import { SessionsManager } from '@kizunu/web/routes/_app/settings/-components/security/sessions-manager'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/settings/security')({
  component: SecurityPage,
})

function SecurityPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Security" description="Review and revoke active sessions." />
      <SessionsManager />
    </div>
  )
}

import { SessionsManager } from '@kizunu/web/features/identity/components/sessions-manager'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/workspace/security')({
  component: SecurityPage,
})

function SecurityPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Security</h1>
      <SessionsManager />
    </div>
  )
}

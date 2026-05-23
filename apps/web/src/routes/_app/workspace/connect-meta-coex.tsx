import { useCurrentUser } from '@kizunu/api-client/identity/use-current-user'
import { ConnectMetaCoex } from '@kizunu/web/features/channel/components/connect-meta-coex'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/workspace/connect-meta-coex')({
  component: ConnectMetaCoexPage,
})

function ConnectMetaCoexPage() {
  const { activeWorkspaceId } = useCurrentUser()
  // Build-time-injected Coex app id + config id; for v0.1 the operator
  // supplies them via Vite env vars matching the API-side env keys.
  const appId = import.meta.env.VITE_META_APP_ID ?? ''
  const coexConfigId = import.meta.env.VITE_META_COEX_CONFIG_ID ?? ''

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Connect WhatsApp via Embedded Signup</h1>
      {activeWorkspaceId ? (
        <ConnectMetaCoex
          workspaceId={activeWorkspaceId}
          appId={appId}
          coexConfigId={coexConfigId}
        />
      ) : (
        <p className="text-muted-foreground text-sm">No active workspace selected.</p>
      )}
    </div>
  )
}

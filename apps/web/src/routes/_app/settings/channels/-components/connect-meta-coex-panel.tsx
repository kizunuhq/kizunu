import { useConnectMetaCoex } from '@kizunu/api-client/channel/use-connect-meta-coex'
import { Button } from '@kizunu/web/components/primitives/button'
import { Field, FieldLabel } from '@kizunu/web/components/primitives/field'
import { Input } from '@kizunu/web/components/primitives/input'
import { useState } from 'react'

import { useEmbeddedSignup } from '../-hooks/use-embedded-signup'

interface ConnectMetaCoexPanelProps {
  workspaceId: string
  appId: string
  coexConfigId: string
  isPending: boolean
  onSuccess: () => void
  onError: (message: string) => void
}

export function ConnectMetaCoexPanel(props: ConnectMetaCoexPanelProps) {
  const { workspaceId, appId, coexConfigId, isPending, onSuccess, onError } = props

  if (!appId || !coexConfigId) {
    return (
      <p className="text-muted-foreground text-sm">
        WhatsApp Coex is not configured for this deployment. Ask your administrator to set
        META_APP_ID, META_APP_SECRET, and META_COEX_CONFIG_ID.
      </p>
    )
  }

  return (
    <ConnectMetaCoexPanelInner
      workspaceId={workspaceId}
      appId={appId}
      coexConfigId={coexConfigId}
      isPending={isPending}
      onSuccess={onSuccess}
      onError={onError}
    />
  )
}

function ConnectMetaCoexPanelInner(props: Required<ConnectMetaCoexPanelProps>) {
  const { workspaceId, appId, coexConfigId, isPending, onSuccess, onError } = props
  const [name, setName] = useState('WhatsApp Coex')
  const { code, businessId, wabaId, phoneNumberId, status, startLogin, isReady } =
    useEmbeddedSignup({ appId, coexConfigId })

  const { connectMetaCoex, isPending: isMutating } = useConnectMetaCoex(workspaceId, {
    onSuccess,
    onError: (err) => onError(err.message),
  })

  const busy = isPending || isMutating

  return (
    <div className="flex flex-col gap-3">
      <Field>
        <FieldLabel htmlFor="coex-panel-name">Channel name</FieldLabel>
        <Input
          id="coex-panel-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          disabled={busy}
        />
      </Field>
      <Button type="button" disabled={busy} onClick={startLogin}>
        Connect WhatsApp Business
      </Button>
      <Button
        type="button"
        disabled={!isReady || busy}
        onClick={() =>
          code && businessId && wabaId && phoneNumberId
            ? connectMetaCoex({ code, businessId, wabaId, phoneNumberId, name })
            : undefined
        }
      >
        Finish connect
      </Button>
      {status ? <p className="text-muted-foreground text-sm">{status}</p> : null}
    </div>
  )
}

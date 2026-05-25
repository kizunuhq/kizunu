import { useChannelPlugins } from '@kizunu/api-client/channel/use-channel-plugins'
import type { ChannelCredentialField } from '@kizunu/api-contracts/channel'
import { FormError } from '@kizunu/web/components/composed/form-error'
import { PluginSelect } from '@kizunu/web/components/composed/plugin-select'
import { Field, FieldGroup, FieldLabel } from '@kizunu/web/components/primitives/field'
import { useState } from 'react'

import { ChannelAccountFormBody } from './channel-account-form-body'
import { ConnectMetaCoexPanel } from './connect-meta-coex-panel'

export interface ChannelAccountFormValues {
  pluginId: string
  name: string
  credentials: Record<string, unknown>
}

interface ChannelAccountFormProps {
  formId: string
  workspaceId: string
  isPending: boolean
  error?: string | null
  preselectedPluginId?: string
  onSubmit: (values: ChannelAccountFormValues) => void
  onOauthSuccess?: () => void
  onOauthError?: (message: string) => void
  onPluginKindChange?: (kind: 'credentials' | 'oauth' | undefined) => void
}

export function ChannelAccountForm(props: ChannelAccountFormProps) {
  const {
    formId,
    workspaceId,
    isPending,
    error,
    preselectedPluginId,
    onSubmit,
    onOauthSuccess,
    onOauthError,
    onPluginKindChange,
  } = props
  const plugins = useChannelPlugins()
  const [pluginId, setPluginId] = useState(preselectedPluginId ?? '')

  const selected = plugins.data?.plugins.find((p) => p.id === pluginId)
  const connectKind = selected?.connect.kind

  function handlePluginChange(next: string) {
    setPluginId(next)
    const kind = plugins.data?.plugins.find((p) => p.id === next)?.connect.kind
    onPluginKindChange?.(kind)
  }

  const appId = import.meta.env.VITE_META_APP_ID ?? ''
  const coexConfigId = import.meta.env.VITE_META_COEX_CONFIG_ID ?? ''

  return (
    <div className="flex flex-col gap-3">
      {error && <FormError>{error}</FormError>}
      <FieldGroup>
        <Field>
          <FieldLabel>Plugin</FieldLabel>
          <PluginSelect value={pluginId} onChange={handlePluginChange} />
        </Field>
      </FieldGroup>
      {pluginId && connectKind === 'oauth' && (
        <ConnectMetaCoexPanel
          key={pluginId}
          workspaceId={workspaceId}
          appId={appId}
          coexConfigId={coexConfigId}
          isPending={isPending}
          onSuccess={onOauthSuccess ?? (() => {})}
          onError={onOauthError ?? (() => {})}
        />
      )}
      {pluginId && connectKind === 'credentials' && (
        <ChannelAccountFormBody
          key={pluginId}
          formId={formId}
          pluginId={pluginId}
          fields={userInputFieldsFor(selected?.credentialFields)}
          isPending={isPending}
          onSubmit={onSubmit}
        />
      )}
    </div>
  )
}

function userInputFieldsFor(
  fields: ChannelCredentialField[] | undefined,
): ChannelCredentialField[] {
  if (!fields) return []
  return fields.filter((field) => field.serverGenerated !== true)
}

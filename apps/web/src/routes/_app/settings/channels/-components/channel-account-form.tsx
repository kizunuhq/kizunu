import { useChannelPlugins } from '@kizunu/api-client/channel/use-channel-plugins'
import type { ChannelCredentialField } from '@kizunu/api-contracts/channel'
import { FormError } from '@kizunu/web/components/composed/form-error'
import { PluginSelect } from '@kizunu/web/components/composed/plugin-select'
import { Field, FieldGroup, FieldLabel } from '@kizunu/web/components/primitives/field'
import { useState } from 'react'

import { ChannelAccountFormBody } from './channel-account-form-body'

export interface ChannelAccountFormValues {
  pluginId: string
  name: string
  credentials: Record<string, unknown>
}

interface ChannelAccountFormProps {
  formId: string
  isPending: boolean
  error?: string | null
  onSubmit: (values: ChannelAccountFormValues) => void
}

/**
 * Outer shell: owns the plugin picker (pure ephemeral state, not part of the
 * submitted shape) and re-keys the inner form body on plugin change so the
 * inner `useForm` initializes with the right per-plugin schema each time.
 * The body is dumb — it receives only the picked plugin's fields + schema and
 * never knows about plugin switching.
 */
export function ChannelAccountForm(props: ChannelAccountFormProps) {
  const { formId, isPending, error, onSubmit } = props
  const plugins = useChannelPlugins()
  const [pluginId, setPluginId] = useState('')
  const fields = userInputFieldsFor(
    plugins.data?.plugins.find((plugin) => plugin.id === pluginId)?.credentialFields,
  )

  return (
    <div className="flex flex-col gap-3">
      {error && <FormError>{error}</FormError>}
      <FieldGroup>
        <Field>
          <FieldLabel>Plugin</FieldLabel>
          <PluginSelect value={pluginId} onChange={setPluginId} />
        </Field>
      </FieldGroup>
      {pluginId && (
        <ChannelAccountFormBody
          key={pluginId}
          formId={formId}
          pluginId={pluginId}
          fields={fields}
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

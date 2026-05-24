import { useChannelPlugins } from '@kizunu/api-client/channel/use-channel-plugins'
import { FormError } from '@kizunu/web/components/composed/form-error'
import { PluginSelect } from '@kizunu/web/components/composed/plugin-select'
import { Field, FieldLabel } from '@kizunu/web/components/primitives/field'
import { Input } from '@kizunu/web/components/primitives/input'
import { CredentialFieldsInput } from '@kizunu/web/routes/_app/settings/-components/channels/credential-fields-input'
import { hasRequiredCredentials } from '@kizunu/web/routes/_app/settings/-utils/has-required-credentials'
import { userInputFields } from '@kizunu/web/routes/_app/settings/-utils/user-input-fields'
import { useState } from 'react'

export interface ChannelAccountFormValues {
  pluginId: string
  name: string
  credentials: Record<string, string>
}

interface ChannelAccountFormProps {
  formId: string
  isPending: boolean
  error?: string | null
  onSubmit: (values: ChannelAccountFormValues) => void
}

export function ChannelAccountForm(props: ChannelAccountFormProps) {
  const { formId, isPending, error, onSubmit } = props
  const [pluginId, setPluginId] = useState('')
  const [name, setName] = useState('')
  const [credentials, setCredentials] = useState<Record<string, string>>({})
  const [validationError, setValidationError] = useState<string | null>(null)
  const plugins = useChannelPlugins()

  const fields = userInputFields(
    plugins.data?.plugins.find((plugin) => plugin.id === pluginId)?.credentialFields ?? [],
  )

  function selectPlugin(next: string) {
    setPluginId(next)
    setCredentials({})
    setValidationError(null)
  }

  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!pluginId) {
      setValidationError('Choose a plugin to continue.')
      return
    }
    if (!hasRequiredCredentials(fields, credentials)) {
      setValidationError('Fill every required credential field.')
      return
    }
    setValidationError(null)
    onSubmit({ pluginId, name, credentials })
  }

  const displayError = validationError ?? error

  return (
    <form id={formId} className="flex flex-col gap-3" onSubmit={submit}>
      {displayError && <FormError>{displayError}</FormError>}
      <Field>
        <FieldLabel>Plugin</FieldLabel>
        <PluginSelect value={pluginId} onChange={selectPlugin} />
      </Field>
      <Field>
        <FieldLabel htmlFor="channel-name">Name</FieldLabel>
        <Input
          id="channel-name"
          value={name}
          required
          disabled={isPending}
          onChange={(e) => setName(e.target.value)}
        />
      </Field>
      <CredentialFieldsInput fields={fields} values={credentials} onChange={setCredentials} />
    </form>
  )
}

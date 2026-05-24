import { useChannelPlugins } from '@kizunu/api-client/channel/use-channel-plugins'
import { useCreateChannelAccount } from '@kizunu/api-client/channel/use-create-channel-account'
import { PluginSelect } from '@kizunu/web/components/composed/plugin-select'
import { Button } from '@kizunu/web/components/primitives/button'
import { Field, FieldLabel } from '@kizunu/web/components/primitives/field'
import { Input } from '@kizunu/web/components/primitives/input'
import { CredentialFieldsInput } from '@kizunu/web/routes/_app/settings/-components/channels/credential-fields-input'
import { hasRequiredCredentials } from '@kizunu/web/routes/_app/settings/-utils/has-required-credentials'
import { userInputFields } from '@kizunu/web/routes/_app/settings/-utils/user-input-fields'
import { useState } from 'react'

export function ChannelAccountForm({ workspaceId }: { workspaceId: string }) {
  const [pluginId, setPluginId] = useState('')
  const [name, setName] = useState('')
  const [credentials, setCredentials] = useState<Record<string, string>>({})
  const plugins = useChannelPlugins()
  const create = useCreateChannelAccount(workspaceId, {
    onSuccess: () => {
      setName('')
      setCredentials({})
    },
  })

  const fields = userInputFields(
    plugins.data?.plugins.find((plugin) => plugin.id === pluginId)?.credentialFields ?? [],
  )

  function selectPlugin(next: string) {
    setPluginId(next)
    setCredentials({})
  }

  function submit(event: React.FormEvent) {
    event.preventDefault()
    create.mutate({ pluginId, name, credentials })
  }

  const canSubmit = pluginId !== '' && hasRequiredCredentials(fields, credentials)

  return (
    <form className="flex flex-col gap-3" onSubmit={submit}>
      <Field>
        <FieldLabel>Plugin</FieldLabel>
        <PluginSelect value={pluginId} onChange={selectPlugin} />
      </Field>
      <Field>
        <FieldLabel htmlFor="channel-name">Name</FieldLabel>
        <Input id="channel-name" value={name} required onChange={(e) => setName(e.target.value)} />
      </Field>
      <CredentialFieldsInput fields={fields} values={credentials} onChange={setCredentials} />
      <Button type="submit" disabled={create.isPending || !canSubmit}>
        Add channel account
      </Button>
    </form>
  )
}

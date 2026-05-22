import { useCreateChannelAccount } from '@kizunu/api-client/channel/use-create-channel-account'
import { Button } from '@kizunu/web/components/primitives/button'
import { Field, FieldError, FieldLabel } from '@kizunu/web/components/primitives/field'
import { Input } from '@kizunu/web/components/primitives/input'
import { Textarea } from '@kizunu/web/components/primitives/textarea'
import { PluginSelect } from '@kizunu/web/features/channel/components/plugin-select'
import { parseJsonObject } from '@kizunu/web/lib/parse-json-object'
import { useState } from 'react'

export function ChannelAccountForm({ workspaceId }: { workspaceId: string }) {
  const [pluginId, setPluginId] = useState('')
  const [name, setName] = useState('')
  const [credentials, setCredentials] = useState('{}')
  const create = useCreateChannelAccount(workspaceId, { onSuccess: () => setName('') })
  const parsed = parseJsonObject(credentials)

  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (parsed) create.mutate({ pluginId, name, credentials: parsed })
  }

  return (
    <form className="flex flex-col gap-3" onSubmit={submit}>
      <Field>
        <FieldLabel>Plugin</FieldLabel>
        <PluginSelect value={pluginId} onChange={setPluginId} />
      </Field>
      <Field>
        <FieldLabel htmlFor="channel-name">Name</FieldLabel>
        <Input id="channel-name" value={name} required onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field>
        <FieldLabel htmlFor="channel-credentials">Credentials (JSON)</FieldLabel>
        <Textarea
          id="channel-credentials"
          value={credentials}
          rows={4}
          onChange={(e) => setCredentials(e.target.value)}
        />
        {parsed === null ? <FieldError>Invalid JSON.</FieldError> : null}
      </Field>
      <Button type="submit" disabled={create.isPending || !pluginId}>
        Add channel account
      </Button>
    </form>
  )
}

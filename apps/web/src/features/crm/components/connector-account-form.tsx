import { useCreateConnectorAccount } from '@kizunu/api-client/crm/use-create-connector-account'
import { LookupSelect } from '@kizunu/web/components/lookup-select'
import { Button } from '@kizunu/web/components/primitives/button'
import { Field, FieldError, FieldLabel } from '@kizunu/web/components/primitives/field'
import { Input } from '@kizunu/web/components/primitives/input'
import { Textarea } from '@kizunu/web/components/primitives/textarea'
import { parseJsonObject } from '@kizunu/web/lib/parse-json-object'
import { useState } from 'react'

const CONNECTOR_OPTIONS = [{ value: 'pipedrive', label: 'Pipedrive' }]

export function ConnectorAccountForm({ workspaceId }: { workspaceId: string }) {
  const [connectorId, setConnectorId] = useState('')
  const [name, setName] = useState('')
  const [credentials, setCredentials] = useState('{}')
  const create = useCreateConnectorAccount(workspaceId, { onSuccess: () => setName('') })
  const parsed = parseJsonObject(credentials)

  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (parsed) create.mutate({ connectorId, name, credentials: parsed })
  }

  return (
    <form className="flex flex-col gap-3" onSubmit={submit}>
      <Field>
        <FieldLabel>Connector</FieldLabel>
        <LookupSelect
          value={connectorId}
          placeholder="Choose a CRM connector"
          options={CONNECTOR_OPTIONS}
          onChange={setConnectorId}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="connector-name">Name</FieldLabel>
        <Input
          id="connector-name"
          value={name}
          required
          onChange={(e) => setName(e.target.value)}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="connector-credentials">Credentials (JSON)</FieldLabel>
        <Textarea
          id="connector-credentials"
          value={credentials}
          rows={4}
          onChange={(e) => setCredentials(e.target.value)}
        />
        {parsed === null ? <FieldError>Invalid JSON.</FieldError> : null}
      </Field>
      <Button type="submit" disabled={create.isPending || !connectorId}>
        Add connector
      </Button>
    </form>
  )
}

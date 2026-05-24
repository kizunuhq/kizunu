import { FormError } from '@kizunu/web/components/composed/form-error'
import { LookupSelect } from '@kizunu/web/components/composed/lookup-select'
import { Field, FieldError, FieldLabel } from '@kizunu/web/components/primitives/field'
import { Input } from '@kizunu/web/components/primitives/input'
import { Textarea } from '@kizunu/web/components/primitives/textarea'
import { parseJsonObject } from '@kizunu/web/lib/parse-json-object'
import { useState } from 'react'

const CONNECTOR_OPTIONS = [{ value: 'pipedrive', label: 'Pipedrive' }]

export interface ConnectorAccountFormValues {
  connectorId: string
  name: string
  credentials: Record<string, unknown>
}

interface ConnectorAccountFormProps {
  formId: string
  isPending: boolean
  error?: string | null
  onSubmit: (values: ConnectorAccountFormValues) => void
}

export function ConnectorAccountForm(props: ConnectorAccountFormProps) {
  const { formId, isPending, error, onSubmit } = props
  const [connectorId, setConnectorId] = useState('')
  const [name, setName] = useState('')
  const [credentials, setCredentials] = useState('{}')
  const parsed = parseJsonObject(credentials)

  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!connectorId || !parsed) return
    onSubmit({ connectorId, name, credentials: parsed })
  }

  return (
    <form id={formId} className="flex flex-col gap-3" onSubmit={submit}>
      {error && <FormError>{error}</FormError>}
      <Field>
        <FieldLabel>Connector</FieldLabel>
        <LookupSelect
          value={connectorId}
          placeholder="Choose a CRM connector"
          options={CONNECTOR_OPTIONS}
          onChange={setConnectorId}
          disabled={isPending}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="connector-name">Name</FieldLabel>
        <Input
          id="connector-name"
          value={name}
          required
          disabled={isPending}
          onChange={(e) => setName(e.target.value)}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="connector-credentials">Credentials (JSON)</FieldLabel>
        <Textarea
          id="connector-credentials"
          value={credentials}
          rows={4}
          disabled={isPending}
          onChange={(e) => setCredentials(e.target.value)}
        />
        {parsed === null ? <FieldError>Invalid JSON.</FieldError> : null}
      </Field>
    </form>
  )
}

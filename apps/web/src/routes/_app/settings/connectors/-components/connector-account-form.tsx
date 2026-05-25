import { useAvailableConnectors } from '@kizunu/api-client/crm/use-available-connectors'
import type {
  ConnectorCredentialField,
  CreateConnectorAccountRequest,
} from '@kizunu/api-contracts/crm'
import { FormError } from '@kizunu/web/components/composed/form-error'
import { LookupSelect } from '@kizunu/web/components/composed/lookup-select'
import { Field, FieldGroup, FieldLabel } from '@kizunu/web/components/primitives/field'
import { useState } from 'react'

import { ConnectorAccountFormBody } from './connector-account-form-body'

interface ConnectorAccountFormProps {
  formId: string
  isPending: boolean
  error?: string | null
  onSubmit: (values: CreateConnectorAccountRequest) => void
}

/**
 * Outer shell: connector picker (ephemeral state) plus the inner form body
 * re-keyed by connectorId, so the inner zodResolver initializes once per
 * connector. Mirrors the channel form's two-component structure landed in
 * Feature 056.
 */
export function ConnectorAccountForm(props: ConnectorAccountFormProps) {
  const { formId, isPending, error, onSubmit } = props
  const connectors = useAvailableConnectors()
  const [connectorId, setConnectorId] = useState('')
  const options = (connectors.data?.connectors ?? []).map((connector) => ({
    value: connector.id,
    label: connector.name,
  }))
  const fields = userInputFieldsFor(
    connectors.data?.connectors.find((connector) => connector.id === connectorId)?.credentialFields,
  )

  return (
    <div className="flex flex-col gap-3">
      {error && <FormError>{error}</FormError>}
      <FieldGroup>
        <Field>
          <FieldLabel>Connector</FieldLabel>
          <LookupSelect
            value={connectorId}
            placeholder="Choose a CRM connector"
            options={options}
            onChange={setConnectorId}
            disabled={isPending}
          />
        </Field>
      </FieldGroup>
      {connectorId && (
        <ConnectorAccountFormBody
          key={connectorId}
          formId={formId}
          connectorId={connectorId}
          fields={fields}
          isPending={isPending}
          onSubmit={onSubmit}
        />
      )}
    </div>
  )
}

function userInputFieldsFor(
  fields: ConnectorCredentialField[] | undefined,
): ConnectorCredentialField[] {
  if (!fields) return []
  return fields.filter((field) => field.serverGenerated !== true)
}

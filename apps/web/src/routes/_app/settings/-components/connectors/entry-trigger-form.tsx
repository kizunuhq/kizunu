import { useCadences } from '@kizunu/api-client/cadence/use-cadences'
import { useWorkspaceConnectors } from '@kizunu/api-client/crm/use-workspace-connectors'
import { FormError } from '@kizunu/web/components/composed/form-error'
import { LookupSelect } from '@kizunu/web/components/composed/lookup-select'
import { Field, FieldLabel } from '@kizunu/web/components/primitives/field'
import { Input } from '@kizunu/web/components/primitives/input'
import { useState } from 'react'

export interface EntryTriggerFormValues {
  connectorAccountId: string
  cadenceId: string
  stageId: string
  pipelineId: string | null
}

interface EntryTriggerFormProps {
  formId: string
  workspaceId: string
  isPending: boolean
  error?: string | null
  onSubmit: (values: EntryTriggerFormValues) => void
}

export function EntryTriggerForm(props: EntryTriggerFormProps) {
  const { formId, workspaceId, isPending, error, onSubmit } = props
  const connectors = useWorkspaceConnectors(workspaceId)
  const cadences = useCadences(workspaceId)
  const [connectorAccountId, setConnectorAccountId] = useState('')
  const [cadenceId, setCadenceId] = useState('')
  const [stageId, setStageId] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)

  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!connectorAccountId) {
      setValidationError('Pick a connector account.')
      return
    }
    if (!stageId) {
      setValidationError('Enter a CRM stage id.')
      return
    }
    if (!cadenceId) {
      setValidationError('Pick a cadence to trigger.')
      return
    }
    setValidationError(null)
    onSubmit({ connectorAccountId, cadenceId, stageId, pipelineId: null })
  }

  const connectorOptions = (connectors.data?.accounts ?? []).map((a) => ({
    value: a.id,
    label: a.name,
  }))
  const cadenceOptions = (cadences.data?.cadences ?? []).map((c) => ({
    value: c.id,
    label: c.name,
  }))

  const displayError = validationError ?? error

  return (
    <form id={formId} className="flex flex-col gap-3" onSubmit={submit}>
      {displayError && <FormError>{displayError}</FormError>}
      <Field>
        <FieldLabel>Connector account</FieldLabel>
        <LookupSelect
          value={connectorAccountId}
          placeholder="Select connector"
          options={connectorOptions}
          onChange={(next) => {
            setConnectorAccountId(next)
            setValidationError(null)
          }}
          disabled={isPending}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="stage-id">CRM stage id</FieldLabel>
        <Input
          id="stage-id"
          value={stageId}
          required
          disabled={isPending}
          onChange={(e) => {
            setStageId(e.target.value)
            setValidationError(null)
          }}
        />
      </Field>
      <Field>
        <FieldLabel>Cadence</FieldLabel>
        <LookupSelect
          value={cadenceId}
          placeholder="Select cadence"
          options={cadenceOptions}
          onChange={(next) => {
            setCadenceId(next)
            setValidationError(null)
          }}
          disabled={isPending}
        />
      </Field>
    </form>
  )
}

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

  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!connectorAccountId || !cadenceId || !stageId) return
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

  return (
    <form id={formId} className="flex flex-col gap-3" onSubmit={submit}>
      {error && <FormError>{error}</FormError>}
      <Field>
        <FieldLabel>Connector account</FieldLabel>
        <LookupSelect
          value={connectorAccountId}
          placeholder="Select connector"
          options={connectorOptions}
          onChange={setConnectorAccountId}
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
          onChange={(e) => setStageId(e.target.value)}
        />
      </Field>
      <Field>
        <FieldLabel>Cadence</FieldLabel>
        <LookupSelect
          value={cadenceId}
          placeholder="Select cadence"
          options={cadenceOptions}
          onChange={setCadenceId}
          disabled={isPending}
        />
      </Field>
    </form>
  )
}

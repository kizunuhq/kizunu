import { useCadences } from '@kizunu/api-client/cadence/use-cadences'
import { useWorkspaceConnectors } from '@kizunu/api-client/crm/use-workspace-connectors'
import { useCreateEntryTrigger } from '@kizunu/api-client/engine/use-create-entry-trigger'
import { LookupSelect } from '@kizunu/web/components/lookup-select'
import { Button } from '@kizunu/web/components/primitives/button'
import { Field, FieldLabel } from '@kizunu/web/components/primitives/field'
import { Input } from '@kizunu/web/components/primitives/input'
import { useState } from 'react'

export function EntryTriggerForm({ workspaceId }: { workspaceId: string }) {
  const connectors = useWorkspaceConnectors(workspaceId)
  const cadences = useCadences(workspaceId)
  const [connectorAccountId, setConnectorAccountId] = useState('')
  const [cadenceId, setCadenceId] = useState('')
  const [stageId, setStageId] = useState('')
  const create = useCreateEntryTrigger(workspaceId, { onSuccess: () => setStageId('') })

  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (connectorAccountId && cadenceId && stageId) {
      create.mutate({ connectorAccountId, cadenceId, stageId, pipelineId: null })
    }
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
    <form className="flex flex-col gap-3" onSubmit={submit}>
      <Field>
        <FieldLabel>Connector account</FieldLabel>
        <LookupSelect
          value={connectorAccountId}
          placeholder="Select connector"
          options={connectorOptions}
          onChange={setConnectorAccountId}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="stage-id">CRM stage id</FieldLabel>
        <Input
          id="stage-id"
          value={stageId}
          required
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
        />
      </Field>
      <Button type="submit" disabled={create.isPending || !connectorAccountId || !cadenceId}>
        Add trigger
      </Button>
    </form>
  )
}

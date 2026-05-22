import { useCreateCadence } from '@kizunu/api-client/cadence/use-create-cadence'
import { useTemplates } from '@kizunu/api-client/cadence/use-templates'
import { Button } from '@kizunu/web/components/primitives/button'
import { Field, FieldLabel } from '@kizunu/web/components/primitives/field'
import { Input } from '@kizunu/web/components/primitives/input'
import {
  type CadenceStepDraft,
  newStepDraft,
} from '@kizunu/web/features/cadence/components/cadence-step-row'
import { CadenceStepsEditor } from '@kizunu/web/features/cadence/components/cadence-steps-editor'
import { buildCadenceRequest } from '@kizunu/web/features/cadence/lib/build-cadence-request'
import { useState } from 'react'

export function CadenceBuilder({ workspaceId }: { workspaceId: string }) {
  const templates = useTemplates(workspaceId)
  const [name, setName] = useState('')
  const [steps, setSteps] = useState<CadenceStepDraft[]>([newStepDraft()])
  const [onReplyStageId, setOnReplyStageId] = useState('')
  const create = useCreateCadence(workspaceId, {
    onSuccess: () => {
      setName('')
      setSteps([newStepDraft()])
    },
  })

  function submit(event: React.FormEvent) {
    event.preventDefault()
    create.mutate(buildCadenceRequest({ name, steps, onReplyStageId }))
  }

  const templateOptions = (templates.data?.templates ?? []).map((t) => ({
    value: t.id,
    label: t.name,
  }))

  return (
    <form className="flex flex-col gap-4" onSubmit={submit}>
      <Field>
        <FieldLabel htmlFor="cadence-name">Name</FieldLabel>
        <Input id="cadence-name" value={name} required onChange={(e) => setName(e.target.value)} />
      </Field>
      <CadenceStepsEditor steps={steps} templates={templateOptions} onChange={setSteps} />
      <Field>
        <FieldLabel htmlFor="onreply-stage">On reply: move to stage id (optional)</FieldLabel>
        <Input
          id="onreply-stage"
          value={onReplyStageId}
          onChange={(e) => setOnReplyStageId(e.target.value)}
        />
      </Field>
      <Button type="submit" disabled={create.isPending}>
        Create cadence
      </Button>
    </form>
  )
}

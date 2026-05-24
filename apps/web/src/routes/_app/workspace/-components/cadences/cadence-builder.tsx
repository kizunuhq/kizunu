import { useTemplates } from '@kizunu/api-client/cadence/use-templates'
import { FormError } from '@kizunu/web/components/composed/form-error'
import { Field, FieldLabel } from '@kizunu/web/components/primitives/field'
import { Input } from '@kizunu/web/components/primitives/input'
import {
  type CadenceStepDraft,
  newStepDraft,
} from '@kizunu/web/routes/_app/workspace/-components/cadences/cadence-step-row'
import { CadenceStepsEditor } from '@kizunu/web/routes/_app/workspace/-components/cadences/cadence-steps-editor'
import { buildCadenceRequest } from '@kizunu/web/routes/_app/workspace/-utils/build-cadence-request'
import { useState } from 'react'

export type CadenceBuilderValues = ReturnType<typeof buildCadenceRequest>

interface CadenceBuilderProps {
  formId: string
  workspaceId: string
  isPending: boolean
  error?: string | null
  onSubmit: (values: CadenceBuilderValues) => void
}

export function CadenceBuilder(props: CadenceBuilderProps) {
  const { formId, workspaceId, isPending, error, onSubmit } = props
  const templates = useTemplates(workspaceId)
  const [name, setName] = useState('')
  const [steps, setSteps] = useState<CadenceStepDraft[]>([newStepDraft()])
  const [onReplyStageId, setOnReplyStageId] = useState('')

  function submit(event: React.FormEvent) {
    event.preventDefault()
    onSubmit(buildCadenceRequest({ name, steps, onReplyStageId }))
  }

  const templateOptions = (templates.data?.templates ?? []).map((t) => ({
    value: t.id,
    label: t.name,
  }))

  return (
    <form id={formId} className="flex flex-col gap-4" onSubmit={submit}>
      {error && <FormError>{error}</FormError>}
      <Field>
        <FieldLabel htmlFor="cadence-name">Name</FieldLabel>
        <Input
          id="cadence-name"
          value={name}
          required
          disabled={isPending}
          onChange={(e) => setName(e.target.value)}
        />
      </Field>
      <CadenceStepsEditor steps={steps} templates={templateOptions} onChange={setSteps} />
      <Field>
        <FieldLabel htmlFor="onreply-stage">On reply: move to stage id (optional)</FieldLabel>
        <Input
          id="onreply-stage"
          value={onReplyStageId}
          disabled={isPending}
          onChange={(e) => setOnReplyStageId(e.target.value)}
        />
      </Field>
    </form>
  )
}

import { useTemplates } from '@kizunu/api-client/cadence/use-templates'
import { FormError } from '@kizunu/web/components/composed/form-error'
import { Field, FieldLabel } from '@kizunu/web/components/primitives/field'
import { Input } from '@kizunu/web/components/primitives/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kizunu/web/components/primitives/select'
import { Textarea } from '@kizunu/web/components/primitives/textarea'
import { CadencePreview } from '@kizunu/web/routes/_app/workspace/cadences/-components/cadence-preview'
import {
  type CadenceStepDraft,
  newStepDraft,
} from '@kizunu/web/routes/_app/workspace/cadences/-components/cadence-step-row'
import { CadenceStepsEditor } from '@kizunu/web/routes/_app/workspace/cadences/-components/cadence-steps-editor'
import { buildCadenceRequest } from '@kizunu/web/routes/_app/workspace/cadences/-utils/build-cadence-request'
import {
  parseSendingWindowPresetKey,
  SENDING_WINDOW_PRESETS,
  type SendingWindowPresetKey,
} from '@kizunu/web/routes/_app/workspace/cadences/-utils/sending-window-presets'
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
  const [onReplyTaskSubject, setOnReplyTaskSubject] = useState('')
  const [onReplyTaskNote, setOnReplyTaskNote] = useState('')
  const [onExhaustedLostReason, setOnExhaustedLostReason] = useState('')
  const [sendingWindowPreset, setSendingWindowPreset] =
    useState<SendingWindowPresetKey>('always_on')

  const current = buildCadenceRequest({
    name,
    steps,
    onReplyStageId,
    onReplyTaskSubject,
    onReplyTaskNote,
    onExhaustedLostReason,
    sendingWindowPreset,
  })

  function submit(event: React.FormEvent) {
    event.preventDefault()
    onSubmit(current)
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
      <Field>
        <FieldLabel htmlFor="onreply-task-subject">
          On reply: BDR task subject (optional)
        </FieldLabel>
        <Input
          id="onreply-task-subject"
          placeholder="Lead replied — assume conversation"
          value={onReplyTaskSubject}
          disabled={isPending}
          onChange={(e) => setOnReplyTaskSubject(e.target.value)}
        />
      </Field>
      {onReplyTaskSubject.trim().length > 0 && (
        <Field>
          <FieldLabel htmlFor="onreply-task-note">On reply: BDR task note (optional)</FieldLabel>
          <Textarea
            id="onreply-task-note"
            value={onReplyTaskNote}
            disabled={isPending}
            onChange={(e) => setOnReplyTaskNote(e.target.value)}
          />
        </Field>
      )}
      <Field>
        <FieldLabel htmlFor="onexhausted-lost-reason">
          On exhausted: mark lost reason (optional)
        </FieldLabel>
        <Input
          id="onexhausted-lost-reason"
          placeholder="No reply after cadence completed"
          value={onExhaustedLostReason}
          disabled={isPending}
          onChange={(e) => setOnExhaustedLostReason(e.target.value)}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="sending-window-preset">Sending window</FieldLabel>
        <Select
          value={sendingWindowPreset}
          onValueChange={(value) => setSendingWindowPreset(parseSendingWindowPresetKey(value))}
          disabled={isPending}
        >
          <SelectTrigger id="sending-window-preset">
            <SelectValue>
              {(value: string) =>
                SENDING_WINDOW_PRESETS.find((preset) => preset.key === value)?.label ?? value
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {SENDING_WINDOW_PRESETS.map((preset) => (
              <SelectItem key={preset.key} value={preset.key}>
                {preset.label} — {preset.description}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <CadencePreview cadence={current} />
    </form>
  )
}

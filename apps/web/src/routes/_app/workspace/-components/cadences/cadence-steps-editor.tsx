import { Button } from '@kizunu/web/components/primitives/button'
import {
  type CadenceStepDraft,
  CadenceStepRow,
  newStepDraft,
} from '@kizunu/web/routes/_app/workspace/-components/cadences/cadence-step-row'

export function CadenceStepsEditor({
  steps,
  templates,
  onChange,
}: {
  steps: CadenceStepDraft[]
  templates: Array<{ value: string; label: string }>
  onChange: (steps: CadenceStepDraft[]) => void
}) {
  function update(id: string, patch: Partial<CadenceStepDraft>) {
    onChange(steps.map((step) => (step.id === id ? { ...step, ...patch } : step)))
  }

  return (
    <div className="flex flex-col gap-2">
      {steps.map((step) => (
        <CadenceStepRow
          key={step.id}
          step={step}
          templates={templates}
          onChange={(patch) => update(step.id, patch)}
          onRemove={() => onChange(steps.filter((s) => s.id !== step.id))}
        />
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...steps, newStepDraft()])}
      >
        Add step
      </Button>
    </div>
  )
}

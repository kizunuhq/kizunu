import { LookupSelect } from '@kizunu/web/components/lookup-select'
import { Button } from '@kizunu/web/components/primitives/button'
import { Input } from '@kizunu/web/components/primitives/input'
import { PluginSelect } from '@kizunu/web/features/channel/components/plugin-select'

export interface CadenceStepDraft {
  id: string
  channelPluginId: string
  templateId: string
  delayMinutes: number
}

export function newStepDraft(): CadenceStepDraft {
  return { id: crypto.randomUUID(), channelPluginId: '', templateId: '', delayMinutes: 60 }
}

export function CadenceStepRow({
  step,
  templates,
  onChange,
  onRemove,
}: {
  step: CadenceStepDraft
  templates: Array<{ value: string; label: string }>
  onChange: (patch: Partial<CadenceStepDraft>) => void
  onRemove: () => void
}) {
  return (
    <div className="flex items-end gap-2">
      <div className="flex-1">
        <PluginSelect
          value={step.channelPluginId}
          onChange={(v) => onChange({ channelPluginId: v })}
        />
      </div>
      <div className="flex-1">
        <LookupSelect
          value={step.templateId}
          placeholder="Template (optional)"
          options={templates}
          onChange={(v) => onChange({ templateId: v })}
        />
      </div>
      <Input
        type="number"
        min={0}
        value={step.delayMinutes}
        className="w-24"
        onChange={(e) => onChange({ delayMinutes: Number(e.target.value) })}
      />
      <Button type="button" variant="outline" size="sm" onClick={onRemove}>
        Remove
      </Button>
    </div>
  )
}

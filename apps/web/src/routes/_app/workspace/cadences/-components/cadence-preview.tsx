import type { CadenceAction, CadenceRequest } from '@kizunu/api-contracts/cadence'
import { Card, CardContent, CardHeader, CardTitle } from '@kizunu/web/components/primitives/card'

interface CadencePreviewProps {
  cadence: CadenceRequest
}

const MINUTES_PER_HOUR = 60
const MINUTES_PER_DAY = 24 * MINUTES_PER_HOUR

function formatDelay(minutes: number): string {
  if (minutes === 0) return 'immediately'
  if (minutes < MINUTES_PER_HOUR) return `${minutes}m`
  if (minutes < MINUTES_PER_DAY) {
    const hours = Math.floor(minutes / MINUTES_PER_HOUR)
    const remainder = minutes % MINUTES_PER_HOUR
    return remainder === 0 ? `${hours}h` : `${hours}h ${remainder}m`
  }
  const days = Math.floor(minutes / MINUTES_PER_DAY)
  const remainder = minutes % MINUTES_PER_DAY
  return remainder === 0 ? `${days}d` : `${days}d ${Math.floor(remainder / MINUTES_PER_HOUR)}h`
}

function describeAction(action: CadenceAction): string {
  if (action.type === 'move_stage') return `Move deal to stage ${action.stageId}`
  if (action.type === 'mark_lost') return `Mark lost: ${action.reason}`
  if (action.type === 'log_activity') return `Log ${action.activityType}: ${action.subject}`
  if (action.type === 'notify_user') return `Notify user ${action.userId}`
  if (action.type === 'set_field') return `Set ${action.key} = ${action.value}`
  return `Webhook → ${action.url}`
}

export function CadencePreview({ cadence }: CadencePreviewProps) {
  const stepCount = cadence.steps.length
  const totalDelay = cadence.steps.reduce((acc, step) => acc + step.delayMinutes, 0)
  const windowLabel = cadence.sendingWindow ? 'Custom window' : 'Always on'

  return (
    <Card className="border-border bg-muted/20">
      <CardHeader>
        <CardTitle className="text-base">Preview</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        {stepCount === 0 ? (
          <p className="text-muted-foreground">Add at least one step to preview the cadence.</p>
        ) : (
          <>
            <PreviewRow label="Steps">
              <span>
                {stepCount} step{stepCount === 1 ? '' : 's'}
              </span>
              <span className="text-muted-foreground">
                {' '}
                · total delay {formatDelay(totalDelay)}
              </span>
            </PreviewRow>
            <PreviewRow label="Sending window">
              <span>{windowLabel}</span>
            </PreviewRow>
            <PreviewRow label="On reply">
              {cadence.onReply.length === 0 ? (
                <span className="text-muted-foreground">No actions configured</span>
              ) : (
                <ActionList actions={cadence.onReply} />
              )}
            </PreviewRow>
            <PreviewRow label="On exhausted">
              {cadence.onExhausted.length === 0 ? (
                <span className="text-muted-foreground">No actions configured</span>
              ) : (
                <ActionList actions={cadence.onExhausted} />
              )}
            </PreviewRow>
            <PreviewRow label="Channel">
              <span>Lead owner's primary channel</span>
            </PreviewRow>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function PreviewRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[7rem_1fr] items-start gap-3">
      <span className="text-muted-foreground font-mono text-xs tracking-wide uppercase">
        {label}
      </span>
      <div className="text-foreground">{children}</div>
    </div>
  )
}

function ActionList({ actions }: { actions: CadenceAction[] }) {
  return (
    <ul className="flex flex-col gap-1">
      {actions.map((action, index) => (
        <li key={`${action.type}-${index}`}>{describeAction(action)}</li>
      ))}
    </ul>
  )
}

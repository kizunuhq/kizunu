import type { ConnectorHealth } from '@kizunu/api-contracts/crm'
import { ConnectorHealthOverall } from '@kizunu/api-contracts/crm'
import { Button } from '@kizunu/web/components/primitives/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@kizunu/web/components/primitives/tooltip'
import { ArrowsClockwise, Spinner } from '@phosphor-icons/react'

interface ConnectorHealthPillProps {
  health: ConnectorHealth | undefined
  isPending: boolean
  onRefresh: () => void
}

const OVERALL_STYLES: Record<ConnectorHealth['overall'], { label: string; className: string }> = {
  [ConnectorHealthOverall.Ready]: {
    label: 'Ready',
    className: 'bg-green-50 text-green-700 ring-green-600/20',
  },
  [ConnectorHealthOverall.Degraded]: {
    label: 'Degraded',
    className: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  },
  [ConnectorHealthOverall.Unreachable]: {
    label: 'Unreachable',
    className: 'bg-red-50 text-red-700 ring-red-600/20',
  },
}

export function ConnectorHealthPill({ health, isPending, onRefresh }: ConnectorHealthPillProps) {
  if (isPending && !health) {
    return (
      <span className="bg-muted text-muted-foreground inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs">
        <Spinner className="animate-spin" /> Checking…
      </span>
    )
  }
  if (!health) {
    return null
  }
  const style = OVERALL_STYLES[health.overall]
  return (
    <span className="inline-flex items-center gap-2">
      <Tooltip>
        <TooltipTrigger
          render={
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${style.className}`}
            >
              {style.label}
            </span>
          }
        />
        <TooltipContent side="bottom" className="max-w-xs">
          <HealthTooltipBody health={health} />
        </TooltipContent>
      </Tooltip>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={onRefresh}
        disabled={isPending}
        aria-label="Refresh health"
      >
        {isPending ? <Spinner className="animate-spin" /> : <ArrowsClockwise />}
      </Button>
    </span>
  )
}

function HealthTooltipBody({ health }: { health: ConnectorHealth }) {
  const failing = health.checks.filter((check) => check.status === 'fail')
  if (failing.length === 0) {
    return <span className="text-xs">All checks passed</span>
  }
  return (
    <ul className="flex flex-col gap-1 text-xs">
      {failing.map((check) => (
        <li key={check.id}>
          <span className="font-medium">{check.label}</span>
          {check.detail ? <span className="text-muted-foreground"> — {check.detail}</span> : null}
        </li>
      ))}
    </ul>
  )
}

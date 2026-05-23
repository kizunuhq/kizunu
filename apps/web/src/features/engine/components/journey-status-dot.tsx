import type { LeadJourneyStatusValue } from '@kizunu/api-contracts/engine'
import { cn } from '@kizunu/web/lib/utils'

const STATUS_DOT: Record<LeadJourneyStatusValue, string> = {
  running: 'bg-foreground/60',
  paused: 'bg-foreground/40',
  replied: 'bg-kizunu-green',
  exhausted: 'bg-kizunu-yellow-600',
  stopped: 'bg-foreground/40',
  error_state: 'bg-kizunu-pink',
  paused_owner_inactive: 'bg-kizunu-yellow-600',
}

interface JourneyStatusDotProps {
  status: LeadJourneyStatusValue
  className?: string
}

export function JourneyStatusDot({ status, className }: JourneyStatusDotProps) {
  return <span className={cn('inline-block size-2 rounded-full', STATUS_DOT[status], className)} />
}

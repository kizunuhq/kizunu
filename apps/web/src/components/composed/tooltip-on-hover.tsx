import { Kbd } from '@kizunu/web/components/composed/kbd'
import { Tooltip, TooltipContent, TooltipTrigger } from '@kizunu/web/components/primitives/tooltip'
import type { ReactNode } from 'react'

type TooltipSide = 'top' | 'right' | 'bottom' | 'left'

interface TooltipOnHoverProps {
  label: string
  shortcut?: string
  side?: TooltipSide
  children: ReactNode
}

export function TooltipOnHover({ label, shortcut, side = 'top', children }: TooltipOnHoverProps) {
  return (
    <Tooltip>
      <TooltipTrigger render={<span className="inline-flex">{children}</span>} />
      <TooltipContent side={side} className="flex items-center gap-1.5">
        <span className="text-xs">{label}</span>
        {shortcut ? <Kbd>{shortcut}</Kbd> : null}
      </TooltipContent>
    </Tooltip>
  )
}

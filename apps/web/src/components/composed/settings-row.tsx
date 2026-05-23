import { cn } from '@kizunu/web/lib/utils'
import type { ReactNode } from 'react'

type SettingsRowVariant = 'default' | 'danger'

interface SettingsRowProps {
  title: string
  description?: string
  action?: ReactNode
  variant?: SettingsRowVariant
}

export function SettingsRow({ title, description, action, variant = 'default' }: SettingsRowProps) {
  const isDanger = variant === 'danger'
  return (
    <div
      className={cn(
        'border-border flex items-start justify-between gap-4 border-t p-4 first:border-t-0',
        isDanger && 'border-destructive/30',
      )}
    >
      <div className="flex min-w-0 flex-col gap-1">
        <p className={cn('text-sm font-medium', isDanger && 'text-destructive')}>{title}</p>
        {description ? <p className="text-muted-foreground text-sm">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

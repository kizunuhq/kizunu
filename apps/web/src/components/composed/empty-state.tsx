import type { ReactNode } from 'react'

interface EmptyStateProps {
  title: string
  description?: string
  icon?: ReactNode
  action?: ReactNode
}

export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <div className="border-border bg-background-200 flex flex-col items-center justify-center gap-3 rounded-[2px] border p-10 text-center">
      {icon ? <div className="text-muted-foreground [&>svg]:size-6">{icon}</div> : null}
      <p className="text-foreground text-base font-medium">{title}</p>
      {description ? <p className="text-muted-foreground max-w-md text-sm">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  )
}

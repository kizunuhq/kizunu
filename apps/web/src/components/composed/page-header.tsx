import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  description?: string
  kicker?: string
  actions?: ReactNode
}

export function PageHeader({ title, description, kicker, actions }: PageHeaderProps) {
  return (
    <header className="flex items-end justify-between gap-4 pb-4">
      <div className="flex flex-col gap-1">
        {kicker ? (
          <p className="text-kizunu-green font-mono text-xs font-medium">[{kicker}]</p>
        ) : null}
        <h1 className="text-foreground text-lg font-medium">{title}</h1>
        {description ? <p className="text-muted-foreground text-sm">{description}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </header>
  )
}

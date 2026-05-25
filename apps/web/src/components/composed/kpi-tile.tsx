import { Skeleton } from '@kizunu/web/components/primitives/skeleton'
import { cn } from '@kizunu/web/lib/utils'
import type { ReactNode } from 'react'

type KpiAccent = 'default' | 'success' | 'warning' | 'danger'

interface KpiTileProps {
  label: string
  value: ReactNode
  subtitle?: string
  isPending?: boolean
  accent?: KpiAccent
}

const ACCENT_DOT: Record<KpiAccent, string> = {
  default: 'hidden',
  success: 'bg-kizunu-green',
  warning: 'bg-kizunu-yellow-600',
  danger: 'bg-kizunu-pink',
}

export function KpiTile({ label, value, subtitle, isPending, accent = 'default' }: KpiTileProps) {
  return (
    <div className="border-border bg-background flex flex-col gap-2 rounded-[2px] border p-4">
      <p className="text-muted-foreground font-mono text-xs tracking-wide uppercase">{label}</p>
      {isPending ? (
        <Skeleton className="h-8 w-20" />
      ) : (
        <div className="flex items-center gap-2">
          <span className={cn('inline-block size-2 rounded-full', ACCENT_DOT[accent])} />
          <span className="text-foreground font-mono text-2xl font-medium">{value}</span>
        </div>
      )}
      {subtitle && !isPending ? (
        <p className="text-muted-foreground truncate font-mono text-xs" title={subtitle}>
          {subtitle}
        </p>
      ) : null}
    </div>
  )
}

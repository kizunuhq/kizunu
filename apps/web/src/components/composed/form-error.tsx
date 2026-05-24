import { cn } from '@kizunu/web/lib/utils'
import type { ReactNode } from 'react'

interface FormErrorProps {
  children: ReactNode
  className?: string
}

export function FormError({ children, className }: FormErrorProps) {
  return (
    <div
      role="alert"
      className={cn(
        'border-destructive/30 bg-destructive/5 text-destructive rounded-md border px-3 py-2 text-sm',
        className,
      )}
    >
      {children}
    </div>
  )
}

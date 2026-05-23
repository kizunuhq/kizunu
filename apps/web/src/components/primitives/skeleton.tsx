import { cn } from '@kizunu/web/lib/utils'

function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn('bg-background-200 rounded-[2px]', className)}
      {...props}
    />
  )
}

export { Skeleton }

import { Button } from '@kizunu/web/components/primitives/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@kizunu/web/components/primitives/dialog'
import { cn } from '@kizunu/web/lib/utils'
import type { ReactNode } from 'react'

interface ResourceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  formId?: string
  onAction?: () => void
  actionLabel: string
  cancelLabel?: string
  isPending?: boolean
  isActionEnabled?: boolean
  tone?: 'default' | 'destructive'
  size?: 'md' | 'lg'
  children: ReactNode
}

export function ResourceDialog(props: ResourceDialogProps) {
  const {
    open,
    onOpenChange,
    title,
    description,
    formId,
    onAction,
    actionLabel,
    cancelLabel = 'Cancel',
    isPending,
    isActionEnabled = true,
    tone = 'default',
    size = 'md',
    children,
  } = props

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(size === 'lg' ? 'sm:max-w-lg' : 'sm:max-w-md')}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto py-1">{children}</div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            {cancelLabel}
          </Button>
          <Button
            variant={tone === 'destructive' ? 'destructive' : 'default'}
            disabled={!isActionEnabled}
            loading={isPending}
            form={formId}
            type={formId ? 'submit' : 'button'}
            onClick={formId ? undefined : onAction}
          >
            {actionLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

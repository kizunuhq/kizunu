import { Button } from '@kizunu/web/components/primitives/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@kizunu/web/components/primitives/dialog'
import type { ReactNode } from 'react'

interface ResourceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  formId?: string
  onAction?: () => void
  actionLabel: string
  isPending?: boolean
  isActionEnabled?: boolean
  tone?: 'default' | 'destructive'
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
    isPending,
    isActionEnabled = true,
    tone = 'default',
    children,
  } = props

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto py-1">{children}</div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button
            variant={tone === 'destructive' ? 'destructive' : 'default'}
            disabled={isPending || !isActionEnabled}
            form={formId}
            type={formId ? 'submit' : 'button'}
            onClick={formId ? undefined : onAction}
          >
            {isPending ? 'Working…' : actionLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

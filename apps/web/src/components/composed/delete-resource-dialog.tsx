import { FormError } from '@kizunu/web/components/composed/form-error'
import { ResourceDialog } from '@kizunu/web/components/composed/resource-dialog'
import { Input } from '@kizunu/web/components/primitives/input'
import { Label } from '@kizunu/web/components/primitives/label'
import { useEffect, useState } from 'react'

interface DeleteResourceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  resourceType: string
  resourceName: string
  onDelete: () => void
  isDeleting?: boolean
  errorMessage?: string | null
}

export function DeleteResourceDialog(props: DeleteResourceDialogProps) {
  const { open, onOpenChange, resourceType, resourceName, onDelete, isDeleting, errorMessage } =
    props
  const [confirmation, setConfirmation] = useState('')

  useEffect(() => {
    if (!open) setConfirmation('')
  }, [open])

  const isConfirmed = confirmation.trim().toLowerCase() === resourceName.toLowerCase()

  return (
    <ResourceDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Delete ${resourceType}`}
      actionLabel={`Delete ${resourceType}`}
      tone="destructive"
      isPending={isDeleting}
      isActionEnabled={isConfirmed}
      onAction={onDelete}
    >
      <div className="space-y-3">
        {errorMessage && <FormError>{errorMessage}</FormError>}
        <p className="text-sm">
          This action is irreversible. Type{' '}
          <span className="text-foreground font-medium">{resourceName}</span> to confirm.
        </p>
        <div className="space-y-1.5">
          <Label htmlFor="delete-confirmation" className="sr-only">
            Type {resourceName} to confirm
          </Label>
          <Input
            id="delete-confirmation"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            placeholder={resourceName}
            disabled={isDeleting}
            autoComplete="off"
          />
        </div>
      </div>
    </ResourceDialog>
  )
}

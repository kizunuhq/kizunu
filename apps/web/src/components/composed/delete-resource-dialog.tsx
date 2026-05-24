import { FormError } from '@kizunu/web/components/composed/form-error'
import { ResourceDialog } from '@kizunu/web/components/composed/resource-dialog'
import { Input } from '@kizunu/web/components/primitives/input'
import { Label } from '@kizunu/web/components/primitives/label'
import { useCopyToClipboard } from '@kizunu/web/lib/use-copy-to-clipboard'
import { cn } from '@kizunu/web/lib/utils'
import { Check, Copy } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'

interface DeleteResourceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  resourceType: string
  resourceName: string
  onDelete: () => void
  isDeleting?: boolean
  errorMessage?: string | null
  caseSensitive?: boolean
}

export function DeleteResourceDialog(props: DeleteResourceDialogProps) {
  const { open, onOpenChange, resourceType, resourceName, onDelete } = props
  const { isDeleting, errorMessage, caseSensitive = false } = props
  const [confirmation, setConfirmation] = useState('')

  useEffect(() => {
    if (!open) setConfirmation('')
  }, [open])

  const normalize = (value: string) => (caseSensitive ? value : value.toLowerCase())
  const isConfirmed = normalize(confirmation.trim()) === normalize(resourceName)

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
      <DeleteResourceDialogBody
        resourceName={resourceName}
        errorMessage={errorMessage}
        confirmation={confirmation}
        onConfirmationChange={setConfirmation}
        isDeleting={isDeleting}
      />
    </ResourceDialog>
  )
}

interface BodyProps {
  resourceName: string
  errorMessage?: string | null
  confirmation: string
  onConfirmationChange: (value: string) => void
  isDeleting?: boolean
}

function DeleteResourceDialogBody(props: BodyProps) {
  const { resourceName, errorMessage, confirmation, onConfirmationChange, isDeleting } = props

  return (
    <div className="space-y-3">
      {errorMessage && <FormError>{errorMessage}</FormError>}
      <p className="text-sm">
        This action is irreversible. Type <NameCopyButton name={resourceName} /> to confirm.
      </p>
      <div className="space-y-1.5">
        <Label htmlFor="delete-confirmation" className="sr-only">
          Type {resourceName} to confirm
        </Label>
        <Input
          id="delete-confirmation"
          value={confirmation}
          onChange={(event) => onConfirmationChange(event.target.value)}
          placeholder={resourceName}
          disabled={isDeleting}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
        />
      </div>
    </div>
  )
}

function NameCopyButton({ name }: { name: string }) {
  const { copied, copy } = useCopyToClipboard(name)

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`Copy ${name} to clipboard`}
      className={cn(
        'bg-muted text-foreground hover:bg-muted/80 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-xs font-medium',
      )}
    >
      <span>{name}</span>
      {copied ? <Check size={12} weight="bold" /> : <Copy size={12} weight="bold" />}
    </button>
  )
}

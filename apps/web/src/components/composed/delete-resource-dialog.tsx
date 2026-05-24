import { FormError } from '@kizunu/web/components/composed/form-error'
import { ResourceDialog } from '@kizunu/web/components/composed/resource-dialog'
import { Input } from '@kizunu/web/components/primitives/input'
import { Label } from '@kizunu/web/components/primitives/label'
import { cn } from '@kizunu/web/lib/utils'
import { Check, Copy } from '@phosphor-icons/react'
import { useCallback, useEffect, useState } from 'react'

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

const COPY_FLIP_MS = 1500

export function DeleteResourceDialog(props: DeleteResourceDialogProps) {
  const { open, onOpenChange, resourceType, resourceName, onDelete } = props
  const { isDeleting, errorMessage, caseSensitive = false } = props
  const [confirmation, setConfirmation] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!open) {
      setConfirmation('')
      setCopied(false)
    }
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
        copied={copied}
        onCopiedChange={setCopied}
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
  copied: boolean
  onCopiedChange: (value: boolean) => void
  isDeleting?: boolean
}

function DeleteResourceDialogBody(props: BodyProps) {
  const { resourceName, errorMessage, confirmation, onConfirmationChange } = props
  const { copied, onCopiedChange, isDeleting } = props

  return (
    <div className="space-y-3">
      {errorMessage && <FormError>{errorMessage}</FormError>}
      <p className="text-sm">
        This action is irreversible. Type{' '}
        <NameCopyButton name={resourceName} copied={copied} onCopiedChange={onCopiedChange} /> to
        confirm.
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

interface NameCopyButtonProps {
  name: string
  copied: boolean
  onCopiedChange: (value: boolean) => void
}

function NameCopyButton({ name, copied, onCopiedChange }: NameCopyButtonProps) {
  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(name)
    onCopiedChange(true)
    setTimeout(() => onCopiedChange(false), COPY_FLIP_MS)
  }, [name, onCopiedChange])

  return (
    <button
      type="button"
      onClick={handleCopy}
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

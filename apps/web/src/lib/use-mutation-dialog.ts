import { getApiErrorMessage } from '@kizunu/web/lib/get-api-error-message'
import { useCallback, useEffect, useState } from 'react'

interface UseMutationDialogOptions {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function useMutationDialog({ open, onOpenChange }: UseMutationDialogOptions) {
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) setError(null)
  }, [open])

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) setError(null)
      onOpenChange(next)
    },
    [onOpenChange],
  )

  const close = useCallback(() => onOpenChange(false), [onOpenChange])
  const clearError = useCallback(() => setError(null), [])
  const captureError = useCallback((err: unknown) => setError(getApiErrorMessage(err)), [])

  return { error, handleOpenChange, close, clearError, captureError }
}

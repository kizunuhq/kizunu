import { useCallback, useEffect, useRef, useState } from 'react'

const REVERT_AFTER_MS = 1500

export function useCopyToClipboard(text: string) {
  const [copied, setCopied] = useState(false)
  const revertTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (revertTimer.current) clearTimeout(revertTimer.current)
    }
  }, [])

  const copy = useCallback(async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    if (revertTimer.current) clearTimeout(revertTimer.current)
    revertTimer.current = setTimeout(() => setCopied(false), REVERT_AFTER_MS)
  }, [text])

  return { copied, copy }
}

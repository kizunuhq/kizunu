import { useEffect } from 'react'

interface UseHotkeyOptions {
  enabled?: boolean
}

const OPEN_OVERLAY_SELECTOR =
  '[data-state="open"][role="dialog"], [data-state="open"][role="menu"], [data-open][role="dialog"], [data-open][role="menu"]'

export function useHotkey(key: string, handler: () => void, options: UseHotkeyOptions = {}) {
  const enabled = options.enabled !== false
  useEffect(() => {
    if (!enabled) return undefined
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== key) return
      if (isInteractiveTarget(event.target)) return
      if (isOverlayOpen()) return
      handler()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [key, handler, enabled])
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  if (target.getAttribute('contenteditable') === 'true') return true
  const tagName = target.tagName
  return tagName === 'INPUT' || tagName === 'TEXTAREA'
}

function isOverlayOpen(): boolean {
  return Boolean(document.querySelector(OPEN_OVERLAY_SELECTOR))
}

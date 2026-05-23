import { useHotkey } from '@kizunu/web/hooks/use-hotkey'
import { renderHook } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

describe('useHotkey', () => {
  let handler: ReturnType<typeof vi.fn<() => void>>
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    handler = vi.fn<() => void>()
    user = userEvent.setup()
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('fires the handler when the key is pressed with no overlay open', async () => {
    renderHook(() => useHotkey('[', () => handler()))

    await user.keyboard('[[')

    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('does not fire when the focused element is an input', async () => {
    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()

    renderHook(() => useHotkey('[', () => handler()))

    await user.keyboard('[[')

    expect(handler).not.toHaveBeenCalled()
  })

  it('does not fire when the focused element is a textarea', async () => {
    const textarea = document.createElement('textarea')
    document.body.appendChild(textarea)
    textarea.focus()

    renderHook(() => useHotkey('[', () => handler()))

    await user.keyboard('[[')

    expect(handler).not.toHaveBeenCalled()
  })

  it('does not fire when the focused element is contentEditable', async () => {
    const div = document.createElement('div')
    div.setAttribute('contenteditable', 'true')
    div.tabIndex = 0
    document.body.appendChild(div)
    div.focus()

    renderHook(() => useHotkey('[', () => handler()))

    await user.keyboard('[[')

    expect(handler).not.toHaveBeenCalled()
  })

  it('does not fire when an open dialog is present in the document', async () => {
    const dialog = document.createElement('div')
    dialog.setAttribute('data-state', 'open')
    dialog.setAttribute('role', 'dialog')
    document.body.appendChild(dialog)

    renderHook(() => useHotkey('[', () => handler()))

    await user.keyboard('[[')

    expect(handler).not.toHaveBeenCalled()
  })

  it('does not bind the listener when options.enabled is false', async () => {
    renderHook(() => useHotkey('[', () => handler(), { enabled: false }))

    await user.keyboard('[[')

    expect(handler).not.toHaveBeenCalled()
  })
})

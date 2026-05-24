import { useCopyToClipboard } from '@kizunu/web/lib/use-copy-to-clipboard'
import { act, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

const clipboardWriteText = vi.fn()

beforeEach(() => {
  clipboardWriteText.mockResolvedValue(undefined)
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: clipboardWriteText },
    configurable: true,
    writable: true,
  })
})

afterEach(() => {
  clipboardWriteText.mockReset()
})

function Harness({ text }: { text: string }) {
  const { copied, copy } = useCopyToClipboard(text)
  return (
    <button type="button" onClick={copy}>
      {copied ? 'copied' : 'idle'}
    </button>
  )
}

describe('useCopyToClipboard', () => {
  it('writes the text and sets copied=true after click', async () => {
    render(<Harness text="abc" />)

    const button = screen.getByRole('button')
    expect(button).toHaveTextContent('idle')

    await act(async () => {
      button.click()
    })

    await waitFor(() => expect(clipboardWriteText).toHaveBeenCalledWith('abc'))
    expect(button).toHaveTextContent('copied')
  })

  it('reverts copied=false after the revert window elapses', async () => {
    render(<Harness text="abc" />)

    const button = screen.getByRole('button')

    await act(async () => {
      button.click()
    })
    await waitFor(() => expect(button).toHaveTextContent('copied'))

    await waitFor(() => expect(button).toHaveTextContent('idle'), { timeout: 2500 })
  })

  it('cleans the pending timer when the component unmounts without throwing', async () => {
    const { unmount } = render(<Harness text="abc" />)

    await act(async () => {
      screen.getByRole('button').click()
    })

    expect(() => unmount()).not.toThrow()
  })
})

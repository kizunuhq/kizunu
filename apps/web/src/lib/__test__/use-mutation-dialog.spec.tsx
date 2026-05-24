import { ApiError } from '@kizunu/api-client/client/api-error'
import { useMutationDialog } from '@kizunu/web/lib/use-mutation-dialog'
import { act, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vite-plus/test'

interface HarnessProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  trigger: 'capture' | 'clear' | 'closeBtn' | 'openTrue' | 'openFalse'
  error?: unknown
}

function Harness(props: HarnessProps) {
  const { open, onOpenChange, trigger, error } = props
  const dialog = useMutationDialog({ open, onOpenChange })

  function go() {
    if (trigger === 'capture' && error !== undefined) dialog.captureError(error)
    if (trigger === 'clear') dialog.clearError()
    if (trigger === 'closeBtn') dialog.close()
    if (trigger === 'openTrue') dialog.handleOpenChange(true)
    if (trigger === 'openFalse') dialog.handleOpenChange(false)
  }

  return (
    <div>
      <span data-testid="error">{dialog.error ?? 'none'}</span>
      <button type="button" onClick={go}>
        run
      </button>
    </div>
  )
}

describe('useMutationDialog', () => {
  it('captures an API error via getApiErrorMessage', () => {
    const apiError = new ApiError(422, 'workspace.full', 'Workspace is full', undefined)
    render(<Harness open onOpenChange={() => {}} trigger="capture" error={apiError} />)

    act(() => {
      screen.getByRole('button').click()
    })

    expect(screen.getByTestId('error')).toHaveTextContent('Workspace is full')
  })

  it('clears the error via clearError', () => {
    const { rerender } = render(
      <Harness open onOpenChange={() => {}} trigger="capture" error={new Error('boom')} />,
    )
    act(() => {
      screen.getByRole('button').click()
    })
    expect(screen.getByTestId('error')).toHaveTextContent('boom')

    rerender(<Harness open onOpenChange={() => {}} trigger="clear" />)
    act(() => {
      screen.getByRole('button').click()
    })
    expect(screen.getByTestId('error')).toHaveTextContent('none')
  })

  it('resets the error when open transitions to false', () => {
    const { rerender } = render(
      <Harness open onOpenChange={() => {}} trigger="capture" error={new Error('boom')} />,
    )
    act(() => {
      screen.getByRole('button').click()
    })
    expect(screen.getByTestId('error')).toHaveTextContent('boom')

    rerender(<Harness open={false} onOpenChange={() => {}} trigger="capture" />)

    expect(screen.getByTestId('error')).toHaveTextContent('none')
  })

  it('handleOpenChange forwards true without clearing', () => {
    const onOpenChange = vi.fn()
    render(<Harness open onOpenChange={onOpenChange} trigger="openTrue" />)

    act(() => {
      screen.getByRole('button').click()
    })

    expect(onOpenChange).toHaveBeenCalledWith(true)
  })

  it('handleOpenChange clears error before forwarding false', () => {
    const onOpenChange = vi.fn()
    const { rerender } = render(
      <Harness open onOpenChange={onOpenChange} trigger="capture" error={new Error('boom')} />,
    )
    act(() => {
      screen.getByRole('button').click()
    })
    expect(screen.getByTestId('error')).toHaveTextContent('boom')

    rerender(<Harness open onOpenChange={onOpenChange} trigger="openFalse" />)
    act(() => {
      screen.getByRole('button').click()
    })

    expect(screen.getByTestId('error')).toHaveTextContent('none')
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('close fires onOpenChange(false)', () => {
    const onOpenChange = vi.fn()
    render(<Harness open onOpenChange={onOpenChange} trigger="closeBtn" />)

    act(() => {
      screen.getByRole('button').click()
    })

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})

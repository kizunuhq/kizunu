import { DeleteResourceDialog } from '@kizunu/web/components/composed/delete-resource-dialog'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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
  vi.useRealTimers()
})

describe('DeleteResourceDialog', () => {
  it('disables the action button until the resource name is typed', async () => {
    const onDelete = vi.fn()
    const user = userEvent.setup()
    render(
      <DeleteResourceDialog
        open
        onOpenChange={() => {}}
        resourceType="cadence"
        resourceName="Acme Outreach"
        onDelete={onDelete}
      />,
    )

    const action = screen.getByRole('button', { name: 'Delete cadence' })

    expect(action).toBeDisabled()

    await user.type(screen.getByPlaceholderText('Acme Outreach'), 'acme outreach')
    expect(action).not.toBeDisabled()

    await user.click(action)
    expect(onDelete).toHaveBeenCalledTimes(1)
  })

  it('matches case-insensitively by default', async () => {
    const user = userEvent.setup()
    render(
      <DeleteResourceDialog
        open
        onOpenChange={() => {}}
        resourceType="thing"
        resourceName="Hello World"
        onDelete={() => {}}
      />,
    )

    await user.type(screen.getByPlaceholderText('Hello World'), 'HELLO world')

    expect(screen.getByRole('button', { name: 'Delete thing' })).not.toBeDisabled()
  })

  it('enforces exact case when caseSensitive is true', async () => {
    const user = userEvent.setup()
    render(
      <DeleteResourceDialog
        open
        onOpenChange={() => {}}
        resourceType="thing"
        resourceName="Hello World"
        onDelete={() => {}}
        caseSensitive
      />,
    )

    const action = screen.getByRole('button', { name: 'Delete thing' })

    await user.type(screen.getByPlaceholderText('Hello World'), 'hello world')
    expect(action).toBeDisabled()

    await user.clear(screen.getByPlaceholderText('Hello World'))
    await user.type(screen.getByPlaceholderText('Hello World'), 'Hello World')
    expect(action).not.toBeDisabled()
  })

  it('trims whitespace before comparing', async () => {
    const user = userEvent.setup()
    render(
      <DeleteResourceDialog
        open
        onOpenChange={() => {}}
        resourceType="thing"
        resourceName="name"
        onDelete={() => {}}
      />,
    )

    await user.type(screen.getByPlaceholderText('name'), '   name   ')

    expect(screen.getByRole('button', { name: 'Delete thing' })).not.toBeDisabled()
  })

  it('writes the resource name to the clipboard when the copy button is clicked', async () => {
    render(
      <DeleteResourceDialog
        open
        onOpenChange={() => {}}
        resourceType="thing"
        resourceName="my-thing"
        onDelete={() => {}}
      />,
    )

    const copy = screen.getByRole('button', { name: 'Copy my-thing to clipboard' })

    fireEvent.click(copy)

    await waitFor(() => expect(clipboardWriteText).toHaveBeenCalledWith('my-thing'))
    expect(copy.querySelector('svg')).not.toBeNull()
  })

  it('renders the error message inside the dialog body', () => {
    render(
      <DeleteResourceDialog
        open
        onOpenChange={() => {}}
        resourceType="thing"
        resourceName="x"
        onDelete={() => {}}
        errorMessage="Server said no"
      />,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('Server said no')
  })

  it('does not invoke onDelete when the typed name does not match', async () => {
    const onDelete = vi.fn()
    const user = userEvent.setup()
    render(
      <DeleteResourceDialog
        open
        onOpenChange={() => {}}
        resourceType="thing"
        resourceName="exact"
        onDelete={onDelete}
      />,
    )

    await user.type(screen.getByPlaceholderText('exact'), 'wrong')
    await user.click(screen.getByRole('button', { name: 'Delete thing' }))

    expect(onDelete).not.toHaveBeenCalled()
  })

  it('disables the confirmation input while a delete is in flight', () => {
    render(
      <DeleteResourceDialog
        open
        onOpenChange={() => {}}
        resourceType="thing"
        resourceName="x"
        onDelete={() => {}}
        isDeleting
      />,
    )

    expect(screen.getByPlaceholderText('x')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Delete thing' })).toBeDisabled()
  })

  it('clears the typed confirmation when the dialog closes and reopens', async () => {
    const user = userEvent.setup()
    const { rerender } = render(
      <DeleteResourceDialog
        open
        onOpenChange={() => {}}
        resourceType="thing"
        resourceName="reset-me"
        onDelete={() => {}}
      />,
    )

    await user.type(screen.getByPlaceholderText('reset-me'), 'reset-me')
    expect(screen.getByRole('button', { name: 'Delete thing' })).not.toBeDisabled()

    rerender(
      <DeleteResourceDialog
        open={false}
        onOpenChange={() => {}}
        resourceType="thing"
        resourceName="reset-me"
        onDelete={() => {}}
      />,
    )
    rerender(
      <DeleteResourceDialog
        open
        onOpenChange={() => {}}
        resourceType="thing"
        resourceName="reset-me"
        onDelete={() => {}}
      />,
    )

    expect(screen.getByPlaceholderText('reset-me')).toHaveValue('')
    expect(screen.getByRole('button', { name: 'Delete thing' })).toBeDisabled()
  })

  it('flips the copy button icon to the check state after copying', async () => {
    render(
      <DeleteResourceDialog
        open
        onOpenChange={() => {}}
        resourceType="thing"
        resourceName="copy-me"
        onDelete={() => {}}
      />,
    )

    const copy = screen.getByRole('button', { name: 'Copy copy-me to clipboard' })
    const initialSvgPath = copy.querySelector('svg path')?.getAttribute('d') ?? ''

    fireEvent.click(copy)

    await waitFor(() => expect(clipboardWriteText).toHaveBeenCalledWith('copy-me'))
    await waitFor(() => {
      const next = copy.querySelector('svg path')?.getAttribute('d') ?? ''
      expect(next).not.toBe(initialSvgPath)
    })
  })
})

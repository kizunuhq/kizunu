import { ResourceDialog } from '@kizunu/web/components/composed/resource-dialog'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vite-plus/test'

describe('ResourceDialog', () => {
  it('renders title and children when open', () => {
    render(
      <ResourceDialog open onOpenChange={() => {}} title="New thing" actionLabel="Create">
        <p>Body</p>
      </ResourceDialog>,
    )

    expect(screen.getByRole('heading', { name: 'New thing' })).toBeInTheDocument()
    expect(screen.getByText('Body')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
  })

  it('applies the lg width when size is lg', () => {
    render(
      <ResourceDialog open onOpenChange={() => {}} title="Wide" actionLabel="OK" size="lg">
        <p>Body</p>
      </ResourceDialog>,
    )

    const content = document.querySelector('[data-slot="dialog-content"]')
    expect(content?.className).toContain('sm:max-w-lg')
    expect(content?.className).not.toContain('sm:max-w-md')
  })

  it('applies the md width by default', () => {
    render(
      <ResourceDialog open onOpenChange={() => {}} title="Narrow" actionLabel="OK">
        <p>Body</p>
      </ResourceDialog>,
    )

    const content = document.querySelector('[data-slot="dialog-content"]')
    expect(content?.className).toContain('sm:max-w-md')
    expect(content?.className).not.toContain('sm:max-w-lg')
  })

  it('disables Cancel and spins the action button while pending', () => {
    render(
      <ResourceDialog open onOpenChange={() => {}} title="Saving" actionLabel="Save" isPending>
        <p>Body</p>
      </ResourceDialog>,
    )

    const cancel = screen.getByRole('button', { name: 'Cancel' })
    const action = screen.getByRole('button', { name: 'Save' })

    expect(cancel).toBeDisabled()
    expect(action).toBeDisabled()
    expect(action.querySelector('[data-slot="button-spinner"]')).not.toBeNull()
  })

  it('disables the action button when isActionEnabled is false', () => {
    render(
      <ResourceDialog
        open
        onOpenChange={() => {}}
        title="Pick"
        actionLabel="OK"
        isActionEnabled={false}
      >
        <p>Body</p>
      </ResourceDialog>,
    )

    expect(screen.getByRole('button', { name: 'OK' })).toBeDisabled()
  })

  it('calls onAction when the action button is clicked in non-form mode', async () => {
    const onAction = vi.fn()
    const user = userEvent.setup()
    render(
      <ResourceDialog
        open
        onOpenChange={() => {}}
        title="Confirm"
        actionLabel="Confirm"
        onAction={onAction}
      >
        <p>Body</p>
      </ResourceDialog>,
    )

    await user.click(screen.getByRole('button', { name: 'Confirm' }))

    expect(onAction).toHaveBeenCalledTimes(1)
  })

  it('binds the action button to a form via the formId prop in form mode', () => {
    render(
      <ResourceDialog
        open
        onOpenChange={() => {}}
        title="Form"
        actionLabel="Submit"
        formId="my-form"
      >
        <form id="my-form" />
      </ResourceDialog>,
    )

    const submit = screen.getByRole('button', { name: 'Submit' })
    expect(submit).toHaveAttribute('type', 'submit')
    expect(submit).toHaveAttribute('form', 'my-form')
  })

  it('closes via the Cancel button by calling onOpenChange(false)', async () => {
    const onOpenChange = vi.fn()
    const user = userEvent.setup()
    render(
      <ResourceDialog open onOpenChange={onOpenChange} title="X" actionLabel="OK">
        <p>Body</p>
      </ResourceDialog>,
    )

    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('renders the destructive action variant when tone is destructive', () => {
    render(
      <ResourceDialog
        open
        onOpenChange={() => {}}
        title="Danger"
        actionLabel="Delete"
        tone="destructive"
      >
        <p>Body</p>
      </ResourceDialog>,
    )

    const action = screen.getByRole('button', { name: 'Delete' })
    expect(action.className).toContain('destructive')
  })
})

import { Button } from '@kizunu/web/components/primitives/button'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vite-plus/test'

describe('Button', () => {
  it('renders children with no spinner by default', () => {
    render(<Button>Save</Button>)

    const button = screen.getByRole('button', { name: 'Save' })

    expect(button).toBeInTheDocument()
    expect(button).not.toBeDisabled()
    expect(button.querySelector('[data-slot="button-spinner"]')).toBeNull()
  })

  it('renders a spinner and stays disabled while loading', () => {
    render(<Button loading>Save</Button>)

    const button = screen.getByRole('button', { name: 'Save' })

    expect(button).toBeDisabled()
    expect(button.querySelector('[data-slot="button-spinner"]')).not.toBeNull()
  })

  it('disables when explicitly disabled even if not loading', () => {
    render(<Button disabled>Save</Button>)

    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
  })

  it('stays disabled when both disabled and loading are true', () => {
    render(
      <Button disabled loading>
        Save
      </Button>,
    )

    const button = screen.getByRole('button', { name: 'Save' })

    expect(button).toBeDisabled()
    expect(button.querySelector('[data-slot="button-spinner"]')).not.toBeNull()
  })
})

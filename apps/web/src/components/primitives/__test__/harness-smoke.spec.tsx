import { Button } from '@kizunu/web/components/primitives/button'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vite-plus/test'

// Smoke test proving the web harness boots: jsx transform, jsdom, alias
// resolution, and jest-dom matchers all work together.
describe('web test harness', () => {
  it('renders a primitive into jsdom and matches with jest-dom', () => {
    render(<Button>Save</Button>)

    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
  })
})

import { LookupSelect } from '@kizunu/web/components/composed/lookup-select'
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vite-plus/test'

const OPTIONS = [
  { value: 'a1b2c3d4-pipedrive-uuid', label: 'Pipedrive — Acme' },
  { value: 'e5f6g7h8-hubspot-uuid', label: 'HubSpot — Beta' },
]

const PLACEHOLDER = 'Select connector'

function setup(value: string) {
  return render(
    <LookupSelect value={value} placeholder={PLACEHOLDER} options={OPTIONS} onChange={() => {}} />,
  )
}

function readTrigger(container: HTMLElement) {
  return container.querySelector('[data-slot="select-value"]')?.textContent ?? ''
}

describe('LookupSelect trigger label resolution', () => {
  it('renders the placeholder when no value is selected', () => {
    const { container } = setup('')

    expect(readTrigger(container)).toBe(PLACEHOLDER)
  })

  it('renders the option label when value matches an option', () => {
    const { container } = setup('a1b2c3d4-pipedrive-uuid')

    expect(readTrigger(container)).toBe('Pipedrive — Acme')
    expect(readTrigger(container)).not.toContain('a1b2c3d4')
  })

  it('renders the placeholder when value is stale and matches no option', () => {
    const { container } = setup('orphaned-uuid-no-longer-exists')

    expect(readTrigger(container)).toBe(PLACEHOLDER)
    expect(readTrigger(container)).not.toContain('orphaned-uuid')
  })
})

import { PluginSelect } from '@kizunu/web/components/composed/plugin-select'
import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'

const { useChannelPluginsMock } = vi.hoisted(() => ({
  useChannelPluginsMock: vi.fn(),
}))

vi.mock('@kizunu/api-client/channel/use-channel-plugins', () => ({
  useChannelPlugins: () => useChannelPluginsMock(),
}))

const PLUGINS = [
  { id: 'meta-whatsapp-cloud', name: 'Meta WhatsApp Cloud' },
  { id: 'pipedrive-token', name: 'Pipedrive (token)' },
]

const PLACEHOLDER = 'Choose a channel plugin'

function setup(value: string) {
  return render(<PluginSelect value={value} onChange={() => {}} />)
}

function readTrigger(container: HTMLElement) {
  return container.querySelector('[data-slot="select-value"]')?.textContent ?? ''
}

beforeEach(() => {
  useChannelPluginsMock.mockReturnValue({ data: { plugins: PLUGINS } })
})

describe('PluginSelect trigger label resolution', () => {
  it('renders the placeholder when no value is selected', () => {
    const { container } = setup('')

    expect(readTrigger(container)).toBe(PLACEHOLDER)
  })

  it('renders the plugin name when value matches a loaded plugin', () => {
    const { container } = setup('meta-whatsapp-cloud')

    expect(readTrigger(container)).toBe('Meta WhatsApp Cloud')
    expect(readTrigger(container)).not.toContain('meta-whatsapp-cloud')
  })

  it('renders the placeholder while the plugins list is still loading', () => {
    useChannelPluginsMock.mockReturnValue({ data: undefined })

    const { container } = setup('meta-whatsapp-cloud')

    expect(readTrigger(container)).toBe(PLACEHOLDER)
    expect(readTrigger(container)).not.toContain('meta-whatsapp-cloud')
  })

  it('renders the placeholder when value is a stale id with no matching plugin', () => {
    const { container } = setup('uninstalled-plugin-id')

    expect(readTrigger(container)).toBe(PLACEHOLDER)
    expect(readTrigger(container)).not.toContain('uninstalled')
  })
})

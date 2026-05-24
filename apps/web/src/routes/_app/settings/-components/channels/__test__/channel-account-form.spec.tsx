import { ChannelAccountForm } from '@kizunu/web/routes/_app/settings/-components/channels/channel-account-form'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'

const { createChannelAccount } = vi.hoisted(() => ({ createChannelAccount: vi.fn() }))

const plugins = [
  {
    id: 'meta-whatsapp',
    name: 'WhatsApp (Meta Cloud API)',
    capabilities: ['freeform'],
    credentialFields: [
      { key: 'wabaId', label: 'WABA ID', type: 'text', required: true },
      { key: 'phoneNumberId', label: 'Phone number ID', type: 'text', required: true },
      { key: 'systemToken', label: 'System token', type: 'secret', required: true },
    ],
  },
  {
    id: 'other',
    name: 'Other channel',
    capabilities: ['freeform'],
    credentialFields: [{ key: 'apiKey', label: 'API key', type: 'secret', required: true }],
  },
]

vi.mock('@kizunu/api-client/channel/use-channel-plugins', () => ({
  useChannelPlugins: () => ({ data: { plugins } }),
}))

vi.mock('@kizunu/api-client/channel/use-create-channel-account', () => ({
  useCreateChannelAccount: () => ({ createChannelAccount, isPending: false }),
}))

vi.mock('@kizunu/web/components/composed/plugin-select', () => ({
  PluginSelect: ({ value, onChange }: { value: string; onChange: (next: string) => void }) => (
    <select aria-label="Plugin" value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">Choose</option>
      {plugins.map((plugin) => (
        <option key={plugin.id} value={plugin.id}>
          {plugin.name}
        </option>
      ))}
    </select>
  ),
}))

function selectPlugin(id: string) {
  fireEvent.change(screen.getByLabelText('Plugin'), { target: { value: id } })
}

describe('ChannelAccountForm', () => {
  beforeEach(() => {
    createChannelAccount.mockClear()
  })

  it('clears entered credentials when the selected plugin changes', () => {
    render(<ChannelAccountForm workspaceId="ws-1" />)

    selectPlugin('meta-whatsapp')
    fireEvent.change(screen.getByLabelText('WABA ID'), { target: { value: 'waba-9' } })
    selectPlugin('other')
    selectPlugin('meta-whatsapp')

    expect(screen.getByLabelText('WABA ID')).toHaveValue('')
  })

  it('submits credentials as an object keyed by each field', () => {
    render(<ChannelAccountForm workspaceId="ws-1" />)

    selectPlugin('meta-whatsapp')
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Primary WA' } })
    fireEvent.change(screen.getByLabelText('WABA ID'), { target: { value: 'waba-9' } })
    fireEvent.change(screen.getByLabelText('Phone number ID'), { target: { value: 'phone-9' } })
    fireEvent.change(screen.getByLabelText('System token'), { target: { value: 'token-9' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add channel account' }))

    expect(createChannelAccount).toHaveBeenCalledWith({
      pluginId: 'meta-whatsapp',
      name: 'Primary WA',
      credentials: { wabaId: 'waba-9', phoneNumberId: 'phone-9', systemToken: 'token-9' },
    })
  })
})

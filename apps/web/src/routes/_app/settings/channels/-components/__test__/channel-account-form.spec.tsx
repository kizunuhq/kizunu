import { ChannelAccountForm } from '@kizunu/web/routes/_app/settings/channels/-components/channel-account-form'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vite-plus/test'

const plugins = [
  {
    id: 'meta-whatsapp',
    name: 'WhatsApp (Meta Cloud API)',
    capabilities: ['freeform'],
    connect: { kind: 'credentials' as const },
    credentialFields: [
      { key: 'appId', label: 'Meta App ID', type: 'text', required: true },
      { key: 'appSecret', label: 'Meta App Secret', type: 'secret', required: true },
      { key: 'wabaId', label: 'WABA ID', type: 'text', required: true },
      { key: 'phoneNumberId', label: 'Phone number ID', type: 'text', required: true },
      { key: 'systemToken', label: 'System token', type: 'secret', required: true },
    ],
  },
  {
    id: 'meta-whatsapp-coex',
    name: 'WhatsApp (Coex / Embedded Signup)',
    capabilities: ['freeform'],
    connect: { kind: 'oauth' as const, provider: 'meta-coex' as const },
    credentialFields: [],
  },
  {
    id: 'other',
    name: 'Other channel',
    capabilities: ['freeform'],
    connect: { kind: 'credentials' as const },
    credentialFields: [{ key: 'apiKey', label: 'API key', type: 'secret', required: true }],
  },
]

vi.mock('@kizunu/api-client/channel/use-channel-plugins', () => ({
  useChannelPlugins: () => ({ data: { plugins } }),
}))

vi.mock('@kizunu/api-client/channel/use-connect-meta-coex', () => ({
  useConnectMetaCoex: () => ({ connectMetaCoex: vi.fn(), isPending: false }),
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

const FORM_ID = 'test-channel-account-form'
const WORKSPACE_ID = 'ws-1'

function selectPlugin(id: string) {
  fireEvent.change(screen.getByLabelText('Plugin'), { target: { value: id } })
}

function submitForm() {
  const form = document.getElementById(FORM_ID)
  if (!(form instanceof HTMLFormElement)) throw new Error('form not found')
  fireEvent.submit(form)
}

describe('ChannelAccountForm', () => {
  it('renders ChannelAccountFormBody and calls onPluginKindChange with credentials for a credentials plugin', async () => {
    const onPluginKindChange = vi.fn()
    render(
      <ChannelAccountForm
        formId={FORM_ID}
        workspaceId={WORKSPACE_ID}
        isPending={false}
        onSubmit={() => {}}
        onPluginKindChange={onPluginKindChange}
      />,
    )

    selectPlugin('meta-whatsapp')

    await waitFor(() => {
      expect(screen.getByLabelText('WABA ID')).toBeInTheDocument()
    })
    expect(onPluginKindChange).toHaveBeenCalledWith('credentials')
  })

  it('renders ConnectMetaCoexPanel and calls onPluginKindChange with oauth for an oauth plugin', async () => {
    const onPluginKindChange = vi.fn()
    render(
      <ChannelAccountForm
        formId={FORM_ID}
        workspaceId={WORKSPACE_ID}
        isPending={false}
        onSubmit={() => {}}
        onPluginKindChange={onPluginKindChange}
      />,
    )

    selectPlugin('meta-whatsapp-coex')

    await waitFor(() => {
      expect(screen.getByText(/not configured for this deployment/i)).toBeInTheDocument()
    })
    expect(onPluginKindChange).toHaveBeenCalledWith('oauth')
  })

  it('resets credentials form state when switching from one credentials plugin to another', async () => {
    render(
      <ChannelAccountForm
        formId={FORM_ID}
        workspaceId={WORKSPACE_ID}
        isPending={false}
        onSubmit={() => {}}
      />,
    )

    selectPlugin('meta-whatsapp')
    fireEvent.change(screen.getByLabelText('WABA ID'), { target: { value: 'waba-9' } })
    selectPlugin('other')
    selectPlugin('meta-whatsapp')

    await waitFor(() => {
      expect(screen.getByLabelText('WABA ID')).toHaveValue('')
    })
  })

  it('clears entered credentials when the selected plugin changes', async () => {
    render(
      <ChannelAccountForm
        formId={FORM_ID}
        workspaceId={WORKSPACE_ID}
        isPending={false}
        onSubmit={() => {}}
      />,
    )

    selectPlugin('meta-whatsapp')
    fireEvent.change(screen.getByLabelText('WABA ID'), { target: { value: 'waba-9' } })
    selectPlugin('other')
    selectPlugin('meta-whatsapp')

    await waitFor(() => {
      expect(screen.getByLabelText('WABA ID')).toHaveValue('')
    })
  })

  it('submits credentials as an object keyed by each field when every required field is filled', async () => {
    const onSubmit = vi.fn()
    render(
      <ChannelAccountForm
        formId={FORM_ID}
        workspaceId={WORKSPACE_ID}
        isPending={false}
        onSubmit={onSubmit}
      />,
    )

    selectPlugin('meta-whatsapp')
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Primary WA' } })
    fireEvent.change(screen.getByLabelText('Meta App ID'), { target: { value: 'app-9' } })
    fireEvent.change(screen.getByLabelText('Meta App Secret'), { target: { value: 'secret-9' } })
    fireEvent.change(screen.getByLabelText('WABA ID'), { target: { value: 'waba-9' } })
    fireEvent.change(screen.getByLabelText('Phone number ID'), { target: { value: 'phone-9' } })
    fireEvent.change(screen.getByLabelText('System token'), { target: { value: 'token-9' } })
    submitForm()

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        pluginId: 'meta-whatsapp',
        name: 'Primary WA',
        credentials: {
          appId: 'app-9',
          appSecret: 'secret-9',
          wabaId: 'waba-9',
          phoneNumberId: 'phone-9',
          systemToken: 'token-9',
        },
      })
    })
  })

  it('surfaces a per-field error when a required credential is missing', async () => {
    const onSubmit = vi.fn()
    render(
      <ChannelAccountForm
        formId={FORM_ID}
        workspaceId={WORKSPACE_ID}
        isPending={false}
        onSubmit={onSubmit}
      />,
    )

    selectPlugin('meta-whatsapp')
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Primary' } })
    fireEvent.change(screen.getByLabelText('Meta App ID'), { target: { value: 'app-9' } })
    submitForm()

    await waitFor(() => {
      expect(screen.getByLabelText('Meta App Secret')).toHaveAttribute('aria-invalid', 'true')
    })
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('renders the error message inside a FormError alert when error is set', () => {
    render(
      <ChannelAccountForm
        formId={FORM_ID}
        workspaceId={WORKSPACE_ID}
        isPending={false}
        onSubmit={() => {}}
        error="Something blew up"
      />,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('Something blew up')
  })
})

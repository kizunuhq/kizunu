import { ChannelAccountForm } from '@kizunu/web/routes/_app/settings/-components/channels/channel-account-form'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vite-plus/test'

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

function selectPlugin(id: string) {
  fireEvent.change(screen.getByLabelText('Plugin'), { target: { value: id } })
}

function submitForm() {
  const form = document.getElementById(FORM_ID)
  if (!(form instanceof HTMLFormElement)) throw new Error('form not found')
  fireEvent.submit(form)
}

describe('ChannelAccountForm', () => {
  it('clears entered credentials when the selected plugin changes', async () => {
    render(<ChannelAccountForm formId={FORM_ID} isPending={false} onSubmit={() => {}} />)

    selectPlugin('meta-whatsapp')
    fireEvent.change(screen.getByLabelText('WABA ID'), { target: { value: 'waba-9' } })
    selectPlugin('other')
    selectPlugin('meta-whatsapp')

    await waitFor(() => {
      expect(screen.getByLabelText('WABA ID')).toHaveValue('')
    })
  })

  it('submits credentials as an object keyed by each field', async () => {
    const onSubmit = vi.fn()
    render(<ChannelAccountForm formId={FORM_ID} isPending={false} onSubmit={onSubmit} />)

    selectPlugin('meta-whatsapp')
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Primary WA' } })
    fireEvent.change(screen.getByLabelText('WABA ID'), { target: { value: 'waba-9' } })
    fireEvent.change(screen.getByLabelText('Phone number ID'), { target: { value: 'phone-9' } })
    fireEvent.change(screen.getByLabelText('System token'), { target: { value: 'token-9' } })
    submitForm()

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        pluginId: 'meta-whatsapp',
        name: 'Primary WA',
        credentials: { wabaId: 'waba-9', phoneNumberId: 'phone-9', systemToken: 'token-9' },
      })
    })
  })

  it('does not submit when required credentials are missing, surfacing a field-level error', async () => {
    const onSubmit = vi.fn()
    render(<ChannelAccountForm formId={FORM_ID} isPending={false} onSubmit={onSubmit} />)

    selectPlugin('meta-whatsapp')
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Primary' } })
    submitForm()

    await waitFor(() => {
      expect(screen.getByText('Fill every required credential field.')).toBeInTheDocument()
    })
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('renders the error message inside a FormError alert when error is set', () => {
    render(
      <ChannelAccountForm
        formId={FORM_ID}
        isPending={false}
        onSubmit={() => {}}
        error="Something blew up"
      />,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('Something blew up')
  })
})
